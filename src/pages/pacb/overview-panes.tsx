/**
 * The stat-card panes the PACB Workflow sandbox shows on its right before anything is
 * picked: the period's Overview, and a settlement's own before a payment is picked. Shared
 * by the current view (PacbWorkflowSandbox.tsx) and Version 3 (PacbWorkflowV3.tsx).
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { CircleCheck, Clock, Users } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import arrowsRightIcon from '../../assets/icons/arrows-right.svg'
import clockSnoozeIcon from '../../assets/icons/clock-snooze.svg'
import rupeeIcon from '../../assets/icons/currency-rupee-circle.svg'
import hourglassIcon from '../../assets/icons/hourglass-01.svg'
import MaskIcon from '../../components/MaskIcon'
import { font, PrimitiveText } from '../../primitives'
import { HAIRLINE, PANEL_STYLE, rupees } from './helpers'
import type { MerchantPayment } from './PaymentCard'
import type { Settlement } from './SettlementCard'
import { paymentsOf } from './settlements'

const { colors } = FOUNDATION_THEME

/**
 * One of the Overview's figures, as the design draws it (node 93:16612): a small grey title
 * with its 14px glyph, the figure under it at heading.lg.
 *
 * blend-gap: StatCardV2 puts its title icon on a row of its own above the title and gives the
 * figure no slot for that size, so this card is composed from tokens instead.
 */
function OverviewStat({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div
      role="group"
      aria-label={`${title}, ${value}`}
      className="flex flex-col gap-1.5 p-3"
      style={{ ...PANEL_STYLE, boxShadow: FOUNDATION_THEME.shadows.xs }}
    >
      <div className="flex items-center gap-1">
        {icon}
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[400]}>
          {title}
        </PrimitiveText>
      </div>
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.heading.lg)}
        color={colors.gray[800]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        {value}
      </PrimitiveText>
    </div>
  )
}

type OverviewFigure = { icon: ReactNode; title: string; value: string }

const statIcon = (src: string) => <MaskIcon src={src} size={14} color={colors.gray[400]} />
const lucideIcon = (Icon: typeof Users) => <Icon size={14} color={colors.gray[400]} aria-hidden />

/**
 * A heading row and a grid of OverviewStat cards — the page's Overview and a settlement's.
 * The heading row is padded like the column headers, so its divider lines up with theirs.
 */
function StatsPane({
  label,
  title,
  note,
  figures,
}: {
  label: string
  title: string
  /** A quiet line at the heading row's right — what to do next. */
  note?: string
  figures: OverviewFigure[]
}) {
  return (
    <section
      aria-label={label}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
    >
      <div
        className="flex min-h-6 flex-wrap items-center justify-between gap-3 px-6 py-5"
        style={{ borderBottom: HAIRLINE }}
      >
        <PrimitiveText
          as="h2"
          {...font(FOUNDATION_THEME.font.size.body.lg)}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {title}
        </PrimitiveText>
        {note && (
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[400]}>
            {note}
          </PrimitiveText>
        )}
      </div>
      {/* The design's grid (node 93:16756): two columns as wide as their figures, centred
          in the pane. */}
      <div className="flex justify-center px-6 py-18">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(2,minmax(210px,auto))]">
          {figures.map((figure) => (
            <OverviewStat key={figure.title} {...figure} />
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * What fills the two right-hand columns before a settlement is picked: the period at a
 * glance, as stat cards, over the settlements the list is showing (the range and search —
 * the list's filter chips are off the page). Pick a settlement and its payments replace it.
 */
export const Overview = memo(function Overview({ settlements }: { settlements: Settlement[] }) {
  const moved = settlements.filter(({ status }) => status === 'MOVED')
  const awaiting = settlements.filter(({ status }) => status === 'AWAITING_OCA')
  const total = (rows: Settlement[]) => rows.reduce((sum, row) => sum + row.amount, 0)
  const payments = settlements.reduce((sum, row) => sum + row.merchantPayments, 0)
  // The payouts still to go, and the money they come to. paymentsOf already knows that an
  // unmoved settlement's payouts are all pending.
  const pending = settlements.flatMap(paymentsOf).filter(({ status }) => status === 'PENDING')
  const pendingAmount = pending.reduce((sum, { amount }) => sum + amount, 0)

  return (
    <StatsPane
      label="Settlements overview"
      title="Overview"
      figures={[
        { icon: statIcon(rupeeIcon), title: 'Total Amount', value: rupees(total(settlements)) },
        { icon: statIcon(arrowsRightIcon), title: 'Moved to OCA', value: rupees(total(moved)) },
        { icon: statIcon(hourglassIcon), title: 'Awaiting OCA', value: rupees(total(awaiting)) },
        {
          icon: statIcon(clockSnoozeIcon),
          title: 'Pending Payout Amount',
          value: rupees(pendingAmount),
        },
        { icon: lucideIcon(Users), title: 'Merchant Payments', value: String(payments) },
        { icon: lucideIcon(Clock), title: 'Pending Payouts', value: String(pending.length) },
      ]}
    />
  )
})

/**
 * One settlement's figures — the Overview's cards over its own payments, shown in the payment
 * pane until a payment is picked. Paid out and pending split its payouts both ways: by money
 * on the top rows, by count on the bottom one.
 */
export function SettlementOverview({ settlement }: { settlement: Settlement }) {
  const payments = paymentsOf(settlement)
  const paid = payments.filter(({ status }) => status === 'SUCCESS')
  const pending = payments.filter(({ status }) => status === 'PENDING')
  const sum = (rows: MerchantPayment[]) => rows.reduce((total, { amount }) => total + amount, 0)
  return (
    <StatsPane
      label={`Overview of ${settlement.settlementId}`}
      title="Settlement Overview"
      note="Select a payment to see its details."
      figures={[
        { icon: statIcon(rupeeIcon), title: 'Settlement Amount', value: rupees(settlement.amount) },
        { icon: statIcon(arrowsRightIcon), title: 'Paid Out', value: rupees(sum(paid)) },
        {
          icon: statIcon(clockSnoozeIcon),
          title: 'Pending Payout Amount',
          value: rupees(sum(pending)),
        },
        { icon: lucideIcon(Users), title: 'Merchant Payments', value: String(payments.length) },
        { icon: lucideIcon(CircleCheck), title: 'Successful Payouts', value: String(paid.length) },
        { icon: lucideIcon(Clock), title: 'Pending Payouts', value: String(pending.length) },
      ]}
    />
  )
}
