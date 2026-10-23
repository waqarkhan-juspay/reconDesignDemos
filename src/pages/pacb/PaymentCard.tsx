/**
 * One merchant payment, as a list row — PACB Figma, node 28:7747.
 *
 * blend-gap: Blend has no list-row component, so this is composed from PrimitiveText and
 * tokens. The status is the module's StatusTag, so SUCCESS / PENDING read in the same
 * colours here as in every PACB table.
 *
 * It is a row, not a boxed card: full width of its list, divided from the next by a hairline
 * along its bottom, as the design draws it.
 *
 * Hover and selected share one fill, SELECTION_SURFACE — the payment detail panel's own
 * background, so the row and the panel it opens read as one, and hovering previews exactly
 * what selecting will look like.
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { HAIRLINE, rupees, SELECTION_SURFACE } from './helpers'
import { SelectOverlay, StatusTag } from './kit'

const { colors } = FOUNDATION_THEME

export type MerchantPaymentStatus = 'SUCCESS' | 'PENDING'

export type MerchantPayment = {
  paymentId: string
  /** In rupees. */
  amount: number
  entityId: string
  lineOfBusiness: string
  status: MerchantPaymentStatus
}

const BODY = FOUNDATION_THEME.font.size.body.md

/**
 * Pass `onSelect` to make the row selectable; it then takes the hover fill too, since hover
 * is the row saying it can be clicked. `previewHover` pins the hover look on, for showing the
 * state in the Playground.
 *
 * The whole row takes the click; keyboard selection goes through SelectOverlay (kit.tsx).
 */
export function PaymentCard({
  payment,
  selected = false,
  onSelect,
  previewHover = false,
}: {
  payment: MerchantPayment
  selected?: boolean
  onSelect?: () => void
  previewHover?: boolean
}) {
  const { paymentId, amount, entityId, lineOfBusiness, status } = payment
  return (
    <article
      aria-label={`Payment ${paymentId}`}
      onClick={onSelect}
      // The fill is a class, not inline, so `hover:` can change it.
      className={`relative flex w-full flex-col gap-2 px-6 py-3 [background:var(--row-fill)] ${
        onSelect ? 'cursor-pointer hover:[background:var(--row-fill-active)]' : ''
      }`}
      style={{
        borderBottom: HAIRLINE,
        transition: `background-color ${MICRO_MS}ms ${FEEDBACK_EASING}`,
        ['--row-fill' as string]: selected || previewHover ? SELECTION_SURFACE : colors.gray[0],
        ['--row-fill-active' as string]: SELECTION_SURFACE,
      }}
    >
      {onSelect && (
        <SelectOverlay
          selected={selected}
          label={`Select payment ${paymentId}`}
          onSelect={onSelect}
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <PrimitiveText {...font(BODY)} color={colors.gray[700]}>
          {paymentId}
        </PrimitiveText>
        <PrimitiveText {...font(BODY)} color={colors.gray[900]}>
          {rupees(amount)}
        </PrimitiveText>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          {[entityId, '⋅', lineOfBusiness].map((text, i) => (
            <PrimitiveText key={i} as="span" {...font(BODY)} color={colors.gray[500]}>
              {text}
            </PrimitiveText>
          ))}
        </span>
        <StatusTag status={status} />
      </div>
    </article>
  )
}
