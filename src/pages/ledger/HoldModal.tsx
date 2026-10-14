import {
  AlertV2,
  AlertV2SubType,
  AlertV2Type,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  InputSizeV2,
  KeyValuePairV2,
  KeyValuePairV2Size,
  KeyValuePairV2StateType,
  ModalV2,
  NumberInputV2,
  NumberInputV2Direction,
  TextAreaV2,
} from '@juspay/blend-design-system'
import { Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { LedgerEntry } from './data'
import { formatCurrency } from './ledger'

const { colors } = FOUNDATION_THEME

type HoldForm = { amount: number | null; reason: string }

/** The form opens on the hold already in place, or offers to hold the whole amount. */
const seedFor = (entry: LedgerEntry | null): HoldForm => ({
  amount: entry ? entry.holdAmount || entry.amount : null,
  reason: entry?.holdReason ?? '',
})

/**
 * Place, change or release a hold on one entry's funds.
 *
 * A held entry opens on an alert naming the hold in place, with Release Hold as its action —
 * the prototype's "Release All Holds" link, moved from the footer into the alert because
 * ModalV2's own footer holds exactly two actions and those are Cancel and Apply Hold.
 *
 * `entry` is the row being held; `null` is closed. Same reseed-on-open as EntryModal.
 */
export function HoldModal({
  entry,
  onClose,
  onApply,
  onRelease,
}: {
  entry: LedgerEntry | null
  onClose: () => void
  onApply: (id: string, hold: { amount: number; reason: string }) => void
  onRelease: (id: string) => void
}) {
  const [seededFrom, setSeededFrom] = useState(entry)
  const [shown, setShown] = useState(entry)
  const [form, setForm] = useState(() => seedFor(entry))
  if (entry !== seededFrom) {
    setSeededFrom(entry)
    if (entry) {
      setShown(entry)
      setForm(seedFor(entry))
    }
  }

  const max = shown?.amount ?? 0
  const amountError =
    form.amount !== null && (form.amount <= 0 || form.amount > max)
      ? `Enter an amount between $0.01 and ${formatCurrency(max)}.`
      : undefined
  const canSubmit =
    shown !== null && form.amount !== null && !amountError && form.reason.trim() !== ''

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSubmit || !shown || form.amount === null) return
    onApply(shown.id, { amount: form.amount, reason: form.reason.trim() })
  }

  return (
    <ModalV2
      isOpen={entry !== null}
      onClose={onClose}
      title="Manage Funds Hold"
      showCloseButton
      closeOnBackdropClick={false}
      dimensions={{ width: 480 }}
      primaryAction={{
        buttonType: ButtonV2Type.PRIMARY,
        size: ButtonV2Size.MEDIUM,
        text: 'Apply Hold',
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
      {shown && (
        // Two groups, 24 apart: what is already true of the entry (the hold in place, the
        // entry itself) and what you are about to change. 16 inside each, so the space alone
        // says where the read-back ends and the form begins.
        <form className="flex flex-col gap-6" onSubmit={submit}>
          <div className="flex flex-col gap-4">
            {shown.holdAmount > 0 && (
              <AlertV2
                type={AlertV2Type.PURPLE}
                subType={AlertV2SubType.SUBTLE}
                slot={{ slot: <Lock size={16} /> }}
                heading={`${formatCurrency(shown.holdAmount)} on hold`}
                description={shown.holdReason || 'No reason recorded.'}
                actions={{
                  primaryAction: { text: 'Release Hold', onClick: () => onRelease(shown.id) },
                }}
                // AlertV2 shows a ✕ by default, wired to nothing. This alert goes away when
                // its condition does, so there is nothing for a ✕ to do.
                closeButton={{ show: false }}
                width="100%"
                maxWidth="100%"
              />
            )}

            {/* The entry being held, read back — the same gray[50] panel the app uses for a
                read-only summary inside a form (SubmitConfigModal's preview). 16 all round,
                AlertV2's own inset, so the two boxes stacked here share one keyline inside
                and out. */}
            <div
              className="flex flex-col gap-2 p-4"
              style={{
                backgroundColor: colors.gray[50],
                borderRadius: FOUNDATION_THEME.border.radius[8],
              }}
            >
              {[
                ['Ref', shown.id],
                ['Particulars', shown.particulars],
                ['Max Amount', formatCurrency(shown.amount)],
              ].map(([key, value]) => (
                <KeyValuePairV2
                  key={key}
                  keyString={key}
                  value={value}
                  size={KeyValuePairV2Size.SM}
                  keyValuePairState={KeyValuePairV2StateType.horizontal}
                  textOverflow="wrap"
                  maxWidth="100%"
                  showTooltipOnTruncate={false}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <NumberInputV2
              label={{ text: 'Amount to Hold' }}
              required
              placeholder="0.00"
              size={InputSizeV2.MD}
              unit="$"
              unitDirection={NumberInputV2Direction.LEFT}
              min={0}
              max={max}
              step={0.01}
              preventNegative
              value={form.amount}
              hintText="This amount will be locked and deducted from the Available Balance."
              error={{ show: amountError !== undefined, message: amountError }}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  amount: event.target.value === '' ? null : Number(event.target.value),
                }))
              }
            />
            <TextAreaV2
              label="Reason for Hold"
              required
              rows={3}
              resize="none"
              placeholder="e.g. Pending AML review, Dispute raised..."
              value={form.reason}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, reason: event.target.value }))
              }
            />
          </div>

          <button type="submit" hidden />
        </form>
      )}
    </ModalV2>
  )
}
