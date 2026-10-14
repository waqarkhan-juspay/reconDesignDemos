import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router'
import {
  EMPTY_DRAFT,
  INITIAL_ENTRIES,
  type EntryDraft,
  type EntryStatus,
  type LedgerEntry,
} from './data'
import { newEntryId } from './ledger'
import type { Spacing } from './table'

/** What a row, a toolbar or a bulk bar can do to the ledger. Stable for the page's life. */
export type LedgerActions = {
  setStatus: (id: string, status: EntryStatus) => void
  toggleReconciled: (id: string) => void
  setReconciled: (ids: string[], reconciled: boolean) => void
  openNewEntry: () => void
  /** The reversing entry: same merchant and amount, the other direction, linked back. */
  startReversal: (entry: LedgerEntry) => void
  openHold: (entry: LedgerEntry) => void
}

/**
 * The ledger's entries and everything that changes them, held once for the page.
 *
 * Held by the Ledger layout route, above both versions rather than inside either, so moving
 * between Ledger v1 and Ledger v2 keeps the entries you have recorded, held and reversed —
 * the two designs are compared on the same ledger, not each on a fresh copy of the seed.
 *
 * `actions` is built once from state setters only, which React keeps stable. That matters:
 * DataTable keeps the first `renderCell` it is given for a REACT_ELEMENT column (see the note
 * on `columns` in Configurator.tsx), so the cells hold on to whatever they first close over.
 */
export function useLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>(INITIAL_ENTRIES)
  /** The New Entry form's starting values while it is open; `null` when it is closed. */
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null)
  /** The row whose hold is being managed; `null` when the hold dialog is closed. */
  const [holdTarget, setHoldTarget] = useState<LedgerEntry | null>(null)

  const actions = useMemo<LedgerActions>(() => {
    const update = (ids: string[], patch: (entry: LedgerEntry) => Partial<LedgerEntry>) =>
      setEntries((previous) =>
        previous.map((entry) => (ids.includes(entry.id) ? { ...entry, ...patch(entry) } : entry)),
      )

    return {
      setStatus: (id, status) => update([id], () => ({ status })),
      toggleReconciled: (id) => update([id], (entry) => ({ reconciled: !entry.reconciled })),
      setReconciled: (ids, reconciled) => update(ids, () => ({ reconciled })),
      openNewEntry: () => setEntryDraft({ ...EMPTY_DRAFT }),
      startReversal: (entry) =>
        setEntryDraft({
          ...EMPTY_DRAFT,
          merchantId: entry.merchantId,
          particulars: `Reversal of ${entry.particulars}`,
          amount: entry.amount,
          type: entry.type === 'CREDIT' ? 'DEBIT' : 'CREDIT',
          entryType: 'Reversal',
          status: 'COMPLETED',
          originalEntryId: entry.id,
        }),
      openHold: setHoldTarget,
    }
  }, [])

  const recordEntry = (draft: EntryDraft & { amount: number }) => {
    setEntries((previous) => {
      const id = newEntryId(previous)
      const entry: LedgerEntry = {
        id,
        merchantId: draft.merchantId,
        date: new Date().toISOString(),
        particulars: draft.particulars,
        amount: draft.amount,
        type: draft.type,
        entryType: draft.entryType,
        status: draft.status,
        holdAmount: 0,
        holdReason: '',
        reconciled: false,
        originalEntryId: draft.originalEntryId,
      }
      // A reversal marks the entry it reverses, so that row stops offering a second one.
      const updated = draft.originalEntryId
        ? previous.map((row) =>
            row.id === draft.originalEntryId ? { ...row, reversedByEntryId: id } : row,
          )
        : previous
      return [entry, ...updated]
    })
    setEntryDraft(null)
  }

  const applyHold = (id: string, hold: { amount: number; reason: string }) => {
    setEntries((previous) =>
      previous.map((row) =>
        row.id === id ? { ...row, holdAmount: hold.amount, holdReason: hold.reason } : row,
      ),
    )
    setHoldTarget(null)
  }

  const releaseHold = (id: string) => {
    setEntries((previous) =>
      previous.map((row) => (row.id === id ? { ...row, holdAmount: 0, holdReason: '' } : row)),
    )
    setHoldTarget(null)
  }

  return {
    entries,
    actions,
    entryDraft,
    holdTarget,
    recordEntry,
    applyHold,
    releaseHold,
    closeEntry: () => setEntryDraft(null),
    closeHold: () => setHoldTarget(null),
  }
}

/** What the Ledger layout hands each version through its Outlet. */
export type LedgerOutletContext = {
  entries: LedgerEntry[]
  actions: LedgerActions
  spacing: Spacing
}

/** The ledger, for a version rendered inside the Ledger layout route. */
export const useLedgerOutlet = () => useOutletContext<LedgerOutletContext>()
