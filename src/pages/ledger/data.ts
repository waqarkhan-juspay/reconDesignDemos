/**
 * The Ledger page's seed data and vocabulary — ported from the "Advanced Ledger Module"
 * prototype (advanced_ledger_module.html), entries and opening balance unchanged.
 */

export type EntryDirection = 'CREDIT' | 'DEBIT'
export type EntryStatus = 'COMPLETED' | 'IN_PROGRESS' | 'FAILED'
export type EntryKind = 'Standard' | 'Pre-funding' | 'Reversal' | 'Adjustment' | 'Fee'

export type LedgerEntry = {
  id: string
  merchantId: string
  /** ISO timestamp. */
  date: string
  particulars: string
  amount: number
  type: EntryDirection
  entryType: EntryKind
  status: EntryStatus
  /** 0 when nothing is held. */
  holdAmount: number
  holdReason: string
  reconciled: boolean
  /** Set on an entry once a reversal has been recorded against it. */
  reversedByEntryId?: string
  /** Set on a reversal: the entry it reverses. */
  originalEntryId?: string
}

/** The New Entry form's values. */
export type EntryDraft = {
  merchantId: string
  particulars: string
  /** `null` until a number is typed — an empty field, not a zero. */
  amount: number | null
  type: EntryDirection
  entryType: EntryKind
  status: EntryStatus
  /** Set when this entry reverses another: the reference it reverses. */
  originalEntryId?: string
}

/** A new entry opens as a completed standard debit, with nothing typed. */
export const EMPTY_DRAFT: EntryDraft = {
  merchantId: '',
  particulars: '',
  amount: null,
  type: 'DEBIT',
  entryType: 'Standard',
  status: 'COMPLETED',
}

/** The platform's balance at the start of the period. A single merchant's view starts at 0. */
export const OPENING_BALANCE = 50000

export const STATUS_LABEL: Record<EntryStatus, string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  FAILED: 'Failed',
}

export const DIRECTION_LABEL: Record<EntryDirection, string> = {
  CREDIT: 'Credit',
  DEBIT: 'Debit',
}

/** What the Entry Type select offers, in the prototype's order and wording. */
export const ENTRY_KINDS: { value: EntryKind; label: string }[] = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Pre-funding', label: 'Pre-funding' },
  { value: 'Reversal', label: 'Reversal' },
  { value: 'Adjustment', label: 'Adjustment' },
  { value: 'Fee', label: 'Fee / Charge' },
]

export const INITIAL_ENTRIES: LedgerEntry[] = [
  { id: 'TXN-847291', merchantId: 'MERCH-001', date: '2026-10-07T14:30:00Z', particulars: 'Client Invoice #INV-001', amount: 15000, type: 'CREDIT', entryType: 'Standard', status: 'COMPLETED', holdAmount: 0, holdReason: '', reconciled: true },
  { id: 'TXN-293847', merchantId: 'MERCH-002', date: '2026-10-06T09:15:00Z', particulars: 'AWS Cloud Hosting', amount: 1200, type: 'DEBIT', entryType: 'Standard', status: 'COMPLETED', holdAmount: 0, holdReason: '', reconciled: true },
  { id: 'TXN-556102', merchantId: 'MERCH-001', date: '2026-10-05T16:45:00Z', particulars: 'Stripe Payout Pre-funding', amount: 5000, type: 'CREDIT', entryType: 'Pre-funding', status: 'COMPLETED', holdAmount: 0, holdReason: '', reconciled: true },
  { id: 'TXN-992012', merchantId: 'MERCH-003', date: '2026-10-04T11:20:00Z', particulars: 'Suspicious Vendor Payment', amount: 3500, type: 'DEBIT', entryType: 'Standard', status: 'COMPLETED', holdAmount: 3500, holdReason: 'Pending AML Check', reconciled: false },
  { id: 'TXN-110293', merchantId: 'MERCH-002', date: '2026-10-08T10:00:00Z', particulars: 'International Wire Transfer', amount: 8500, type: 'DEBIT', entryType: 'Standard', status: 'IN_PROGRESS', holdAmount: 0, holdReason: '', reconciled: false },
  { id: 'TXN-449302', merchantId: 'MERCH-001', date: '2026-09-15T08:00:00Z', particulars: 'Refund to Customer A', amount: 450, type: 'DEBIT', entryType: 'Reversal', status: 'COMPLETED', holdAmount: 0, holdReason: '', reconciled: true },
  { id: 'TXN-773821', merchantId: 'MERCH-003', date: '2026-08-22T13:10:00Z', particulars: 'Q3 Partner Settlement', amount: 22000, type: 'CREDIT', entryType: 'Adjustment', status: 'COMPLETED', holdAmount: 0, holdReason: '', reconciled: true },
]
