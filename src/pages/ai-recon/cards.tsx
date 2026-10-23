import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  CardV2,
  CardV2Padding,
  CardV2Variant,
  FOUNDATION_THEME,
  InputSizeV2,
  SingleSelectV2,
  SingleSelectV2Size,
  TextInputV2,
} from '@juspay/blend-design-system'
import { ArrowRight, Check, FileText, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'
import type { Card, FileContext } from './assistant'
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
  labelOf,
  type ParseOptions,
  type Table,
} from './table'

const { colors } = FOUNDATION_THEME
const BODY = font(FOUNDATION_THEME.font.size.body.md)
const SMALL = font(FOUNDATION_THEME.font.size.body.sm)
/** Selects span their cell, so the fields of a card line up down its left edge. */
const FULL_WIDTH = { width: '100%' }

type StepCardData = Extract<Card, { type: 'step' }>
type ParseCardData = Extract<Card, { type: 'parse' }>

const options = (values: { value: string; label: string }[]) => [{ items: values }]

/** A value as the preview shows it: blanks named, and edge spaces made visible by quoting. */
const shown = (value: string) =>
  value === '' ? '(blank)' : value !== value.trim() ? `“${value}”` : value

/** What a card turns into once it is done with: one line saying what happened. */
function Settled({ applied, children }: { applied: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="flex pt-0.5" style={{ color: applied ? colors.green[600] : colors.gray[400] }}>
        {applied ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
      </span>
      <PrimitiveText {...SMALL} color={applied ? colors.gray[700] : colors.gray[400]}>
        {children}
      </PrimitiveText>
    </div>
  )
}

function Actions({
  canApply,
  onApply,
  onCancel,
}: {
  canApply: boolean
  onApply: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end gap-2 [&_button]:cursor-pointer">
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
  )
}

/** Before → after for a few values, so the change is seen before it is made. */
function Preview({ table, op }: { table?: Table; op: Operation }) {
  const result = table && preview(table, op)
  if (!result) return null
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2"
      style={{
        backgroundColor: colors.gray[50],
        borderRadius: FOUNDATION_THEME.border.radius[8],
      }}
    >
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
    </div>
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
  const [fileId, setFileId] = useState(card.fileId ?? files[0]?.id ?? '')
  const [op, setOp] = useState<Operation>(card.op)
  const file = files.find((candidate) => candidate.id === fileId)
  const spec = SPECS[op.kind]

  if (card.state !== 'open') {
    return (
      <Settled applied={card.state === 'applied'}>
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
    <CardV2 variant={CardV2Variant.OUTLINED} padding={CardV2Padding.COMPACT}>
      <div className="flex flex-col gap-3">
        <PrimitiveText
          {...BODY}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {spec.label}
        </PrimitiveText>

        {/* The file is only a question when there are two to choose from. */}
        {files.length > 1 && (
          <SingleSelectV2
            label="File"
            placeholder="Choose a file"
            size={SingleSelectV2Size.SM}
            triggerDimensions={FULL_WIDTH}
            items={options(files.map((each) => ({ value: each.id, label: `${each.role === 'source' ? 'Source' : 'Target'} · ${each.name}` })))}
            selected={fileId}
            onSelect={(next) => {
              setFileId(next)
              // A column picked in one file means nothing in the other.
              setOp((current) => {
                const nextColumns = files.find((each) => each.id === next)?.columns ?? []
                const keep = (value?: string) =>
                  value === ALL_COLUMNS || (value && nextColumns.includes(value)) ? value : undefined
                return { ...current, column: keep(current.column), second: keep(current.second) }
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

        <Actions
          canApply={complete}
          onApply={() => onApply(card.id, fileId, op)}
          onCancel={() => onCancel(card.id)}
        />
      </div>
    </CardV2>
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
  const name = file?.name ?? 'This file'

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
          <span className="flex shrink-0 [&_button]:cursor-pointer">
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
      <Settled applied={card.state === 'applied'}>
        {name}: {settingsLine(card.options)}
      </Settled>
    )
  }

  const set = <K extends keyof ParseOptions>(key: K, value: ParseOptions[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))
  const lines = (value: string) => Math.max(0, Math.floor(Number(value) || 0))

  return (
    <CardV2 variant={CardV2Variant.OUTLINED} padding={CardV2Padding.COMPACT}>
      <div className="flex flex-col gap-3">
        <PrimitiveText
          {...BODY}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          How {name} is read
        </PrimitiveText>
        <div className="grid grid-cols-2 gap-3">
          <SingleSelectV2
            label="Delimiter"
            placeholder="Delimiter"
            size={SingleSelectV2Size.SM}
            triggerDimensions={FULL_WIDTH}
            items={options(DELIMITERS)}
            selected={draft.delimiter}
            onSelect={(next) => set('delimiter', next as ParseOptions['delimiter'])}
          />
          <SingleSelectV2
            label="Encoding"
            placeholder="Encoding"
            size={SingleSelectV2Size.SM}
            triggerDimensions={FULL_WIDTH}
            items={options(ENCODINGS)}
            selected={draft.encoding}
            onSelect={(next) => set('encoding', next as ParseOptions['encoding'])}
          />
          <SingleSelectV2
            label="Quotes"
            placeholder="Quotes"
            size={SingleSelectV2Size.SM}
            triggerDimensions={FULL_WIDTH}
            items={options(QUOTES.map((quote) => ({ ...quote, value: quote.value || 'none' })))}
            selected={draft.quote || 'none'}
            onSelect={(next) => set('quote', (next === 'none' ? '' : next) as ParseOptions['quote'])}
          />
          <div />
          <TextInputV2
            label="Skip lines at the top"
            size={InputSizeV2.SM}
            type="number"
            min={0}
            value={String(draft.skipTop)}
            onChange={(event) => set('skipTop', lines(event.target.value))}
          />
          <TextInputV2
            label="Skip lines at the bottom"
            size={InputSizeV2.SM}
            type="number"
            min={0}
            value={String(draft.skipBottom)}
            onChange={(event) => set('skipBottom', lines(event.target.value))}
          />
        </div>
        {file && (
          <div
            className="px-3 py-2"
            style={{ backgroundColor: colors.gray[50], borderRadius: FOUNDATION_THEME.border.radius[8] }}
          >
            <PrimitiveText {...SMALL} color={colors.gray[600]}>
              Reads as {shapeWith(file.id, draft)}
            </PrimitiveText>
          </div>
        )}
        <Actions
          canApply={Boolean(file)}
          onApply={() => file && onApply(card.id, file.id, draft)}
          onCancel={() => onCancel(card.id)}
        />
      </div>
    </CardV2>
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
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 [&_button]:cursor-pointer">
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
