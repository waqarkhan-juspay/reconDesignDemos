import {
  AlertV2,
  AlertV2SubType,
  AlertV2Type,
  ButtonV2Size,
  ButtonV2Type,
  InputSizeV2,
  ModalV2,
  NumberInputV2,
  NumberInputV2Direction,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  TextInputV2,
} from '@juspay/blend-design-system'
import { Info } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  DIRECTION_LABEL,
  EMPTY_DRAFT,
  ENTRY_KINDS,
  type EntryDirection,
  type EntryDraft,
  type EntryKind,
  type EntryStatus,
} from './data'

const DIRECTION_ITEMS = [
  {
    items: (['DEBIT', 'CREDIT'] as const).map((value) => ({
      value,
      label: DIRECTION_LABEL[value],
    })),
  },
]

const KIND_ITEMS = [{ items: ENTRY_KINDS }]

/** Only the two a new entry can start in — nothing is recorded as already failed. */
const STATUS_ITEMS = [
  {
    items: [
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'IN_PROGRESS', label: 'In Progress (Pending)' },
    ],
  },
]

/** The select fields share one shape: full-width MD containers, like the inputs above them. */
const SELECT = {
  size: SingleSelectV2Size.MD,
  variant: SingleSelectV2Variant.CONTAINER,
  triggerDimensions: { width: '100%' },
} as const

/**
 * Record a ledger entry — or, opened from a row's Reverse action, the entry that reverses it.
 *
 * The prototype's form asked for neither the amount nor the direction, so every new entry it
 * recorded was worth NaN. Both are asked here. On a reversal they are locked along with the
 * merchant: a reversal is the original's amount, in the other direction, for the same
 * merchant, and the row's action has already filled them in.
 *
 * `draft` is what the form opens on; `null` is closed. The form keeps its own copy while it
 * is open, reseeded whenever a new draft arrives, and keeps it while the modal animates out
 * so the fields do not blank under the closing panel.
 */
export function EntryModal({
  draft,
  onClose,
  onSubmit,
}: {
  draft: EntryDraft | null
  onClose: () => void
  onSubmit: (entry: EntryDraft & { amount: number }) => void
}) {
  const [seededFrom, setSeededFrom] = useState(draft)
  const [form, setForm] = useState(draft ?? EMPTY_DRAFT)
  if (draft !== seededFrom) {
    setSeededFrom(draft)
    if (draft) setForm(draft)
  }

  const isReversal = form.originalEntryId !== undefined
  const set = (patch: Partial<EntryDraft>) => setForm((previous) => ({ ...previous, ...patch }))

  const canSubmit =
    form.merchantId.trim() !== '' &&
    form.particulars.trim() !== '' &&
    form.amount !== null &&
    form.amount > 0

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSubmit || form.amount === null) return
    onSubmit({
      ...form,
      merchantId: form.merchantId.trim(),
      particulars: form.particulars.trim(),
      amount: form.amount,
    })
  }

  return (
    <ModalV2
      isOpen={draft !== null}
      onClose={onClose}
      title="Create New Ledger Entry"
      subtitle={isReversal ? `Reverses ${form.originalEntryId}` : undefined}
      showCloseButton
      // A half-filled entry should not vanish on a stray click outside it.
      closeOnBackdropClick={false}
      dimensions={{ width: 560 }}
      primaryAction={{
        buttonType: ButtonV2Type.PRIMARY,
        size: ButtonV2Size.MEDIUM,
        text: 'Record Entry',
        disabled: !canSubmit,
        onClick: () => submit(),
      }}
      secondaryAction={{
        buttonType: ButtonV2Type.SECONDARY,
        size: ButtonV2Size.MEDIUM,
        text: 'Cancel',
        onClick: onClose,
      }}
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextInputV2
          label="Merchant ID"
          required
          placeholder="e.g. MERCH-001"
          size={InputSizeV2.MD}
          value={form.merchantId}
          disabled={isReversal}
          autoFocus={!isReversal}
          // Upper-cased as it is typed, so the filter's merchant list never holds a
          // MERCH-001 and a merch-001 as two merchants.
          onChange={(event) => set({ merchantId: event.target.value.toUpperCase() })}
        />
        <TextInputV2
          label="Particulars"
          required
          placeholder="e.g. Settlement Batch #1029"
          size={InputSizeV2.MD}
          value={form.particulars}
          autoFocus={isReversal}
          onChange={(event) => set({ particulars: event.target.value })}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInputV2
            label={{ text: 'Amount' }}
            required
            placeholder="0.00"
            size={InputSizeV2.MD}
            unit="$"
            unitDirection={NumberInputV2Direction.LEFT}
            min={0}
            step={0.01}
            preventNegative
            value={form.amount}
            disabled={isReversal}
            onChange={(event) =>
              set({ amount: event.target.value === '' ? null : Number(event.target.value) })
            }
          />
          <SingleSelectV2
            {...SELECT}
            label="Direction"
            placeholder="Select a direction"
            items={DIRECTION_ITEMS}
            selected={form.type}
            disabled={isReversal}
            onSelect={(value) => set({ type: value as EntryDirection })}
          />
          <SingleSelectV2
            {...SELECT}
            label="Entry Type"
            placeholder="Select an entry type"
            items={KIND_ITEMS}
            selected={form.entryType}
            onSelect={(value) => set({ entryType: value as EntryKind })}
          />
          <SingleSelectV2
            {...SELECT}
            label="Initial Status"
            placeholder="Select a status"
            items={STATUS_ITEMS}
            selected={form.status}
            onSelect={(value) => set({ status: value as EntryStatus })}
          />
        </div>

        {form.status === 'IN_PROGRESS' && form.type === 'DEBIT' && (
          <AlertV2
            type={AlertV2Type.WARNING}
            subType={AlertV2SubType.SUBTLE}
            slot={{ slot: <Info size={16} /> }}
            description="As an in-progress debit, this amount comes off the Available Balance straight away, but does not touch the Ledger Balance until it is marked Completed."
            // AlertV2 shows a ✕ by default, wired to nothing. This alert goes away when its
            // condition does, so there is nothing for a ✕ to do.
            closeButton={{ show: false }}
            width="100%"
            maxWidth="100%"
          />
        )}

        {/* Lets Enter submit — a form with no submit control ignores Enter in some browsers. */}
        <button type="submit" hidden />
      </form>
    </ModalV2>
  )
}
