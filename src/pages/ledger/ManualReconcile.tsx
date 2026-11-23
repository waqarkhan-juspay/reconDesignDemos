import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2Color,
} from '@juspay/blend-design-system'
import { ArrowLeftRight, BookCheck, Check, Landmark, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { PrimitiveText } from '../../primitives'
import { signedAmount, type BankLine, type ComparisonRow } from './bank'
import { EntryTag } from './cells'
import type { LedgerEntry } from './data'
import { formatCurrency, formatDate } from './ledger'
import { CELL_META, CELL_TEXT, SLOT_ICON_SIZE } from './table'

const { colors } = FOUNDATION_THEME

/** A figure with its direction: money in is +, money out is −. */
const signedMoney = (amount: number) =>
  `${amount >= 0 ? '+' : '−'}${formatCurrency(Math.abs(amount))}`

/**
 * One side of a pair, as either list draws it. The bank line and the ledger entry carry
 * different words, but the question a person asks of both is the same: whose is it, when,
 * and how much.
 */
type Candidate = {
  id: string
  merchantId: string
  date: string
  text: string
  /** Signed. */
  amount: number
  /** Set when the row is shown but cannot be paired, and why. */
  disabledReason?: string
}

/**
 * Manual Reconciliation — the comparison's exceptions, split back into the two ledgers they
 * came from: the statement on the left, our ledger on the right.
 *
 * A row in the comparison is already a decision about what goes with what. Here nothing is
 * decided: a person picks one bank line and the entry it is the record of, and marks the
 * pair reconciled. One of each, because a bank line is the record of one entry.
 *
 * Both lists are the comparison's own unmatched rows, so the merchant, period and search the
 * toolbar sets narrow them exactly as they narrow the table on every other tab.
 */
export function ManualReconcile({
  rows,
  bankLines,
  entries,
  onReconcile,
}: {
  /** The comparison rows still needing a person, already narrowed by the toolbar. */
  rows: ComparisonRow[]
  bankLines: BankLine[]
  entries: LedgerEntry[]
  onReconcile: (bankLineId: string, entryId: string) => void
}) {
  const { bankSide, ledgerSide } = useMemo(() => {
    const lineById = new Map(bankLines.map((line) => [line.id, line]))
    const entryById = new Map(entries.map((entry) => [entry.id, entry]))

    const bank: Candidate[] = rows.flatMap((row) => {
      const line = row.bankRef ? lineById.get(row.bankRef) : undefined
      if (!line) return []
      return [
        {
          id: line.id,
          merchantId: line.merchantId,
          date: line.date,
          text: line.narration,
          amount: signedAmount(line),
        },
      ]
    })

    const ledger: Candidate[] = rows.flatMap((row) => {
      const entry = row.ledgerRef ? entryById.get(row.ledgerRef) : undefined
      if (!entry) return []
      // Only a completed entry has moved money, so only a completed entry has a line on a
      // statement to be paired with — the Reconciled Ledger's rule, for the same reason.
      const disabledReason =
        entry.status === 'IN_PROGRESS'
          ? 'In progress — nothing to pair with until it clears'
          : entry.status === 'FAILED'
            ? 'Failed — it will never reach the statement'
            : undefined
      return [
        {
          id: entry.id,
          merchantId: entry.merchantId,
          date: entry.date,
          text: entry.particulars,
          amount: signedAmount(entry),
          disabledReason,
        },
      ]
    })

    return { bankSide: bank, ledgerSide: ledger }
  }, [rows, bankLines, entries])

  const [bankId, setBankId] = useState<string | null>(null)
  const [entryId, setEntryId] = useState<string | null>(null)
  // A pick the toolbar has since filtered out is no pick: nothing you cannot see is acted on.
  const bank = bankSide.find((candidate) => candidate.id === bankId)
  const entry = ledgerSide.find(
    (candidate) => candidate.id === entryId && !candidate.disabledReason,
  )

  const verdict = judge(bank, entry)

  const reconcile = () => {
    if (!bank || !entry || verdict.blocked) return
    onReconcile(bank.id, entry.id)
    setBankId(null)
    setEntryId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <PairBar
        bank={bank}
        entry={entry}
        verdict={verdict}
        onClear={() => {
          setBankId(null)
          setEntryId(null)
        }}
        onReconcile={reconcile}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Pane
          title="Bank Ledger"
          Icon={Landmark}
          count={bankSide.length}
          empty="Every line on the statement is in the ledger."
        >
          {bankSide.map((candidate) => (
            <Option
              key={candidate.id}
              candidate={candidate}
              selected={candidate.id === bank?.id}
              sameAmountAs={entry}
              onToggle={() => setBankId(candidate.id === bank?.id ? null : candidate.id)}
            />
          ))}
        </Pane>

        <Pane
          title="Reconciled Ledger"
          Icon={BookCheck}
          count={ledgerSide.length}
          empty="Every entry is on the statement."
        >
          {ledgerSide.map((candidate) => (
            <Option
              key={candidate.id}
              candidate={candidate}
              selected={candidate.id === entry?.id}
              sameAmountAs={bank}
              onToggle={() => setEntryId(candidate.id === entry?.id ? null : candidate.id)}
            />
          ))}
        </Pane>
      </div>
    </div>
  )
}

type Verdict = { message: string; tone: 'quiet' | 'good' | 'warn' | 'bad'; blocked: boolean }

/**
 * Whether the two picks can be a pair, and what reconciling them would mean.
 *
 * Two things stop a pair outright: two merchants' money, and money in against money out —
 * neither is a difference anyone could accept, only a wrong pick. A difference in figure is
 * allowed, because that is what a person is here to decide (card FX, a bank charge netted
 * off), and the bar says so before they press the button rather than after.
 */
function judge(bank?: Candidate, entry?: Candidate): Verdict {
  if (!bank && !entry) {
    return {
      message: 'Pick a bank line on the left and the ledger entry it is the record of.',
      tone: 'quiet',
      blocked: true,
    }
  }
  if (!bank) return { message: 'Now pick the bank line it pairs with.', tone: 'quiet', blocked: true }
  if (!entry) {
    return { message: 'Now pick the ledger entry it pairs with.', tone: 'quiet', blocked: true }
  }
  if (bank.merchantId !== entry.merchantId) {
    return {
      message: `${bank.id} is ${bank.merchantId}’s and ${entry.id} is ${entry.merchantId}’s — a pair has to be one merchant’s.`,
      tone: 'bad',
      blocked: true,
    }
  }
  if (Math.sign(bank.amount) !== Math.sign(entry.amount)) {
    return {
      message: 'One is money in and the other money out — they cannot be the same payment.',
      tone: 'bad',
      blocked: true,
    }
  }
  const delta = Math.round((bank.amount - entry.amount) * 100) / 100
  if (delta === 0) return { message: 'Same figure on both sides.', tone: 'good', blocked: false }
  return {
    message: `The bank shows ${formatCurrency(Math.abs(delta))} ${
      Math.abs(bank.amount) > Math.abs(entry.amount) ? 'more' : 'less'
    }. Reconciling accepts the difference.`,
    tone: 'warn',
    blocked: false,
  }
}

const TONE_COLOR = {
  quiet: colors.gray[500],
  good: colors.green[700],
  warn: colors.orange[700],
  bad: colors.red[600],
} as const

/**
 * The pair as it stands, and the one button. Above the lists rather than under them, so the
 * button and what it will do are in view while the picks are being made.
 */
function PairBar({
  bank,
  entry,
  verdict,
  onClear,
  onReconcile,
}: {
  bank?: Candidate
  entry?: Candidate
  verdict: Verdict
  onClear: () => void
  onReconcile: () => void
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{ background: colors.gray[50], border: `1px solid ${colors.gray[200]}` }}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Pick candidate={bank} placeholder="Bank line" />
          <ArrowLeftRight size={SLOT_ICON_SIZE} color={colors.gray[400]} aria-hidden />
          <Pick candidate={entry} placeholder="Ledger entry" />
        </div>
        {/* Announced, because it is what changes as the picks do and the button's state
            alone does not say why it is off. */}
        <div aria-live="polite">
          <PrimitiveText {...CELL_META} color={TONE_COLOR[verdict.tone]}>
            {verdict.message}
          </PrimitiveText>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(bank || entry) && (
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            text="Clear"
            onClick={onClear}
          />
        )}
        <ButtonV2
          buttonType={ButtonV2Type.PRIMARY}
          size={ButtonV2Size.SMALL}
          text="Mark reconciled"
          leftSlot={{ slot: <Check size={14} /> }}
          disabled={verdict.blocked}
          onClick={onReconcile}
        />
      </div>
    </div>
  )
}

/** One half of the pair in the bar: the reference and its figure, or a dashed placeholder. */
function Pick({ candidate, placeholder }: { candidate?: Candidate; placeholder: string }) {
  if (!candidate) {
    return (
      <span
        className="rounded-lg px-2.5 py-1"
        style={{ border: `1px dashed ${colors.gray[300]}` }}
      >
        <PrimitiveText {...CELL_META} color={colors.gray[400]}>
          {placeholder}
        </PrimitiveText>
      </span>
    )
  }
  return (
    <span
      className="flex items-center gap-2 rounded-lg px-2.5 py-1"
      style={{ background: colors.gray[0], border: `1px solid ${colors.gray[200]}` }}
    >
      <PrimitiveText {...CELL_META} color={colors.gray[900]} fontWeight={FOUNDATION_THEME.font.weight[600]}>
        {candidate.id}
      </PrimitiveText>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        <PrimitiveText {...CELL_META} color={colors.gray[600]}>
          {signedMoney(candidate.amount)}
        </PrimitiveText>
      </span>
    </span>
  )
}

/** One ledger's list: a header that says whose words these are, then the rows. */
function Pane({
  title,
  Icon,
  count,
  empty,
  children,
}: {
  title: string
  Icon: LucideIcon
  count: number
  empty: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-col overflow-hidden rounded-xl"
      style={{ background: colors.gray[0], border: `1px solid ${colors.gray[200]}` }}
    >
      <header
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: `1px solid ${colors.gray[200]}`, background: colors.gray[25] }}
      >
        <Icon size={SLOT_ICON_SIZE} color={colors.primary[600]} aria-hidden />
        <PrimitiveText
          {...CELL_TEXT}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {`${title} · ${count}`}
        </PrimitiveText>
      </header>
      {count === 0 ? (
        <div className="px-4 py-8 text-center">
          <PrimitiveText {...CELL_META} color={colors.gray[500]}>
            {empty}
          </PrimitiveText>
        </div>
      ) : (
        <div
          className="flex flex-col divide-y divide-[var(--row-rule)]"
          style={{ '--row-rule': colors.gray[150] } as CSSProperties}
        >
          {children}
        </div>
      )}
    </section>
  )
}

/**
 * A row you pick. A toggle button rather than a radio: picking the selected row again lets it
 * go, which a radio cannot do, and `aria-pressed` says exactly that.
 */
function Option({
  candidate,
  selected,
  sameAmountAs,
  onToggle,
}: {
  candidate: Candidate
  selected: boolean
  /** The other side's pick, so a row with the same figure can say so. */
  sameAmountAs?: Candidate
  onToggle: () => void
}) {
  const disabled = candidate.disabledReason !== undefined
  const sameAmount =
    !disabled &&
    sameAmountAs !== undefined &&
    sameAmountAs.merchantId === candidate.merchantId &&
    Math.round((sameAmountAs.amount - candidate.amount) * 100) === 0

  const style = {
    '--option-hover': colors.gray[50],
    // A bar down the leading edge as well as the fill, so the pick does not rest on a pale
    // tint alone.
    background: selected ? colors.primary[50] : undefined,
    boxShadow: selected ? `inset 3px 0 0 ${colors.primary[600]}` : undefined,
    cursor: disabled ? 'not-allowed' : 'pointer',
  } as CSSProperties

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      // Why a greyed row cannot be picked, on hover.
      title={candidate.disabledReason}
      onClick={onToggle}
      className={`grid w-full grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left ${
        selected || disabled ? '' : 'hover:bg-[var(--option-hover)]'
      }`}
      style={style}
    >
      <SelectDot selected={selected} disabled={disabled} />

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <PrimitiveText
            {...CELL_TEXT}
            color={disabled ? colors.gray[500] : colors.gray[900]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {candidate.id}
          </PrimitiveText>
          <span aria-hidden>
            <PrimitiveText {...CELL_TEXT} color={colors.gray[400]}>
              ·
            </PrimitiveText>
          </span>
          {/* The merchant beside the reference, always — even scoped to one merchant — since
              a pair has to be one merchant's and this is where the eye checks it. */}
          <PrimitiveText {...CELL_TEXT} color={colors.gray[500]}>
            {candidate.merchantId}
          </PrimitiveText>
          {sameAmount && <EntryTag text="Same amount" color={TagV2Color.SUCCESS} />}
        </div>
        <PrimitiveText {...CELL_TEXT} color={disabled ? colors.gray[500] : colors.gray[700]}>
          {candidate.text}
        </PrimitiveText>
        {/* Not drawn, so the row stays two lines like the rest; the hover title above says
            the same thing to a pointer. */}
        {disabled && <span className="sr-only">{candidate.disabledReason}</span>}
      </div>

      {/* The date under the figure, as a statement sets a line's value date beside its
          amount: the two are what a person matches on, so they sit together at the edge
          where the other pane's figures line up opposite them. */}
      <span
        className="flex flex-col items-end gap-1 whitespace-nowrap"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <PrimitiveText
          {...CELL_TEXT}
          color={
            disabled ? colors.gray[500] : candidate.amount >= 0 ? colors.green[600] : colors.gray[900]
          }
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {signedMoney(candidate.amount)}
        </PrimitiveText>
        <PrimitiveText {...CELL_META} color={colors.gray[500]}>
          {formatDate(candidate.date)}
        </PrimitiveText>
      </span>
    </button>
  )
}

/** The pick mark: an empty ring, or a filled one with a tick. */
function SelectDot({ selected, disabled }: { selected: boolean; disabled: boolean }) {
  return (
    <span
      aria-hidden
      className="mt-0.5 flex size-4 items-center justify-center rounded-full"
      style={{
        border: `1.5px solid ${
          selected ? colors.primary[600] : disabled ? colors.gray[200] : colors.gray[300]
        }`,
        background: selected ? colors.primary[600] : disabled ? colors.gray[50] : colors.gray[0],
      }}
    >
      {selected && <Check size={10} strokeWidth={3} color={colors.gray[0]} />}
    </span>
  )
}
