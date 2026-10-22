/**
 * The merchant-payments column of the PACB Workflow, version 3. PACB Figma, node 113:28496
 * (selected) and 113:29750 (the same column on another screen — identical).
 *
 * blend-gap: Blend has no list or list-row component, so the column is composed from
 * PrimitiveText and tokens, like SettlementCardV3 beside it. The status is the module's
 * StatusTag (TagV2, subtle, XS), so SUCCESS / PENDING read in the same colours as every PACB
 * table. The info glyph is the design's own export (Untitled UI `info-circle`), drawn through
 * MaskIcon.
 *
 * Shape: a fixed 352px column (320 of content + 16 either side), a gray 200 hairline on its
 * right. A header with the settlement ID sits still on a gray 200 hairline; the rows scroll
 * under it. Rows carry no dividers — the design separates them by rhythm alone.
 *
 * Hover and selected are the same state: a gray 50 fill, as in SettlementCardV3.
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { memo } from 'react'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { HAIRLINE, rupees } from './helpers'
import { HoverCopy, InfoButton, SelectOverlay, StatusTag } from './kit'
import type { MerchantPayment } from './PaymentCard'
import type { Settlement } from './SettlementCard'

const { colors } = FOUNDATION_THEME

const BODY = FOUNDATION_THEME.font.size.body.md

/** 320px of content plus 16px padding each side, as the design draws it. */
const COLUMN_WIDTH = 352

/** Hover and selected share it. */
const ACTIVE_FILL = colors.gray[50]

// Memoised, and each row bound to one stable `onSelect(id)`: a payment click redraws the two
// rows that change, not the whole column.
export const PaymentListV3 = memo(function PaymentListV3({
  settlement,
  payments,
  selectedId,
  onSelect,
  onInfo,
}: {
  settlement: Settlement
  payments: MerchantPayment[]
  selectedId: string | null
  onSelect: (paymentId: string) => void
  /** The header's info button: back to the settlement's own figures. */
  onInfo: () => void
}) {
  return (
    <section
      aria-label={`Payments in settlement ${settlement.settlementId}`}
      className="flex h-full min-h-0 shrink-0 flex-col"
      style={{
        width: COLUMN_WIDTH,
        borderRight: HAIRLINE,
        backgroundColor: colors.gray[0],
      }}
    >
      {/* 65px, hairline included — the Settlement Overview heading's height beside it
          (StatsPane in overview-panes.tsx), so the two rules line up. */}
      <header
        className="flex h-[65px] shrink-0 items-center justify-between gap-2 px-4"
        style={{ borderBottom: HAIRLINE }}
      >
        {/* The ID copies from a glyph beside it, shown while the heading is hovered. */}
        <span className="group/row flex min-w-0 items-center gap-1">
          <PrimitiveText {...font(BODY)} color={colors.gray[700]} truncate>
            {settlement.settlementId}
          </PrimitiveText>
          <HoverCopy value={settlement.settlementId} label="Settlement ID" size={14} />
        </span>
        {/* A borderless icon button, like the drill-in back arrow; the negative margins keep
            the header at the design's height and the glyph where the design puts it. */}
        <span className="-my-[7px] -mr-[9px] flex shrink-0">
          <InfoButton
            label={`Show the figures for settlement ${settlement.settlementId}`}
            onClick={onInfo}
          />
        </span>
      </header>
      <div role="list" className="min-h-0 flex-1 overflow-y-auto">
        {payments.map((payment) => (
          <PaymentRow
            key={payment.paymentId}
            payment={payment}
            selected={payment.paymentId === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
})

/** One payment: ID and amount, then entity · line of business and the status tag. */
const PaymentRow = memo(function PaymentRow({
  payment,
  selected,
  onSelect: onSelectId,
}: {
  payment: MerchantPayment
  selected: boolean
  onSelect: (paymentId: string) => void
}) {
  const { paymentId, amount, entityId, lineOfBusiness, status } = payment
  const onSelect = () => onSelectId(paymentId)
  return (
    <article
      role="listitem"
      aria-label={`Payment ${paymentId}`}
      onClick={onSelect}
      // A class, not inline, so `hover:` can change it.
      className="relative flex cursor-pointer flex-col gap-2 px-4 py-3 [background-color:var(--row-fill)] hover:[background-color:var(--row-active)]"
      style={{
        transition: `background-color ${MICRO_MS}ms ${FEEDBACK_EASING}`,
        ['--row-fill' as string]: selected ? ACTIVE_FILL : colors.gray[0],
        ['--row-active' as string]: ACTIVE_FILL,
      }}
    >
      <SelectOverlay
        selected={selected}
        label={`Select payment ${paymentId}`}
        onSelect={onSelect}
      />
      <div className="flex items-center justify-between gap-3 whitespace-nowrap">
        <PrimitiveText {...font(BODY)} color={colors.gray[700]} truncate>
          {paymentId}
        </PrimitiveText>
        <PrimitiveText {...font(BODY)} color={colors.gray[900]}>
          {rupees(amount)}
        </PrimitiveText>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <PrimitiveText {...font(BODY)} color={colors.gray[500]} truncate>
            {entityId}
          </PrimitiveText>
          <PrimitiveText {...font(BODY)} color={colors.gray[500]}>
            ⋅
          </PrimitiveText>
          <PrimitiveText {...font(BODY)} color={colors.gray[500]} truncate>
            {lineOfBusiness}
          </PrimitiveText>
        </span>
        <span className="shrink-0">
          <StatusTag status={status} />
        </span>
      </div>
    </article>
  )
})
