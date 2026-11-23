import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { EntryModal } from './EntryModal'
import { HoldModal } from './HoldModal'
import { LEDGER_TOASTER, SPACING } from './table'
import { useLedger, type LedgerOutletContext } from './use-ledger'

/**
 * Reconciliation › Ledger — the layout both versions render into (src/router.tsx).
 *
 * It holds the one ledger (useLedger) and the page's spacing, and hands them to Ledger v1 or
 * Ledger v2 through the Outlet, so moving between the two in the sidebar compares two designs
 * of the same data: an entry recorded in one is there in the other. The dialogs are the same
 * in both and rendered once, here.
 */
function Ledger() {
  const ledger = useLedger()

  const context: LedgerOutletContext = {
    entries: ledger.entries,
    bankLines: ledger.bankLines,
    actions: ledger.actions,
    spacing: SPACING,
  }

  return (
    <>
      <Outlet context={context} />
      <EntryModal
        draft={ledger.entryDraft}
        onClose={ledger.closeEntry}
        onSubmit={ledger.recordEntry}
      />
      <HoldModal
        entry={ledger.holdTarget}
        onClose={ledger.closeHold}
        onApply={ledger.applyHold}
        onRelease={ledger.releaseHold}
      />
      {/*
        Plain sonner, bottom-right, for this page only. The app's Blend host stays
        bottom-left because the config detail sheet fills the right-hand column elsewhere;
        nothing on the Ledger page covers this corner, and the reconcile action it confirms
        is made on the right of the page too. `id` keeps the two hosts apart — each shows
        only the toasts addressed to it.
      */}
      <Toaster
        id={LEDGER_TOASTER}
        position="bottom-right"
        // Inter, like the page, rather than sonner's system stack.
        toastOptions={{ style: { fontFamily: 'inherit' } }}
      />
    </>
  )
}

export default Ledger
