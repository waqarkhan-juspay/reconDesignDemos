import { OPENING_BALANCE, type EntryDirection, type LedgerEntry } from './data'
import { ALL, summariseLedger } from './ledger'

/**
 * The bank's side of the Ledger page — the statement as the bank states it, and the
 * comparison between it and our ledger.
 *
 * The ledger (data.ts, ledger.ts) is unchanged: this sits beside it. A bank line names the
 * ledger entry it belongs to, and everything the comparison shows is derived from that one
 * link rather than stored twice, so the three views can never disagree.
 */

export type BankLine = {
  /** The bank's own reference, not ours. */
  id: string
  merchantId: string
  /** ISO timestamp. */
  date: string
  /** The bank's wording, which is not our particulars — that is the point of two ledgers. */
  narration: string
  amount: number
  type: EntryDirection
  /** The ledger entry this line is the bank's record of. Absent when the bank has it alone. */
  matchedEntryId?: string
  /**
   * Set when a person paired this line by hand, in Manual Reconciliation. Their pairing
   * stands even where the figures disagree — accepting a difference is the decision they made
   * — so a manual pair is MATCHED and its delta is still shown beside it.
   */
  manual?: boolean
}

/**
 * Seeded against INITIAL_ENTRIES so the three outcomes a reconciliation has are all present:
 *
 * - most lines match exactly;
 * - TXN-293847 is on the statement for a different figure (card FX on an AWS charge);
 * - TXN-110293 has no bank line at all — the wire is still in flight, which is why it is the
 *   ledger's one IN_PROGRESS entry;
 * - two lines are the bank's alone: a maintenance charge and a presented cheque, neither of
 *   which anyone posted;
 * - BNK-5515 is TXN-992012, but nothing links them: the bank's "IMPS DR VENDOR 88213" names
 *   neither our reference nor our particulars, so the pair is left for a person to make in
 *   Manual Reconciliation — same merchant, same figure, two days apart.
 */
export const BANK_LINES: BankLine[] = [
  { id: 'BNK-5501', merchantId: 'MERCH-003', date: '2026-08-22T13:10:00Z', narration: 'RTGS CR PARTNER SETTLE Q3', amount: 22000, type: 'CREDIT', matchedEntryId: 'TXN-773821' },
  { id: 'BNK-5509', merchantId: 'MERCH-001', date: '2026-09-15T08:00:00Z', narration: 'REFUND CUST A UPI', amount: 450, type: 'DEBIT', matchedEntryId: 'TXN-449302' },
  { id: 'BNK-5517', merchantId: 'MERCH-001', date: '2026-09-28T10:30:00Z', narration: 'CHQ 004412 PRESENTED', amount: 1350, type: 'DEBIT' },
  { id: 'BNK-5515', merchantId: 'MERCH-003', date: '2026-10-04T11:20:00Z', narration: 'IMPS DR VENDOR 88213', amount: 3500, type: 'DEBIT' },
  { id: 'BNK-5514', merchantId: 'MERCH-001', date: '2026-10-05T16:45:00Z', narration: 'STRIPE PAYOUTS PREFUND', amount: 5000, type: 'CREDIT', matchedEntryId: 'TXN-556102' },
  { id: 'BNK-5513', merchantId: 'MERCH-002', date: '2026-10-06T09:15:00Z', narration: 'AWS EMEA SARL CARD 4421', amount: 1218.5, type: 'DEBIT', matchedEntryId: 'TXN-293847' },
  { id: 'BNK-5516', merchantId: 'MERCH-002', date: '2026-10-06T10:00:00Z', narration: 'ACCOUNT MAINTENANCE CHARGE', amount: 85, type: 'DEBIT' },
  { id: 'BNK-5512', merchantId: 'MERCH-001', date: '2026-10-07T14:30:00Z', narration: 'NEFT CR INV001 ACME LTD', amount: 15000, type: 'CREDIT', matchedEntryId: 'TXN-847291' },
]

export type MatchState = 'MATCHED' | 'AMOUNT_DIFFERS' | 'BANK_ONLY' | 'LEDGER_ONLY'

export const MATCH_LABEL: Record<MatchState, string> = {
  MATCHED: 'Matched',
  AMOUNT_DIFFERS: 'Amount differs',
  BANK_ONLY: 'Bank only',
  LEDGER_ONLY: 'Ledger only',
}

export type BankRow = BankLine & {
  /** The bank balance straight after this line, in the current merchant view. */
  runningBalance: number
  /**
   * How this line stands against the ledger. Never LEDGER_ONLY — a line the ledger has alone
   * is by definition not on the statement, so it is not in this list at all.
   *
   * A claimed line whose figure disagrees is AMOUNT_DIFFERS, not MATCHED: calling it matched
   * because a reference lines up would be the page telling a reassuring lie about the one
   * line on the statement that needs a person.
   */
  match: Exclude<MatchState, 'LEDGER_ONLY'>
}

export type BankSummary = {
  openingBalance: number
  closingBalance: number
  credits: number
  debits: number
  /** Lines that are not a clean match — bank-only ones and the ones whose figure disagrees. */
  unmatchedCount: number
  rows: BankRow[]
}

const byDateAscending = (a: { date: string }, b: { date: string }) =>
  new Date(a.date).getTime() - new Date(b.date).getTime()

const inScope = (merchantId: string, merchant: string) =>
  merchant === ALL || merchantId === merchant

/** A debit is money out, so its signed value is negative on both sides. */
const signed = (amount: number, type: EntryDirection) => (type === 'CREDIT' ? amount : -amount)

/**
 * The bank statement, walked oldest-first so each line can carry the balance after it — the
 * same shape summariseLedger produces, for the same reason.
 *
 * Every bank line has cleared by definition: a statement only ever records what happened. So
 * there is no status here, and the closing balance is simply every line applied.
 */
export function summariseBank(
  lines: BankLine[],
  entries: LedgerEntry[],
  merchant: string,
): BankSummary {
  const claimed = new Map(
    entries
      .filter((entry) => inScope(entry.merchantId, merchant))
      .map((entry) => [entry.id, entry] as const),
  )
  const openingBalance = merchant === ALL ? OPENING_BALANCE : 0
  let closingBalance = openingBalance
  let credits = 0
  let debits = 0
  let unmatchedCount = 0

  const rows = [...lines]
    .sort(byDateAscending)
    .filter((line) => inScope(line.merchantId, merchant))
    .map((line) => {
      if (line.type === 'CREDIT') {
        credits += line.amount
        closingBalance += line.amount
      } else {
        debits += line.amount
        closingBalance -= line.amount
      }
      const entry = line.matchedEntryId ? claimed.get(line.matchedEntryId) : undefined
      const agrees =
        entry !== undefined &&
        Math.round((signed(line.amount, line.type) - signed(entry.amount, entry.type)) * 100) === 0
      const match =
        entry === undefined
          ? 'BANK_ONLY'
          : agrees || line.manual
            ? 'MATCHED'
            : 'AMOUNT_DIFFERS'
      if (match !== 'MATCHED') unmatchedCount += 1
      return { ...line, runningBalance: closingBalance, match } as BankRow
    })
    .reverse()

  return { openingBalance, closingBalance, credits, debits, unmatchedCount, rows }
}

export type ComparisonRow = {
  /** Composite, because a row can come from either side or both. */
  id: string
  merchantId: string
  date: string
  /** Our particulars where we have them, the bank's narration where we do not. */
  particulars: string
  bankRef: string | null
  ledgerRef: string | null
  bankAmount: number | null
  ledgerAmount: number | null
  /** Bank less ledger, signed, and 0 unless both sides are present and disagree. */
  delta: number
  match: MatchState
  /** A pair a person made by hand — see BankLine.manual. */
  manual: boolean
}

export type ComparisonSummary = {
  bankClosing: number
  ledgerClosing: number
  /** What the two closing balances differ by — the number the page exists to explain. */
  difference: number
  unmatchedCount: number
  rows: ComparisonRow[]
}

/**
 * The two ledgers, lined up.
 *
 * One row per pair, plus a row for everything only one side has. An in-progress ledger entry
 * counts as LEDGER_ONLY rather than being hidden: it is precisely the kind of thing that
 * explains a difference, and leaving it out would make the page lie about why the balances
 * disagree.
 */
export function buildComparison(
  entries: LedgerEntry[],
  lines: BankLine[],
  merchant: string,
): ComparisonSummary {
  const scopedEntries = entries.filter((entry) => inScope(entry.merchantId, merchant))
  const scopedLines = lines.filter((line) => inScope(line.merchantId, merchant))
  const byEntryId = new Map(scopedEntries.map((entry) => [entry.id, entry]))
  const bank = summariseBank(lines, entries, merchant)
  const ledger = summariseLedger(entries, merchant)

  const rows: ComparisonRow[] = []
  const pairedEntryIds = new Set<string>()

  scopedLines.forEach((line) => {
    const entry = line.matchedEntryId ? byEntryId.get(line.matchedEntryId) : undefined
    if (!entry) {
      rows.push({
        id: `bank:${line.id}`,
        merchantId: line.merchantId,
        date: line.date,
        particulars: line.narration,
        bankRef: line.id,
        ledgerRef: null,
        bankAmount: signed(line.amount, line.type),
        ledgerAmount: null,
        delta: 0,
        match: 'BANK_ONLY',
        manual: false,
      })
      return
    }
    pairedEntryIds.add(entry.id)
    const bankAmount = signed(line.amount, line.type)
    const ledgerAmount = signed(entry.amount, entry.type)
    // Rounded to the paisa before comparing: these are currency figures, and a float
    // subtraction that lands on 1e-13 is not a reconciliation exception.
    const delta = Math.round((bankAmount - ledgerAmount) * 100) / 100
    rows.push({
      id: `pair:${line.id}`,
      merchantId: line.merchantId,
      date: line.date,
      particulars: entry.particulars,
      bankRef: line.id,
      ledgerRef: entry.id,
      bankAmount,
      ledgerAmount,
      delta,
      match: delta === 0 || line.manual ? 'MATCHED' : 'AMOUNT_DIFFERS',
      manual: line.manual === true,
    })
  })

  scopedEntries
    .filter((entry) => !pairedEntryIds.has(entry.id))
    .forEach((entry) => {
      rows.push({
        id: `ledger:${entry.id}`,
        merchantId: entry.merchantId,
        date: entry.date,
        particulars: entry.particulars,
        bankRef: null,
        ledgerRef: entry.id,
        bankAmount: null,
        ledgerAmount: signed(entry.amount, entry.type),
        delta: 0,
        match: 'LEDGER_ONLY',
        manual: false,
      })
    })

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    bankClosing: bank.closingBalance,
    ledgerClosing: ledger.ledgerBalance,
    difference: Math.round((bank.closingBalance - ledger.ledgerBalance) * 100) / 100,
    unmatchedCount: rows.filter((row) => row.match !== 'MATCHED').length,
    rows,
  }
}

/**
 * A person's pairing: `bankLineId` becomes the bank's record of `entryId`, by hand.
 *
 * An entry is the record of one line at most, so any other line that claimed it lets go and
 * goes back to being the bank's alone — otherwise the comparison would show the entry twice,
 * once against each line.
 */
export const pairLines = (lines: BankLine[], bankLineId: string, entryId: string) =>
  lines.map((line) => {
    if (line.id === bankLineId) return { ...line, matchedEntryId: entryId, manual: true }
    if (line.matchedEntryId === entryId) {
      return { ...line, matchedEntryId: undefined, manual: undefined }
    }
    return line
  })

/** The signed figure a bank line or a ledger entry moves — money out is negative. */
export const signedAmount = (item: { amount: number; type: EntryDirection }) =>
  signed(item.amount, item.type)

/** The search box, over whichever side of a row carries words. */
export const matchesBankQuery = (line: BankLine, needle: string) =>
  needle === '' ||
  line.narration.toLowerCase().includes(needle) ||
  line.id.toLowerCase().includes(needle)

export const matchesComparisonQuery = (row: ComparisonRow, needle: string) =>
  needle === '' ||
  row.particulars.toLowerCase().includes(needle) ||
  (row.bankRef?.toLowerCase().includes(needle) ?? false) ||
  (row.ledgerRef?.toLowerCase().includes(needle) ?? false)
