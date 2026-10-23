import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  StatCardV2,
  StatCardV2Variant,
  UploadErrorReason,
  UploadV2,
  type UploadFileV2,
} from '@juspay/blend-design-system'
import { FileUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { PrimitiveText, font } from '../../primitives'
import ChatPanel from './ChatPanel'
import FileTable from './FileTable'
import {
  DEMO_RESULT,
  GREETING,
  MAX_FILES,
  REPLY_MS,
  ROLES,
  RUN_MS,
  announce,
  interpret,
  messageId,
  suggestionsFor,
  uploadPrompt,
  type Card,
  type ChatMessage,
  type FileContext,
  type Intent,
  type ReconResult,
} from './assistant'
import { MenuCard, ParseCard, StepCard } from './cards'
import { applyAll, describe, isComplete, type Operation, type OperationKind } from './operations'
import {
  ACCEPTED_TYPES,
  LIMITS_TEXT,
  MAX_FILE_BYTES,
  detect,
  formatCount,
  readTable,
  shapeWith,
  type ParseOptions,
  type Table,
} from './table'

const { colors } = FOUNDATION_THEME

/**
 * The hairline between workspace and chat: on top of the chat when the two stack, on its
 * left once they sit side by side. A custom property so Tailwind can switch which edge
 * carries it while the width and colour still come from tokens (rule 1).
 */
const SPLIT_LINE = {
  '--split-line': `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
} as CSSProperties

const keyOf = (upload: UploadFileV2) => upload.id ?? `${upload.file.name}-${upload.file.size}`

const validOf = (uploads: UploadFileV2[]) => uploads.filter((upload) => upload.isValid)

/** An upload as the page names it: its key, and its role from the order it arrived in. */
const contextOf = (upload: UploadFileV2, index: number) => ({
  id: keyOf(upload),
  role: ROLES[index],
  name: upload.file.name,
})

/**
 * The line under the box when a file is turned away, by why. Blend prints `errorText`
 * whether or not anything is wrong (UploadV2.tsx:282), so there is none otherwise.
 */
function rejectionText(files: UploadFileV2[]) {
  const reason = files.find((upload) => !upload.isValid)?.errorReason
  if (!reason) return undefined
  if (reason === UploadErrorReason.MAX_FILES) return 'Two files: a source and a target'
  return LIMITS_TEXT
}

const isAccepted = (file: File) =>
  ACCEPTED_TYPES.some((type) => file.name.toLowerCase().endsWith(type)) && file.size <= MAX_FILE_BYTES

const asUpload = (file: File): UploadFileV2 => ({ id: messageId(), file, isValid: true })

const RESULT_CARDS: { key: keyof ReconResult; title: string }[] = [
  { key: 'matched', title: 'Matched' },
  { key: 'amountMismatch', title: 'Amount Mismatch' },
  { key: 'missingInTarget', title: 'Missing in Target' },
  { key: 'missingInSource', title: 'Missing in Source' },
]

const SKELETON_HEIGHT = '64px'

/** One uploaded file's raw bytes, how they are read, and the steps run over the result. */
type FileWork = { bytes: ArrayBuffer; parse: ParseOptions; steps: Operation[] }

/**
 * Each file's table with its steps run, kept against the file's own work object. Editing
 * one file replaces only that file's object, so the other's table is not rebuilt. Parsing
 * is cached under the table (table.ts), so a new step re-runs the steps alone.
 */
const finished = new WeakMap<FileWork, Table>()
function finishedTable(file: FileWork) {
  let table = finished.get(file)
  if (!table) finished.set(file, (table = applyAll(readTable(file.bytes, file.parse), file.steps)))
  return table
}

/**
 * Reconciliation > AI Recon: a one-off match of two files, with an assistant beside it.
 *
 * A 70/30 split. On the left, the files as they will be matched — each one a table the
 * moment it lands, source above target. On the right, the assistant, which asks what to
 * clean up as each file is read and answers a request in words with a filled-in card: the
 * sentence picks the step, the card shows what it will do, Apply puts it on the file.
 *
 * Below `lg` the 30% column would be too narrow to hold a conversation, so the two stack and
 * the chat takes a fixed height under the workspace.
 */
function AiRecon() {
  const [uploads, setUploads] = useState<UploadFileV2[]>([])
  const [work, setWork] = useState<Record<string, FileWork>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ReconResult>()
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [isReplying, setIsReplying] = useState(false)
  /** Said "looks good" — the suggestions move on from cleanup to running. */
  const [isCleaned, setIsCleaned] = useState(false)
  /** Applied steps, newest last, for "undo". The op object itself identifies the step. */
  const history = useRef<{ fileId: string; cardId: string; op: Operation }[]>([])

  // Every pending reply or run, so leaving the page cancels them rather than setting state
  // on an unmounted tree.
  const timers = useRef(new Set<number>())
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  const later = (callback: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      callback()
    }, ms)
    timers.current.add(id)
  }

  const say = (text: string, cards?: Card[], role: ChatMessage['role'] = 'assistant') =>
    setMessages((current) => [...current, { id: messageId(), role, text, cards }])

  const updateCard = (cardId: string, patch: Partial<Card>) =>
    setMessages((current) =>
      current.map((message) =>
        message.cards?.some((card) => card.id === cardId)
          ? {
              ...message,
              cards: message.cards.map((card) =>
                card.id === cardId ? ({ ...card, ...patch } as Card) : card,
              ),
            }
          : message,
      ),
    )

  const tables = useMemo(
    () =>
      Object.fromEntries(Object.entries(work).map(([id, file]) => [id, finishedTable(file)])) as Record<
        string,
        Table
      >,
    [work],
  )

  const uploaded = validOf(uploads).map(contextOf)
  // Only files that have been read — a column list is what the assistant works from.
  const files: FileContext[] = uploaded
    .filter((file) => tables[file.id])
    .map((file) => ({ ...file, columns: tables[file.id].columns, sample: tables[file.id].rows.slice(0, 20) }))
  const canRun = files.length === MAX_FILES && !isRunning

  /** Anything that changes a file's table makes an earlier result stale. */
  const editWork = (fileId: string, change: (file: FileWork) => FileWork) => {
    setWork((current) => (current[fileId] ? { ...current, [fileId]: change(current[fileId]) } : current))
    setResult(undefined)
  }

  /**
   * The box and the paperclip both land here. New files are read straight away — the table
   * appears as soon as the bytes are in — and the assistant asks what to clean up.
   */
  const changeFiles = (next: UploadFileV2[]) => {
    setUploads(next)
    setResult(undefined)
    setIsCleaned(false)

    const nextValid = validOf(next)
    const keep = new Set(nextValid.map(keyOf))
    setWork((current) => Object.fromEntries(Object.entries(current).filter(([id]) => keep.has(id))))

    const incoming = nextValid.filter((upload) => !work[keyOf(upload)])
    if (incoming.length === 0) return
    void Promise.all(
      incoming.map(async (upload) => [keyOf(upload), await upload.file.arrayBuffer()] as const),
    ).then((loaded) => {
      const read = Object.fromEntries(
        loaded.map(([id, bytes]) => [id, { bytes, parse: detect(bytes), steps: [] }]),
      ) as Record<string, FileWork>
      setWork((current) => ({ ...current, ...read }))

      say(
        uploadPrompt(
          nextValid
            .map(contextOf)
            .filter((file) => read[file.id])
            .map((file) => ({ ...file, parse: read[file.id].parse })),
          nextValid.length,
        ),
        loaded.map(([id]) => parseCard(id, read[id].parse, 'summary')),
      )
    })
  }

  const run = () => {
    setIsRunning(true)
    setResult(undefined)
    later(() => {
      setIsRunning(false)
      setResult(DEMO_RESULT)
      say(announce(DEMO_RESULT))
    }, RUN_MS)
  }

  const applyStep = (cardId: string, fileId: string, op: Operation) => {
    editWork(fileId, (file) => ({ ...file, steps: [...file.steps, op] }))
    history.current.push({ fileId, cardId, op })
    updateCard(cardId, { state: 'applied', fileId, op })
  }

  const applyParse = (cardId: string, fileId: string, options: ParseOptions) => {
    editWork(fileId, (file) => ({ ...file, parse: options }))
    updateCard(cardId, { state: 'applied', options })
  }

  const removeStep = (fileId: string, index: number) =>
    editWork(fileId, (file) => ({ ...file, steps: file.steps.filter((_, at) => at !== index) }))

  const undo = () => {
    while (history.current.length > 0) {
      const last = history.current.pop()!
      if (!work[last.fileId]?.steps.includes(last.op)) continue
      editWork(last.fileId, (file) => ({ ...file, steps: file.steps.filter((step) => step !== last.op) }))
      updateCard(last.cardId, { state: 'cancelled' })
      say(`Undone: ${describe(last.op)}.`)
      return
    }
    say('Nothing to undo yet.')
  }

  const parseCard = (fileId: string, options: ParseOptions, state: 'summary' | 'open'): Card => ({
    id: messageId(),
    type: 'parse',
    fileId,
    options,
    state,
  })
  const stepCardOf = (op: Operation, fileId?: string): Card => ({
    id: messageId(),
    type: 'step',
    fileId,
    op,
    state: 'open',
  })
  const cancelCard = (cardId: string) => updateCard(cardId, { state: 'cancelled' })

  /** Each file's read settings as a one-line card, for "which file did you mean?". */
  const parseSummaries = () => files.map((file) => parseCard(file.id, work[file.id].parse, 'summary'))

  const stepCard = (op: Operation, fileId?: string) => {
    const columns = files.find((file) => file.id === (fileId ?? files[0]?.id))?.columns ?? []
    const ready = Boolean(fileId ?? files.length === 1) && isComplete(op, columns)
    say(
      ready ? 'Here’s that change. Check it, then apply.' : 'I’ve filled in what I could — pick the rest, then apply.',
      [stepCardOf(op, fileId)],
    )
  }

  // The card is titled with the step, so the line above it says what to do, not what it is.
  const pick = (kind: OperationKind, fileId?: string) =>
    say('Pick the details, then apply.', [stepCardOf({ kind }, fileId)])

  const respond = (intent: Intent) => {
    switch (intent.type) {
      case 'reply':
        return say(intent.text)
      case 'done':
        setIsCleaned(true)
        return say(
          files.length === MAX_FILES
            ? 'Great — run the recon when you’re ready.'
            : 'Add the other file when you’re ready.',
        )
      case 'undo':
        return undo()
      case 'run':
        if (canRun) return run()
        return say('I need both files before I can match them.')
      case 'menu':
        return say('Here’s what I can do to a file — pick one.', [
          { id: messageId(), type: 'menu', fileId: intent.fileId },
        ])
      case 'parse': {
        const fileId = intent.fileId ?? (files.length === 1 ? files[0].id : undefined)
        if (!fileId) return say('Which file? Adjust the one you mean.', parseSummaries())
        const changed = Object.keys(intent.patch).length > 0
        return say(
          changed
            ? 'Here’s that change — check the shape it reads as, then apply.'
            : 'Here’s how it’s read now. Change what’s off, then apply.',
          [parseCard(fileId, { ...work[fileId].parse, ...intent.patch }, 'open')],
        )
      }
      case 'step':
        return stepCard(intent.op, intent.fileId)
    }
  }

  const handleSend = (text: string) => {
    say(text, undefined, 'user')
    setIsReplying(true)
    const intent = interpret(text, files, result)
    later(() => {
      setIsReplying(false)
      respond(intent)
    }, REPLY_MS)
  }

  /**
   * The paperclip adds to the same box, up to its two files, so there is one set of files
   * however they arrived. ChatInputV2's own picker filter is fixed by Blend and lets PDFs
   * and images through, hence the check here.
   */
  const handleAttach = (attached: File[]) => {
    const rejected = attached.filter((file) => !isAccepted(file))
    const accepted = attached.filter(isAccepted)
    const room = Math.max(0, MAX_FILES - uploads.length)
    const added = accepted.slice(0, room)
    const overflow = accepted.slice(room)

    const notes: string[] = []
    if (rejected.length > 0) {
      notes.push(
        `I left out ${rejected.map((file) => file.name).join(', ')} — files need to be ${LIMITS_TEXT}.`,
      )
    }
    if (overflow.length > 0) {
      notes.push(`I only need two files, so I left out ${overflow.map((file) => file.name).join(', ')}.`)
    }
    if (notes.length > 0) say(notes.join(' '))
    if (added.length > 0) changeFiles([...uploads, ...added.map(asUpload)])
  }

  const renderCard = (card: Card) => {
    switch (card.type) {
      case 'step':
        return (
          <StepCard
            card={card}
            files={files}
            tableFor={(id) => tables[id]}
            onApply={applyStep}
            onCancel={cancelCard}
          />
        )
      case 'parse':
        return (
          <ParseCard
            card={card}
            file={files.find((file) => file.id === card.fileId)}
            shapeWith={(id, options) => (work[id] ? shapeWith(work[id].bytes, options) : '')}
            onOpen={(cardId) => updateCard(cardId, { state: 'open', adjusting: true })}
            onApply={applyParse}
            // Backing out of Adjust leaves the settings as they were, so the one-line summary
            // comes back rather than a "cancelled" mark on a file that was read fine.
            onCancel={(cardId) =>
              card.adjusting ? updateCard(cardId, { state: 'summary', adjusting: false }) : cancelCard(cardId)
            }
          />
        )
      case 'menu':
        return (
          <MenuCard
            onPick={(kind) => pick(kind, card.fileId)}
            onParse={() =>
              card.fileId
                ? respond({ type: 'parse', fileId: card.fileId, patch: {} })
                : say('Here’s how I read each file.', parseSummaries())
            }
          />
        )
    }
  }

  return (
    // `min-h-0` only side by side: there the split must fit the content area exactly so each
    // column scrolls itself. Stacked, it grows with its content and the page scrolls.
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row" style={SPLIT_LINE}>
      {/* Workspace — 70%, read top to bottom: the files, what came back, the files as they
          will be matched. Scrolls on its own beside the chat, so a long page never drags
          the conversation out of view. */}
      <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-[7] lg:overflow-y-auto">
        <div className="flex flex-1 flex-col gap-5 px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <PrimitiveText
              as="h1"
              {...font(FOUNDATION_THEME.font.size.heading.lg)}
              color={colors.gray[900]}
              fontWeight={FOUNDATION_THEME.font.weight[600]}
            >
              AI Recon
            </PrimitiveText>
            <ButtonV2
              buttonType={ButtonV2Type.PRIMARY}
              size={ButtonV2Size.MEDIUM}
              text="Run recon"
              loading={isRunning}
              disabled={!canRun}
              onClick={run}
            />
          </div>

          {/* One box for both files. Once one is in, Blend swaps the header for its own
              "Files successfully added" and lists them as tags; the slot icon shows only
              while it is empty (UploadContainerV2.tsx:85-89, :229). */}
          <UploadV2
            label="Upload Files"
            uploadHeaderText="Upload your source and target files"
            acceptedFileTypes={ACCEPTED_TYPES}
            maxSize={MAX_FILE_BYTES}
            maxFiles={MAX_FILES}
            files={uploads}
            onChange={changeFiles}
            errorText={rejectionText(uploads)}
            slot={
              <span className="flex" style={{ color: colors.gray[400] }}>
                <FileUp size={24} aria-hidden />
              </span>
            }
          />

          {/* Nothing until there is something: skeleton cards while it runs, numbers after.
              The skeleton's own default is 106px tall (StatCardV2Skeleton.tsx:18); this is
              the filled card's content height, so the row does not jump when numbers land. */}
          {(isRunning || result) && (
            // One row of four wherever four fit; a phone takes them two by two.
            <section aria-label="Results" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {RESULT_CARDS.map(({ key, title }) => (
                <StatCardV2
                  key={key}
                  variant={StatCardV2Variant.NUMBER}
                  title={title}
                  value={result && formatCount(result[key])}
                  maxWidth="none"
                  skeleton={{ variant: 'pulse', show: isRunning, height: SKELETON_HEIGHT }}
                />
              ))}
            </section>
          )}

          {/* Source above target, each the first few rows of the file as it will be matched. */}
          {uploaded.length > 0 && (
            <div className="flex flex-col gap-6">
              {uploaded.map(({ id, role, name }) => (
                <FileTable
                  key={id}
                  role={role}
                  name={name}
                  table={tables[id]}
                  steps={work[id]?.steps ?? []}
                  onRemoveStep={(at) => removeStep(id, at)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat — 30%. */}
      <aside
        aria-label="Recon Assistant"
        className="flex h-[600px] min-w-0 shrink-0 flex-col [border-top:var(--split-line)] lg:h-auto lg:flex-[3] lg:[border-top:none] lg:[border-left:var(--split-line)]"
        style={{ backgroundColor: colors.gray[25] }}
      >
        <ChatPanel
          messages={messages}
          isReplying={isReplying}
          suggestions={suggestionsFor(files, result, isCleaned)}
          onSend={handleSend}
          onAttach={handleAttach}
          renderCard={renderCard}
        />
      </aside>
    </div>
  )
}

export default AiRecon
