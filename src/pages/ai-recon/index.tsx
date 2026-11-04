import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  StatCardV2,
  StatCardV2Variant,
  ThemeProvider,
  UploadErrorReason,
  UploadV2,
  type UploadFileV2,
} from '@juspay/blend-design-system'
import { FileUp } from 'lucide-react'
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { PrimitiveText, font } from '../../primitives'
import { compactStatCardToneTokens } from '../../theme'
import ChatPanel from './ChatPanel'
import FileTable from './FileTable'
import {
  GREETING,
  MAX_FILES,
  NO_KEY,
  REPLY_MS,
  ROLES,
  RUN_MS,
  announce,
  baseMessage,
  diagnosisNote,
  interpret,
  messageId,
  reproposeMessage,
  suggestionsFor,
  uploadPrompt,
  type Card,
  type ChatMessage,
  type FileContext,
  type Intent,
  type RecommendationItem,
} from './assistant'
import { BaseCard, MenuCard, ParseCard, RecommendCard, StepCard } from './cards'
import { DEMO_STEPS, isDemoKey, type DemoControls } from './demo'
import { BUCKET_TITLE, diagnose, findKeys, keepPrincipal, reconcile, type Bucket, type ReconOutcome } from './match'
import { chooseBase, recommend, type BaseChoice } from './recommend'
import ResultRows from './ResultRows'
import { applyAll, describe, isComplete, type Operation, type OperationKind } from './operations'
import {
  ACCEPTED_TYPES,
  LIMITS_TEXT,
  MAX_FILE_BYTES,
  detect,
  formatCount,
  readTable,
  shapeOf,
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

const RESULT_CARDS: { key: 'matched' | Bucket; title: string }[] = [
  { key: 'matched', title: 'Matched' },
  ...(Object.keys(BUCKET_TITLE) as Bucket[]).map((key) => ({ key, title: BUCKET_TITLE[key] })),
]

const countIn = (outcome: ReconOutcome, key: 'matched' | Bucket) =>
  key === 'matched' ? outcome.matched : outcome[key].length

/** Enter and Space press a card the way they press a button. */
const pressOnKey = (press: () => void) => (event: KeyboardEvent<HTMLDivElement>) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    press()
  }
}

/** The compact card's content height (theme.ts): a 20px label, 6px, a 32px line of figure. */
const SKELETON_HEIGHT = '58px'

/** One uploaded file's raw bytes, how they are read, and the steps run over the result. */
type FileWork = { bytes: ArrayBuffer; parse: ParseOptions; steps: Operation[] }

type Applied = { fileId: string; cardId: string; op: Operation }

/** Everything on the page, as the walkthrough keeps it before each step to take that step back. */
type Snapshot = {
  uploads: UploadFileV2[]
  work: Record<string, FileWork>
  messages: ChatMessage[]
  result?: ReconOutcome
  opened?: Bucket
  isCleaned: boolean
  history: Applied[]
}

const EMPTY: Snapshot = { uploads: [], work: {}, messages: [GREETING], isCleaned: false, history: [] }

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
 * A table with steps not applied yet run over it — what a card sees when steps offered
 * beside it are still open. Kept against the table, by the steps, since a card re-renders
 * with every field it changes.
 */
const pending = new WeakMap<Table, Map<string, Table>>()
function withPending(table: Table, steps: Operation[]) {
  if (steps.length === 0) return table
  let bySteps = pending.get(table)
  if (!bySteps) pending.set(table, (bySteps = new Map()))
  const key = JSON.stringify(steps)
  let result = bySteps.get(key)
  if (!result) bySteps.set(key, (result = applyAll(table, steps)))
  return result
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
  const [result, setResult] = useState<ReconOutcome>()
  /** The result card whose rows are open under the cards, if any. */
  const [opened, setOpened] = useState<Bucket>()
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [isReplying, setIsReplying] = useState(false)
  /** Said "looks good" — the suggestions move on from cleanup to running. */
  const [isCleaned, setIsCleaned] = useState(false)
  /** Applied steps, newest last, for "undo". The op object itself identifies the step. */
  const history = useRef<Applied[]>([])

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

  /** Change every card in the conversation that `matches`, leaving untouched messages as they are. */
  const updateCards = (matches: (card: Card) => boolean, patch: Partial<Card>) =>
    setMessages((current) =>
      current.map((message) =>
        message.cards?.some(matches)
          ? { ...message, cards: message.cards.map((card) => (matches(card) ? ({ ...card, ...patch } as Card) : card)) }
          : message,
      ),
    )
  const updateCard = (cardId: string, patch: Partial<Card>) => updateCards((card) => card.id === cardId, patch)

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

  // Source and target as they will be matched, in role order.
  const [sourceId, targetId] = files.map((file) => file.id)
  const sourceTable = sourceId ? tables[sourceId] : undefined
  const targetTable = targetId ? tables[targetId] : undefined

  /** A result belongs to the tables it was run on. */
  const clearResult = () => {
    setResult(undefined)
    setOpened(undefined)
  }

  /** Anything that changes a file's table makes an earlier result stale. */
  const editWork = (fileId: string, change: (file: FileWork) => FileWork) => {
    setWork((current) => (current[fileId] ? { ...current, [fileId]: change(current[fileId]) } : current))
    clearResult()
  }

  /**
   * The box and the paperclip both land here. New files are read straight away — the table
   * appears as soon as the bytes are in — and the assistant asks what to clean up.
   */
  const changeFiles = (next: UploadFileV2[]) => {
    setUploads(next)
    clearResult()
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

      const contexts = nextValid.map(contextOf)
      say(
        uploadPrompt(
          contexts.filter((file) => read[file.id]).map((file) => ({ name: file.name, parse: read[file.id].parse })),
          nextValid.length,
        ),
        loaded.map(([id]) =>
          parseCard(id, read[id].parse, 'summary', contexts.find((file) => file.id === id)?.name),
        ),
      )

      // With both in, the next question is which one is the user's own record.
      const pair = contexts.flatMap((file) => {
        const each = read[file.id] ?? work[file.id]
        return each ? [{ id: file.id, name: file.name, table: finishedTable(each) }] : []
      })
      if (pair.length === MAX_FILES) proposeBase(pair[0], pair[1], 'choose')
    })
  }

  /** Put the base first, so it takes the source role. Rejected files stay at the end. */
  const withBaseFirst = (list: UploadFileV2[], baseId: string) => {
    const valid = validOf(list)
    return [
      ...valid.filter((upload) => keyOf(upload) === baseId),
      ...valid.filter((upload) => keyOf(upload) !== baseId),
      ...list.filter((upload) => !upload.isValid),
    ]
  }

  /** Earlier base and recommendation cards fold away when a newer set is posted. */
  const supersedeOpenProposals = () =>
    updateCards(
      (card) => (card.type === 'base' || card.type === 'recommend') && card.state === 'open',
      { state: 'superseded' },
    )

  type PairFile = { id: string; name: string; table: Table }

  /**
   * Post which file is the base, and the steps that would make the other line up with it.
   * `choose` decides from the files (on upload); `swap` makes the second file the base; `keep`
   * leaves the order alone and only proposes steps again.
   */
  const proposeBase = (first: PairFile, second: PairFile, mode: 'choose' | 'swap' | 'keep') => {
    const choice: BaseChoice | undefined = mode === 'choose' ? chooseBase(first.table, second.table) : undefined
    const [base, other] = mode === 'swap' || choice?.base === 1 ? [second, first] : [first, second]
    const key = choice ? choice.key : findKeys(base.table, other.table, true)?.sourceKey

    setUploads((current) => withBaseFirst(current, base.id))
    supersedeOpenProposals()

    const items: RecommendationItem[] = recommend(base.table, other.table, other.name).map((item) => {
      const file = item.side === 'base' ? base : other
      return { ...item, id: messageId(), fileId: file.id, fileName: file.name }
    })
    const title = items.every((item) => item.side === 'target') ? `Recommended for ${other.name}` : 'Recommended steps'
    const text = choice
      ? baseMessage(choice, base.name, other.name, items.length)
      : reproposeMessage(mode === 'swap', base.name, other.name, items.length)
    say(text, [
      { id: messageId(), type: 'base', name: base.name, rows: base.table.rows.length, key, state: 'open' },
      ...(items.length > 0 ? [{ id: messageId(), type: 'recommend' as const, title, items, state: 'open' as const }] : []),
    ])
  }

  /** The current pair in role order, with their tables as they stand. */
  const currentPair = () => files.map((file) => ({ id: file.id, name: file.name, table: tables[file.id] }))

  const swapBase = () => {
    const [first, second] = currentPair()
    if (!first || !second) return say('I need both files before there’s a base to swap.')
    clearResult()
    setIsCleaned(false)
    proposeBase(first, second, 'swap')
  }

  /** Apply the ticked recommendations, then say what the run will pair on. */
  const applyRecommended = (cardId: string, items: RecommendationItem[]) => {
    const byFile = new Map<string, Operation[]>()
    for (const item of items) byFile.set(item.fileId, [...(byFile.get(item.fileId) ?? []), item.op])
    // The same objects go into state, so the tables worked out below are the ones drawn.
    const changed: Record<string, FileWork> = {}
    byFile.forEach((ops, fileId) => {
      if (!work[fileId]) return
      changed[fileId] = { ...work[fileId], steps: [...work[fileId].steps, ...ops] }
      // No card to cancel on undo: the recommendation card stands for all of them.
      ops.forEach((op) => history.current.push({ fileId, cardId: '', op }))
    })
    setWork((current) => ({ ...current, ...changed }))
    clearResult()
    updateCard(cardId, { state: 'applied', applied: items.length })
    setIsCleaned(true)

    const [source, target] = files.map((file) => finishedTable(changed[file.id] ?? work[file.id]))
    const outcome = source && target ? reconcile(source, target) : undefined
    say(
      outcome && target
        ? `Done. ${files[1].name} now has ${shapeOf(target)}. I’ll match ${outcome.sourceKey} with ` +
            `${outcome.targetKey}${outcome.sourceAmount ? ` and compare ${outcome.sourceAmount} with ${outcome.targetAmount}` : ''}` +
            ' — run the recon when you’re ready.'
        : 'Done. Run the recon when you’re ready.',
    )
  }

  /** Hand the ticked recommendations over as ordinary step cards, to change before applying. */
  const reviewRecommended = (cardId: string, items: RecommendationItem[]) => {
    updateCard(cardId, { state: 'reviewed' })
    say(
      'Here they are one at a time — change anything, then apply each.',
      items.map((item) => stepCardOf(item.op, item.fileId)),
    )
  }

  /**
   * Match the tables as they stand. When nothing pairs the rows, say why — and if a step
   * would fix it, hand that step over as a card rather than describing it.
   */
  const run = () => {
    if (!sourceTable || !targetTable) return
    setIsRunning(true)
    clearResult()
    later(() => {
      setIsRunning(false)
      const outcome = reconcile(sourceTable, targetTable)
      if (outcome) {
        setResult(outcome)
        return say(announce(outcome))
      }
      const diagnosis = diagnose(sourceTable, targetTable)
      if (!diagnosis) return say(NO_KEY)
      const fileId = files.find((file) => file.role === diagnosis.role)?.id
      say(diagnosisNote(diagnosis), [stepCardOf(keepPrincipal(diagnosis), fileId)])
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

  const nameOf = (fileId: string) => uploaded.find((file) => file.id === fileId)?.name ?? ''
  const parseCard = (
    fileId: string,
    options: ParseOptions,
    state: 'summary' | 'open',
    name = nameOf(fileId),
  ): Card => ({ id: messageId(), type: 'parse', fileId, name, options, state })
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
        // Asked while a run is under way: that run's result is the answer.
        if (isRunning) return
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
      case 'swap':
        return swapBase()
      case 'recommend': {
        const [first, second] = currentPair()
        if (!first || !second) return say('Add both files first — then I can say what to clean up.')
        return proposeBase(first, second, 'keep')
      }
    }
  }

  // A reply lands after a pause, and answers from the page as it is then — a step applied or a
  // run started meanwhile counts — so the timer calls this render's `respond`, not the one
  // the message was sent from.
  const latestRespond = useRef(respond)
  useEffect(() => {
    latestRespond.current = respond
  })

  const handleSend = (text: string) => {
    say(text, undefined, 'user')
    const intent = interpret(text, files, result)
    // A run shows its own progress — the button and the cards — so it starts without the
    // typing pause.
    if (intent.type === 'run') return respond(intent)
    setIsReplying(true)
    later(() => {
      setIsReplying(false)
      latestRespond.current(intent)
    }, REPLY_MS)
  }

  /**
   * Replacing one file once the box has gone: a picker of our own, aimed at that file. The
   * new file keeps the old one's place — and so its role — and is read like any upload.
   */
  const replaceInput = useRef<HTMLInputElement>(null)
  const replacing = useRef<string>(undefined)
  const pickReplacement = (fileId: string) => {
    replacing.current = fileId
    replaceInput.current?.click()
  }
  const handleReplacement = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Cleared, so choosing the same file again still fires a change.
    event.target.value = ''
    if (!file || !replacing.current) return
    if (!isAccepted(file)) return say(`I left out ${file.name} — files need to be ${LIMITS_TEXT}.`)
    const id = replacing.current
    changeFiles(uploads.map((upload) => (keyOf(upload) === id ? asUpload(file) : upload)))
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

  /**
   * The walkthrough (demo.ts). → takes the next step through the page's own handlers; ←
   * puts back the page as it was before the last one. One snapshot per step taken, so the
   * stack's length is how far in the walkthrough is.
   */
  const demo = useRef<Snapshot[]>([])
  const demoBusy = useRef(false)

  const restore = (state: Snapshot) => {
    // A reply or run still on its way belongs to the step being taken back.
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current.clear()
    setIsReplying(false)
    setIsRunning(false)
    setUploads(state.uploads)
    setWork(state.work)
    setMessages(state.messages)
    setResult(state.result)
    setOpened(state.opened)
    setIsCleaned(state.isCleaned)
    history.current = [...state.history]
  }

  const onDemoKey = useEffectEvent(async (event: WindowEventMap['keydown']) => {
    if (!isDemoKey(event)) return
    event.preventDefault()
    if (demoBusy.current) return
    if (event.key === 'ArrowLeft') {
      const before = demo.current.pop()
      if (before) restore(before)
      return
    }
    const step = DEMO_STEPS[demo.current.length]
    if (!step) return
    const before: Snapshot = { uploads, work, messages, result, opened, isCleaned, history: [...history.current] }
    const controls: DemoControls = {
      messages,
      files,
      canRun,
      reset: () => restore(EMPTY),
      upload: (picked) => changeFiles(picked.map(asUpload)),
      openReason: (cardId, itemId) => updateCard(cardId, { reasons: [itemId] }),
      applyRecommended,
      send: handleSend,
      applyStep,
      run,
    }
    demoBusy.current = true
    try {
      if (await step(controls)) demo.current.push(before)
    } finally {
      demoBusy.current = false
    }
  })
  useEffect(() => {
    const listener = (event: WindowEventMap['keydown']) => void onDemoKey(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const renderCard = (card: Card) => {
    switch (card.type) {
      case 'step': {
        // Steps offered together preview in order: each sees its file as the open ones above
        // it would leave it, so the second isn't judged on rows the first would take out.
        const batch = messages.find((message) => message.cards?.some((other) => other.id === card.id))?.cards ?? []
        const above = batch.slice(0, batch.findIndex((other) => other.id === card.id))
        const openAbove = (id: string) =>
          above.flatMap((other) => (other.type === 'step' && other.state === 'open' && other.fileId === id ? [other.op] : []))
        return (
          <StepCard
            card={card}
            files={files}
            tableFor={(id) => tables[id] && withPending(tables[id], openAbove(id))}
            onApply={applyStep}
            onCancel={cancelCard}
          />
        )
      }
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
      case 'base':
        return <BaseCard card={card} onSwap={swapBase} />
      case 'recommend':
        return (
          <RecommendCard
            card={card}
            onApply={applyRecommended}
            onReview={reviewRecommended}
            onReasons={(cardId, reasons) => updateCard(cardId, { reasons })}
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

          {/* One box for both files, until both are in — then the tables say which files
              these are, and each one's Replace changes it. Removing one brings the box back.
              While it shows, Blend swaps the header for its own "Files successfully added"
              once a file is in; the slot icon shows only while it is empty
              (UploadContainerV2.tsx:85-89, :229). */}
          {uploaded.length < MAX_FILES && (
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
          )}
          {/* No visible UI of its own: Replace opens it. */}
          <input
            ref={replaceInput}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            hidden
            onChange={handleReplacement}
          />

          {/* Nothing until there is something: skeleton cards while it runs, numbers after.
              The skeleton's own default is 106px tall (StatCardV2Skeleton.tsx:18); this is
              the filled card's content height, so the row does not jump when numbers land. */}
          {(isRunning || result) && (
            // One row of four wherever four fit; a phone takes them two by two. The compact
            // size (theme.ts) puts the figure at heading/lg — a summary above the tables, not
            // the page's headline.
            <ThemeProvider componentTokens={compactStatCardToneTokens.neutral}>
              <section aria-label="Results" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {RESULT_CARDS.map(({ key, title }) => {
                  const value = result && countIn(result, key)
                  // Matched, and a card at nought, have no rows to open.
                  const opens = key !== 'matched' && Boolean(value)
                  const pressed = opened === key
                  // From the current state, not this render's `pressed`, so a handler a render
                  // old still toggles the right way.
                  const toggle = () =>
                    setOpened((current) => (current === key ? undefined : (key as Bucket)))
                  const card = (
                    <StatCardV2
                      key={key}
                      variant={StatCardV2Variant.NUMBER}
                      title={title}
                      value={value === undefined ? undefined : formatCount(value)}
                      // Blend's 200px floor is wider than a quarter of the workspace, so the
                      // cards overran their columns and ate the gap between them.
                      minWidth="0"
                      maxWidth="none"
                      skeleton={{ variant: 'pulse', show: isRunning, height: SKELETON_HEIGHT }}
                      // As on Alerts: StatCardV2 spreads these after its own `role="region"`,
                      // so a card with rows behind it becomes a toggle button.
                      {...(opens && {
                        role: 'button',
                        tabIndex: 0,
                        'aria-pressed': pressed,
                        onClick: toggle,
                        onKeyDown: pressOnKey(toggle),
                      })}
                    />
                  )
                  if (!opens) return card
                  // The pressed state, drawn on a wrapper we own — StatCardV2 has no selected
                  // state and takes no className or style. The same ring and hover as Alerts.
                  return (
                    <div
                      key={key}
                      className="grid hover:outline-1 hover:outline-[color:var(--stat-card-hover)]"
                      style={
                        {
                          '--stat-card-hover': colors.gray[300],
                          borderRadius: FOUNDATION_THEME.border.radius[12],
                          outlineOffset: '-1px',
                          ...(pressed && { outline: `2px solid ${colors.primary[500]}` }),
                        } as CSSProperties
                      }
                    >
                      {card}
                    </div>
                  )
                })}
              </section>
            </ThemeProvider>
          )}

          {result && opened && sourceTable && targetTable && (
            <ResultRows bucket={opened} outcome={result} source={sourceTable} target={targetTable} />
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
                  onReplace={() => pickReplacement(id)}
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
