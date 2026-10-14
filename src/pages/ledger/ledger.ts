import { OPENING_BALANCE, type LedgerEntry } from './data'

/** The merchant filter's "everything" value. */
export const ALL = 'ALL'

export type LedgerRow = LedgerEntry & {
  /** The ledger balance straight after this entry, in the current merchant view. */
  runningBalance: number
}

export type LedgerSummary = {
  openingBalance: number
  /** Completed credits less completed debits, on top of the opening balance. */
  ledgerBalance: number
  /** The ledger balance less funds on hold and in-progress debits — what can be spent. */
  availableBalance: number
  totalHeld: number
  pendingDebits: number
  /** How many entries the two figures above are made of. */
  heldCount: number
  pendingCount: number
  rows: LedgerRow[]
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const formatCurrency = (amount: number) => USD.format(amount)

const DATE = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
export const formatDate = (iso: string) => DATE.format(new Date(iso))

const byDateAscending = (a: LedgerEntry, b: LedgerEntry) =>
  new Date(a.date).getTime() - new Date(b.date).getTime()

/**
 * Every balance on the page, for one merchant or for the whole platform — the prototype's
 * arithmetic, unchanged.
 *
 * Walks the entries oldest-first so each row can carry the balance as it stood after it.
 * Only COMPLETED entries move the ledger balance; an in-progress debit is already spoken for,
 * so it comes off the available balance straight away. A held amount comes off it too,
 * whatever the entry's status.
 *
 * The platform view starts from OPENING_BALANCE. A single merchant's starts from 0, so the
 * figures read as that merchant's own net position.
 */
export function summariseLedger(entries: LedgerEntry[], merchant: string): LedgerSummary {
  const openingBalance = merchant === ALL ? OPENING_BALANCE : 0
  let ledgerBalance = openingBalance
  let totalHeld = 0
  let pendingDebits = 0
  let heldCount = 0
  let pendingCount = 0

  const rows = [...entries]
    .sort(byDateAscending)
    .filter((entry) => merchant === ALL || entry.merchantId === merchant)
    .map((entry) => {
      if (entry.holdAmount > 0) {
        totalHeld += entry.holdAmount
        heldCount += 1
      }
      if (entry.status === 'IN_PROGRESS' && entry.type === 'DEBIT') {
        pendingDebits += entry.amount
        pendingCount += 1
      }
      if (entry.status === 'COMPLETED') {
        ledgerBalance += entry.type === 'CREDIT' ? entry.amount : -entry.amount
      }
      return { ...entry, runningBalance: ledgerBalance }
    })
    // Newest first for reading, once every balance has been counted forward.
    .reverse()

  return {
    openingBalance,
    ledgerBalance,
    availableBalance: ledgerBalance - totalHeld - pendingDebits,
    totalHeld,
    pendingDebits,
    heldCount,
    pendingCount,
    rows,
  }
}

/** The search box matches the particulars or the reference, as the prototype did. */
export const matchesQuery = (entry: LedgerEntry, needle: string) =>
  needle === '' ||
  entry.particulars.toLowerCase().includes(needle) ||
  entry.id.toLowerCase().includes(needle)

/** A fresh `TXN-` reference that is not already in the ledger. */
export function newEntryId(existing: LedgerEntry[]) {
  const taken = new Set(existing.map((entry) => entry.id))
  let id: string
  do {
    id = `TXN-${Math.floor(100000 + Math.random() * 900000)}`
  } while (taken.has(id))
  return id
}
