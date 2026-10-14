import { useDialKit } from 'dialkit'
import { Outlet } from 'react-router'
import { EntryModal } from './EntryModal'
import { HoldModal } from './HoldModal'
import { SPACING_DIALS } from './table'
import { useLedger, type LedgerOutletContext } from './use-ledger'

/**
 * Reconciliation › Ledger — the layout both versions render into (src/router.tsx).
 *
 * It holds the one ledger (useLedger) and the spacing dials, and hands them to Ledger v1 or
 * Ledger v2 through the Outlet, so moving between the two in the sidebar compares two designs
 * of the same data: an entry recorded in one is there in the other. The dialogs are the same
 * in both and rendered once, here.
 */
function Ledger() {
  const spacing = useDialKit('Ledger spacing', SPACING_DIALS)
  const ledger = useLedger()

  const context: LedgerOutletContext = {
    entries: ledger.entries,
    actions: ledger.actions,
    spacing,
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
    </>
  )
}

export default Ledger
