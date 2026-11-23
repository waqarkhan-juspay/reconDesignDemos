import {
  AccordionV2,
  AccordionV2Item,
  AccordionV2Type,
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  CardV2,
  CheckboxV2,
  CardV2Padding,
  CardV2Variant,
  FOUNDATION_THEME,
  InputSizeV2,
  SelectorV2Size,
  SingleSelectV2,
  SingleSelectV2Size,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
  TextInputV2,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { Anchor, ArrowDown, ArrowLeftRight, ArrowRight, Check, FileText, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'
import { RECOMMEND_STEP, recommendAccordionTokens } from '../../theme'
import { ROLE_LABEL, type Card, type FileContext } from './assistant'
import {
  ALL_COLUMNS,
  GROUPS,
  SPECS,
  describe,
  isComplete,
  preview,
  type Operation,
  type OperationKind,
} from './operations'
import {
  DELIMITERS,
  ENCODINGS,
  QUOTES,
  count,
  labelOf,
  type ParseOptions,
  type Table,
} from './table'

const { colors } = FOUNDATION_THEME
const BODY = font(FOUNDATION_THEME.font.size.body.md)
const SMALL = font(FOUNDATION_THEME.font.size.body.sm)
/** Selects span their cell, so the fields of a card line up down its left edge. */
const FULL_WIDTH = { width: '100%' }

/**
 * A recommended step laid out by its accordion trigger (RECOMMEND_STEP, theme.ts): the reason
 * and tags under it are inset by the trigger's side padding, and the checkbox centres in the
 * height of a one-line trigger so it sits on the name's first line.
 */
const STEP_INSET = RECOMMEND_STEP.padX
const STEP_ROW = `calc(${RECOMMEND_STEP.padY} * 2 + ${RECOMMEND_STEP.line}px)`
const STEP_VARS = { '--accordion-line': `${RECOMMEND_STEP.line}px` } as CSSProperties

type StepCardData = Extract<Card, { type: 'step' }>
type ParseCardData = Extract<Card, { type: 'parse' }>

const options = (values: { value: string; label: string }[]) => [{ items: values }]

/** A value as the preview shows it: blanks named, and edge spaces made visible by quoting. */
const shown = (value: string) =>
  value === '' ? '(blank)' : value !== value.trim() ? `“${value}”` : value

/** How a card that is done with looks, by what happened to it. */
const SETTLED = {
  applied: { Icon: Check, icon: colors.green[600], text: colors.gray[700] },
  dropped: { Icon: X, icon: colors.gray[400], text: colors.gray[400] },
  /** Moved on to something below it. */
  moved: { Icon: ArrowDown, icon: colors.gray[500], text: colors.gray[600] },
}

/** What a card turns into once it is done with: one line saying what happened. */
function Settled({ outcome, children }: { outcome: keyof typeof SETTLED; children: ReactNode }) {
  const { Icon, icon, text } = SETTLED[outcome]
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="flex pt-0.5" style={{ color: icon }}>
        <Icon size={14} aria-hidden />
      </span>
      <PrimitiveText {...SMALL} color={text}>
        {children}
      </PrimitiveText>
    </div>
  )
}

/** A form card's settled line: applied, or cancelled. */
const settledAs = (state: string) => (state === 'applied' ? 'applied' : 'dropped')

/** The shell the form cards share: a bold title, the fields, then Cancel and Apply. */
function FormCard({
  title,
  canApply,
  onApply,
  onCancel,
  children,
}: {
  title: string
  canApply: boolean
  onApply: () => void
  onCancel: () => void
  children: ReactNode
}) {
  return (
    <CardV2 variant={CardV2Variant.OUTLINED} padding={CardV2Padding.COMPACT}>
      <div className="flex flex-col gap-3">
        <PrimitiveText
          {...BODY}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {title}
        </PrimitiveText>
        {children}
        <div className="flex justify-end gap-2">
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            text="Cancel"
            onClick={onCancel}
          />
          <ButtonV2
            buttonType={ButtonV2Type.PRIMARY}
            size={ButtonV2Size.SMALL}
            text="Apply"
            disabled={!canApply}
            onClick={onApply}
          />
        </div>
      </div>
    </CardV2>
  )
}

/** The grey box a card shows its outcome in — a step's preview, or a file's new shape. */
function NoteBox({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2"
      style={{ backgroundColor: colors.gray[50], borderRadius: FOUNDATION_THEME.border.radius[8] }}
    >
      {children}
    </div>
  )
}

/** Before → after for a few values, so the change is seen before it is made. */
function Preview({ table, op }: { table?: Table; op: Operation }) {
  // Memoised: the card re-renders as its fields change, and a preview reads the file.
  const result = useMemo(() => table && preview(table, op), [table, op])
  if (!result) return null
  return (
    <NoteBox>
      {result.kind === 'note' ? (
        <PrimitiveText {...SMALL} color={colors.gray[600]}>
          {result.text}
        </PrimitiveText>
      ) : (
        result.pairs.map(([before, after], index) => (
          <div key={index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <span className="min-w-0 truncate">
              <PrimitiveText {...SMALL} color={colors.gray[500]}>
                {shown(before)}
              </PrimitiveText>
            </span>
            <span className="flex" style={{ color: colors.gray[400] }}>
              <ArrowRight size={12} aria-hidden />
            </span>
            <span className="min-w-0 truncate">
              <PrimitiveText {...SMALL} color={colors.gray[900]}>
                {shown(after)}
              </PrimitiveText>
            </span>
          </div>
        ))
      )}
    </NoteBox>
  )
}

type StepCardProps = {
  card: StepCardData
  files: FileContext[]
  tableFor: (fileId: string) => Table | undefined
  onApply: (cardId: string, fileId: string, op: Operation) => void
  onCancel: (cardId: string) => void
}

/**
 * One cleanup step, as the assistant understood it: every field it could fill from the
 * sentence is filled, the rest wait to be picked, and a preview shows what the file will
 * look like before anything changes. Apply adds it to the file's steps on the left.
 */
export function StepCard({ card, files, tableFor, onApply, onCancel }: StepCardProps) {
  const [picked, setFileId] = useState(card.fileId ?? files[0]?.id ?? '')
  const [op, setOp] = useState<Operation>(card.op)
  // A pick that has since been replaced falls back to the first file there is.
  const fileId = files.some((candidate) => candidate.id === picked) ? picked : (files[0]?.id ?? '')
  const file = files.find((candidate) => candidate.id === fileId)
  const spec = SPECS[op.kind]

  // A step offered for one file means nothing once that file is replaced.
  if (card.state === 'open' && card.fileId && !files.some((candidate) => candidate.id === card.fileId)) {
    return <Settled outcome="dropped">{spec.label} · its file was replaced</Settled>
  }

  if (card.state !== 'open') {
    return (
      <Settled outcome={settledAs(card.state)}>
        {describe(card.op)}
        {file && files.length > 1 ? ` · ${file.role}` : ''}
      </Settled>
    )
  }

  const columns = file?.columns ?? []
  const table = file ? tableFor(file.id) : undefined
  const complete = Boolean(file) && isComplete(op, columns)
  const set = (key: keyof Operation, value: string) => setOp((current) => ({ ...current, [key]: value }))

  return (
    <FormCard
      title={spec.label}
      canApply={complete}
      onApply={() => onApply(card.id, fileId, op)}
      onCancel={() => onCancel(card.id)}
    >
      {/* The file is only a question when there are two to choose from. */}
      {files.length > 1 && (
        <SingleSelectV2
          label="File"
          placeholder="Choose a file"
          size={SingleSelectV2Size.SM}
          triggerDimensions={FULL_WIDTH}
          items={options(
            files.map((each) => ({ value: each.id, label: `${ROLE_LABEL[each.role]} · ${each.name}` })),
          )}
          selected={fileId}
          onSelect={(next) => {
            setFileId(next)
            // A column picked in one file means nothing in the other.
            setOp((current) => {
              const nextColumns = files.find((each) => each.id === next)?.columns ?? []
              const keep = (value?: string) =>
                value === ALL_COLUMNS || (value && nextColumns.includes(value)) ? value : undefined
              return {
                ...current,
                column: keep(current.column),
                second: keep(current.second),
                other: keep(current.other),
              }
            })
          }}
        />
      )}

      {spec.fields.map((field) => {
        const value = op[field.key] ?? ''
        if (field.type === 'column' || field.type === 'choice') {
          const items =
            field.type === 'choice'
              ? field.options.map((choice) => ({ value: choice, label: choice }))
              : [
                  ...(field.allowAll ? [{ value: ALL_COLUMNS, label: 'Every column' }] : []),
                  ...columns.map((column) => ({ value: column, label: column })),
                ]
          return (
            <SingleSelectV2
              key={field.key}
              label={field.label}
              placeholder={field.type === 'column' ? 'Choose a column' : 'Choose one'}
              size={SingleSelectV2Size.SM}
              triggerDimensions={FULL_WIDTH}
              items={options(items)}
              selected={value}
              onSelect={(next) => set(field.key, next)}
            />
          )
        }
        return (
          <TextInputV2
            key={field.key}
            label={field.label}
            placeholder={field.type === 'text' ? field.placeholder : undefined}
            size={InputSizeV2.SM}
            type={field.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(event) => set(field.key, event.target.value)}
          />
        )
      })}

      {complete && <Preview table={table} op={op} />}
    </FormCard>
  )
}

type ParseCardProps = {
  card: ParseCardData
  file?: FileContext
  shapeWith: (fileId: string, options: ParseOptions) => string
  onOpen: (cardId: string) => void
  onApply: (cardId: string, fileId: string, options: ParseOptions) => void
  onCancel: (cardId: string) => void
}

/** The read settings a card offers, as data — the select fields, then the line skips. */
const PARSE_SELECTS = [
  { key: 'delimiter', label: 'Delimiter', choices: DELIMITERS },
  { key: 'encoding', label: 'Encoding', choices: ENCODINGS },
  { key: 'quote', label: 'Quotes', choices: QUOTES },
] as const
const PARSE_SKIPS = [
  { key: 'skipTop', label: 'Skip lines at the top' },
  { key: 'skipBottom', label: 'Skip lines at the bottom' },
] as const

/** A select can't hold an empty value, so "no quote character" travels as `none`. */
const asItem = (value: string) => value || 'none'
const fromItem = (value: string) => (value === 'none' ? '' : value)

const settingsLine = ({ delimiter, encoding, skipTop, skipBottom }: ParseOptions) =>
  [
    labelOf(DELIMITERS, delimiter),
    labelOf(ENCODINGS, encoding),
    ...(skipTop ? [`skip ${skipTop} at the top`] : []),
    ...(skipBottom ? [`skip ${skipBottom} at the bottom`] : []),
  ].join(' · ')

/**
 * How a file is read. On upload it is one line — what was detected and the shape that came
 * out — since it is usually right; Adjust opens it into the settings, which preview the new
 * shape as they change.
 */
export function ParseCard({ card, file, shapeWith, onOpen, onApply, onCancel }: ParseCardProps) {
  const [draft, setDraft] = useState<ParseOptions>(card.options)
  const name = card.name

  if (!file) return <Settled outcome="dropped">{name} was replaced</Settled>

  if (card.state === 'summary') {
    return (
      <div
        className="flex items-center gap-2 py-1.5 pr-1.5 pl-3"
        style={{
          border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
          borderRadius: FOUNDATION_THEME.border.radius[8],
          backgroundColor: colors.gray[0],
        }}
      >
        <span className="flex shrink-0" style={{ color: colors.gray[400] }}>
          <FileText size={14} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <PrimitiveText {...SMALL} color={colors.gray[700]}>
            {name} · {settingsLine(card.options)} · {file ? shapeWith(file.id, card.options) : ''}
          </PrimitiveText>
        </span>
        {file && (
          <span className="flex shrink-0">
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.SMALL}
              text="Adjust"
              onClick={() => onOpen(card.id)}
            />
          </span>
        )}
      </div>
    )
  }

  if (card.state !== 'open') {
    return (
      <Settled outcome={settledAs(card.state)}>
        {name}: {settingsLine(card.options)}
      </Settled>
    )
  }

  const set = (key: keyof ParseOptions, value: string | number) =>
    setDraft((current) => ({ ...current, [key]: value }) as ParseOptions)
  const lines = (value: string) => Math.max(0, Math.floor(Number(value) || 0))

  return (
    <FormCard
      title={`How ${name} is read`}
      canApply={Boolean(file)}
      onApply={() => file && onApply(card.id, file.id, draft)}
      onCancel={() => onCancel(card.id)}
    >
      <div className="grid grid-cols-2 gap-3">
        {PARSE_SELECTS.map(({ key, label, choices }) => (
          <SingleSelectV2
            key={key}
            label={label}
            placeholder={label}
            size={SingleSelectV2Size.SM}
            triggerDimensions={FULL_WIDTH}
            items={options(choices.map((choice) => ({ ...choice, value: asItem(choice.value) })))}
            selected={asItem(draft[key])}
            onSelect={(next) => set(key, fromItem(next))}
          />
        ))}
        <div />
        {PARSE_SKIPS.map(({ key, label }) => (
          <TextInputV2
            key={key}
            label={label}
            size={InputSizeV2.SM}
            type="number"
            min={0}
            value={String(draft[key])}
            onChange={(event) => set(key, lines(event.target.value))}
          />
        ))}
      </div>
      {file && (
        <NoteBox>
          <PrimitiveText {...SMALL} color={colors.gray[600]}>
            Reads as {shapeWith(file.id, draft)}
          </PrimitiveText>
        </NoteBox>
      )}
    </FormCard>
  )
}

/**
 * Everything the assistant can do to a file, grouped as the steps are — the fallback when
 * a sentence didn't name one, and the answer to "what else can you do?".
 */
export function MenuCard({
  onPick,
  onParse,
}: {
  onPick: (kind: OperationKind) => void
  onParse: () => void
}) {
  const kinds = Object.keys(SPECS) as OperationKind[]
  const row = (label: string, buttons: ReactNode) => (
    <div key={label} className="contents">
      {/* pt-1.5 sets the label on the first row of buttons' text line, not their top edge. */}
      <span className="pt-1.5">
        <PrimitiveText {...SMALL} color={colors.gray[500]}>
          {label}
        </PrimitiveText>
      </span>
      <div className="flex flex-wrap gap-1.5">{buttons}</div>
    </div>
  )
  return (
    <CardV2 variant={CardV2Variant.OUTLINED} padding={CardV2Padding.COMPACT}>
      {/* Label beside its buttons rather than over them: half the height for the same list. */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">
        {GROUPS.map((group) =>
          row(
            group,
            kinds
              .filter((kind) => SPECS[kind].group === group)
              .map((kind) => (
                <ButtonV2
                  key={kind}
                  buttonType={ButtonV2Type.SECONDARY}
                  size={ButtonV2Size.SMALL}
                  text={SPECS[kind].label}
                  onClick={() => onPick(kind)}
                />
              )),
          ),
        )}
        {row(
          'File',
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            text="How it’s read"
            onClick={onParse}
          />,
        )}
      </div>
    </CardV2>
  )
}

type BaseCardData = Extract<Card, { type: 'base' }>
type RecommendCardData = Extract<Card, { type: 'recommend' }>

/**
 * Which file is the base — one line, with Swap for when the assistant guessed wrong. The
 * reasons are in the message above it; the card is the state, and the way to change it.
 */
export function BaseCard({ card, onSwap }: { card: BaseCardData; onSwap: (cardId: string) => void }) {
  if (card.state === 'superseded') return <Settled outcome="moved">Base updated below</Settled>
  return (
    <div
      className="flex items-center gap-2 py-1.5 pr-1.5 pl-3"
      style={{
        border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
        borderRadius: FOUNDATION_THEME.border.radius[8],
        backgroundColor: colors.gray[0],
      }}
    >
      <span className="flex shrink-0" style={{ color: colors.primary[600] }}>
        <Anchor size={14} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <PrimitiveText {...SMALL} color={colors.gray[700]}>
          Base · {card.name} · {count(card.rows, 'row')}{card.key ? ` · key ${card.key}` : ''}
        </PrimitiveText>
      </span>
      <span className="flex shrink-0">
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Swap"
          leftSlot={{ slot: <ArrowLeftRight size={14} aria-hidden /> }}
          onClick={() => onSwap(card.id)}
        />
      </span>
    </div>
  )
}

type RecommendCardProps = {
  card: RecommendCardData
  onApply: (cardId: string, items: RecommendCardData['items']) => void
  onReview: (cardId: string, items: RecommendCardData['items']) => void
  onReasons: (cardId: string, reasons: string[]) => void
}

/**
 * The steps the assistant would take, each with what it would do, ticked where it is sure;
 * a step's name opens to the evidence for it. Apply runs the ticked ones in the order shown;
 * Review hands them over one at a time as ordinary step cards, to change before applying.
 */
export function RecommendCard({ card, onApply, onReview, onReasons }: RecommendCardProps) {
  const [ticked, setTicked] = useState(
    () => new Set(card.items.filter((item) => item.confidence === 'high').map((item) => item.id)),
  )

  if (card.state !== 'open') {
    const line = {
      applied: `Applied ${count(card.applied ?? 0, 'recommended step')}`,
      reviewed: 'Opened as separate steps below',
      superseded: 'Replaced by newer recommendations',
    }[card.state]
    return <Settled outcome={card.state === 'applied' ? 'applied' : 'moved'}>{line}</Settled>
  }

  const chosen = card.items.filter((item) => ticked.has(item.id))
  const reasons = card.reasons ?? []
  const showReason = (id: string, show: boolean) =>
    onReasons(card.id, show ? [...reasons, id] : reasons.filter((other) => other !== id))
  const toggle = (id: string) =>
    setTicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <CardV2 variant={CardV2Variant.OUTLINED} padding={CardV2Padding.COMPACT}>
      <div className="flex flex-col gap-3">
        <PrimitiveText
          {...BODY}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {card.title}
        </PrimitiveText>
        <ThemeProvider componentTokens={recommendAccordionTokens}>
          <div className="accordion-wrapping flex flex-col gap-2" style={STEP_VARS}>
            {card.items.map((item) => (
              // The checkbox says whether the step runs; the name beside it opens the reason.
              // Each name is its own accordion, since AccordionV2 clones its children as items
              // and leaves no room for a checkbox between them.
              <div key={item.id} className="flex items-start gap-0.5">
                <span className="flex shrink-0 items-center" style={{ height: STEP_ROW }}>
                  <CheckboxV2
                    size={SelectorV2Size.SM}
                    aria-label={describe(item.op)}
                    checked={ticked.has(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* Controlled from the first render — AccordionV2 decides that once, at mount. */}
                  <AccordionV2
                    accordionType={AccordionV2Type.NO_BORDER}
                    value={reasons.includes(item.id) ? item.id : ''}
                    onValueChange={(value) => showReason(item.id, value === item.id)}
                  >
                    <AccordionV2Item value={item.id} title={describe(item.op)}>
                      <div style={{ padding: `0 ${STEP_INSET} ${RECOMMEND_STEP.padY}` }}>
                        <PrimitiveText {...SMALL} color={colors.gray[600]}>
                          {item.side === 'base' ? `${item.reason} (${item.fileName})` : item.reason}
                        </PrimitiveText>
                      </div>
                    </AccordionV2Item>
                  </AccordionV2>
                  {/* What the step does stays in view, closed or open, on the name's keyline. */}
                  <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: STEP_INSET }}>
                    <TagV2
                      text={item.effect}
                      size={TagV2Size.XS}
                      type={TagV2Type.SUBTLE}
                      color={TagV2Color.NEUTRAL}
                    />
                    {item.confidence === 'low' && (
                      <TagV2 text="Optional" size={TagV2Size.XS} type={TagV2Type.SUBTLE} color={TagV2Color.WARNING} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ThemeProvider>
        {/* Each button keeps its one line; a narrow chat stacks them instead. */}
        <div className="flex flex-wrap justify-end gap-2 [&>*]:shrink-0">
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            text="Review one by one"
            disabled={chosen.length === 0}
            onClick={() => onReview(card.id, chosen)}
          />
          <ButtonV2
            buttonType={ButtonV2Type.PRIMARY}
            size={ButtonV2Size.SMALL}
            text={`Apply ${chosen.length} selected`}
            disabled={chosen.length === 0}
            onClick={() => onApply(card.id, chosen)}
          />
        </div>
      </div>
    </CardV2>
  )
}
