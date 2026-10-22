/**
 * One settlement, as a card — PACB Figma, "Settlement ID Cards" (node 33:28101).
 *
 * blend-gap: Blend has no list-card component, so this is composed from PrimitiveText and
 * tokens. The glyphs are the design's own exports (Untitled UI, in src/assets/icons) drawn
 * through MaskIcon, so the vectors are exact and the colour still comes from a token.
 *
 * The five design variants are not a prop of their own; they fall out of the data:
 *
 * | Variant        | status         | pending payments          |
 * |----------------|----------------|---------------------------|
 * | All Successful | `MOVED`        | 0                         |
 * | All Pending    | `MOVED`        | all of them               |
 * | Few Pending    | `MOVED`        | some                      |
 * | Awaiting OCA   | `AWAITING_OCA` | — (payments not started)  |
 * | Failed         | `FAILED`       | — (payments not started)  |
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import buildingIcon from '../../assets/icons/building-02.svg'
import checkCircleIcon from '../../assets/icons/check-circle.svg'
import loadingIcon from '../../assets/icons/loading-02.svg'
import statusDotIcon from '../../assets/icons/status-dot.svg'
import MaskIcon from '../../components/MaskIcon'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { istStamp, rupees } from './helpers'
import { HoverCopy, SelectOverlay, TruncatedId } from './kit'

const { colors } = FOUNDATION_THEME

/** Where the settlement's money is: moved to the OCA, still in escrow, or stuck. */
export type SettlementStatus = 'MOVED' | 'AWAITING_OCA' | 'FAILED'

export type Settlement = {
  settlementId: string
  /** In rupees. */
  amount: number
  status: SettlementStatus
  /** UTR of the escrow → OCA movement. Shown once the money has moved. */
  utr?: string
  /** Why the movement failed. Shown when `status` is FAILED. */
  failureReason?: string
  /** ISO timestamp. */
  settledAt: string
  merchantPayments: number
  /** Of `merchantPayments`, how many are still pending. Only read once the money has moved. */
  pendingPayments?: number
}

const DOT_COLOR: Record<SettlementStatus, string | undefined> = {
  MOVED: colors.green[600],
  AWAITING_OCA: colors.orange[500],
  FAILED: colors.red[500],
}

const SMALL = FOUNDATION_THEME.font.size.body.sm
const BODY = FOUNDATION_THEME.font.size.body.md

/**
 * The settlement's status as a coloured dot — green moved, orange awaiting OCA, red failed.
 * Exported for the payments column's header, which names the same settlement.
 */
function SettlementStatusDot({ status }: { status: SettlementStatus }) {
  return <MaskIcon src={statusDotIcon} size={16} color={DOT_COLOR[status]} />
}

/** A 14px Figma glyph and a line of small grey text — the footer's one building block. */
function Meta({
  icon,
  color = colors.gray[400],
  children,
}: {
  icon: string
  color?: string
  children: string
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
      <MaskIcon src={icon} size={14} color={color} />
      <PrimitiveText {...font(SMALL)} color={color}>
        {children}
      </PrimitiveText>
    </span>
  )
}

/** The payout progress on the right of the footer — only once the money has moved. */
function PaymentProgress({ total, pending }: { total: number; pending: number }) {
  const successful = total - pending
  return (
    <span className="flex items-center gap-2">
      {pending === 0 ? (
        <Meta icon={checkCircleIcon}>All Successful</Meta>
      ) : (
        <>
          {successful > 0 && <Meta icon={checkCircleIcon}>{`${successful} Successful`}</Meta>}
          <Meta icon={loadingIcon} color={colors.orange[500]}>
            {successful === 0 ? 'All Pending' : `${pending} Pending`}
          </Meta>
        </>
      )}
    </span>
  )
}

/** The card's hairline in each state — the one thing hover and selection change. */
const BORDER = {
  rest: colors.gray[50],
  hover: colors.gray[200], // node 51:16537
  selected: colors.gray[700], // was gray[400] (node 51:16511); gray[700] since 2026-10-07
}

/**
 * Looks from the border alone: rest gray[50], hover gray[200], selected gray[700].
 * Selected wins over hover. Hover is drawn only when the card is selectable (`onSelect`) —
 * it is the card saying it can be clicked — or when `previewHover` pins it on, which is for
 * showing the state in the Playground.
 *
 * The whole card takes the click, so the ID keeps its own hover tooltip. Keyboard selection
 * goes through SelectOverlay (kit.tsx) — a sibling of the copy buttons rather than wrapping
 * them, since a button cannot hold buttons.
 */
export function SettlementCard({
  settlement,
  selected = false,
  onSelect,
  previewHover = false,
}: {
  settlement: Settlement
  selected?: boolean
  onSelect?: () => void
  previewHover?: boolean
}) {
  const { settlementId, amount, status, utr, failureReason, settledAt, merchantPayments } =
    settlement
  const detail =
    status === 'FAILED'
      ? (failureReason ?? 'Failed')
      : status === 'AWAITING_OCA'
        ? 'Awaiting OCA Movement'
        : (utr ?? '')
  const rest = selected ? BORDER.selected : previewHover ? BORDER.hover : BORDER.rest
  const hover = selected ? BORDER.selected : BORDER.hover

  return (
    <article
      aria-label={`Settlement ${settlementId}`}
      onClick={onSelect}
      // The colour is a class, not inline, so `hover:` can change it — an inline
      // border-color would outrank the class.
      className={`relative flex w-full flex-col overflow-hidden [border-color:var(--card-border)] ${
        onSelect ? 'cursor-pointer hover:[border-color:var(--card-border-hover)]' : ''
      }`}
      style={{
        background: colors.gray[50],
        // 2px, every state — rest, hover and selected only change its colour.
        borderWidth: FOUNDATION_THEME.border.width[2],
        borderStyle: 'solid',
        borderRadius: FOUNDATION_THEME.border.radius[6],
        transition: `border-color ${MICRO_MS}ms ${FEEDBACK_EASING}`,
        ['--card-border' as string]: rest,
        ['--card-border-hover' as string]: hover,
      }}
    >
      {onSelect && (
        <SelectOverlay
          selected={selected}
          label={`Select settlement ${settlementId}`}
          onSelect={onSelect}
          radius={FOUNDATION_THEME.border.radius[6]}
        />
      )}
      <div
        className="flex flex-col gap-2 p-2.5"
        style={{
          background: colors.gray[0],
          borderRadius: `0 0 ${FOUNDATION_THEME.border.radius[6]} ${FOUNDATION_THEME.border.radius[6]}`,
        }}
      >
        <div className="group/row flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            <SettlementStatusDot status={status} />
            <PrimitiveText as="span" {...font(BODY)} color={colors.gray[700]}>
              <TruncatedId value={settlementId} />
            </PrimitiveText>
            <HoverCopy value={settlementId} label="Settlement ID" size={14} />
          </div>
          <PrimitiveText {...font(BODY)} color={colors.gray[800]}>
            {rupees(amount)}
          </PrimitiveText>
        </div>
        <div className="group/row flex items-center justify-between gap-3 pl-5">
          <span className="flex min-w-0 items-center gap-1">
            <PrimitiveText as="span" {...font(SMALL)} color={colors.gray[400]}>
              {detail}
            </PrimitiveText>
            {/* Only a UTR is worth copying — the other two states put a sentence here. */}
            {status === 'MOVED' && utr && <HoverCopy value={utr} label="UTR" size={12} />}
          </span>
          <PrimitiveText
            {...font(SMALL)}
            color={status === 'FAILED' ? colors.red[500] : colors.gray[400]}
          >
            {`${istStamp(settledAt)} (IST)`}
          </PrimitiveText>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 py-1 pr-2 pl-[29px]">
        <Meta icon={buildingIcon}>
          {`${merchantPayments} Merchant Payment${merchantPayments === 1 ? '' : 's'}`}
        </Meta>
        {status === 'MOVED' && (
          <PaymentProgress total={merchantPayments} pending={settlement.pendingPayments ?? 0} />
        )}
      </div>
    </article>
  )
}
