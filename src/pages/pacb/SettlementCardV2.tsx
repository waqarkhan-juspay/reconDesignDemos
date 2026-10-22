/**
 * One settlement, as a card — version 2. PACB Figma, "Settlement ID Cards" (node 90:49804).
 *
 * blend-gap: Blend has no list-card component, so this is composed from PrimitiveText and
 * tokens, like version 1 (SettlementCard.tsx). The glyphs are the design's own exports
 * (Untitled UI, in src/assets/icons) drawn through MaskIcon.
 *
 * What changed from version 1: the card is coloured by where its payouts are, not only by
 * where its money is. Three tones, each read from the data —
 *
 * | Tone        | Data                         | Dot / selected colour | Footer, right   |
 * |-------------|------------------------------|-----------------------|-----------------|
 * | Success     | `MOVED`, nothing pending     | green 600             | All Successful  |
 * | In Progress | `MOVED`, some still pending  | yellow 400            | N Pending       |
 * | Pending     | `AWAITING_OCA`               | orange 500            | All Pending     |
 *
 * At rest the frame and footer are SELECTION_SURFACE, the payment row's hover grey, so the
 * two columns share one neutral. Selected, both take the tone's colour, the
 * footer's text and glyphs turn white (gray 700 on yellow, which white cannot sit on). The
 * design's chevron on a selected card was dropped on 2026-10-21. The date — the day, no
 * time — shows once the money has moved: on green and yellow cards, not on orange ones.
 *
 * `FAILED` is not in the design; it takes red 500 the same way and keeps its failure reason
 * where the UTR goes. It only appears while SHOW_FAILED is on.
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import checkCircleIcon from '../../assets/icons/check-circle.svg'
import clockIcon from '../../assets/icons/clock.svg'
import loadingIcon from '../../assets/icons/loading-02.svg'
import statusDotIcon from '../../assets/icons/status-dot.svg'
import MaskIcon from '../../components/MaskIcon'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { istDay, rupees, SELECTION_SURFACE } from './helpers'
import { HoverCopy, SelectOverlay, TruncatedId } from './kit'
import type { Settlement } from './SettlementCard'
import { settlementTone, type SettlementTone } from './settlements'

const { colors } = FOUNDATION_THEME

type Tone = SettlementTone

// `string | undefined` because Blend types its colours that way (version 1's DOT_COLOR too).
const TONE_COLOR: Record<Tone, string | undefined> = {
  success: colors.green[600],
  progress: colors.yellow[400],
  pending: colors.orange[500],
  failed: colors.red[500],
}

/** The footer's ink on a selected card — white, except on yellow. */
const SELECTED_INK: Record<Tone, string | undefined> = {
  success: colors.gray[0],
  progress: colors.gray[700],
  pending: colors.gray[0],
  failed: colors.gray[0],
}

/** The frame at rest and on hover; selected, it is the tone's colour. */
const FRAME = { rest: SELECTION_SURFACE, hover: colors.gray[200] }

const SMALL = FOUNDATION_THEME.font.size.body.sm
const BODY = FOUNDATION_THEME.font.size.body.md

/**
 * The settlement's tone as a coloured dot. Exported for the payments column's header, which
 * names the same settlement.
 */
export function SettlementToneDot({ settlement }: { settlement: Settlement }) {
  return <MaskIcon src={statusDotIcon} size={16} color={TONE_COLOR[settlementTone(settlement)]} />
}

/** A 14px glyph, if any, and a line of small text — the footer's one building block. */
function Meta({ icon, color, children }: { icon?: string; color?: string; children: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
      {icon && <MaskIcon src={icon} size={14} color={color} />}
      <PrimitiveText {...font(SMALL)} color={color}>
        {children}
      </PrimitiveText>
    </span>
  )
}

/** The footer's right side: where the payouts are. */
function payoutSummary(settlement: Settlement, tone: Tone) {
  const { pendingPayments = 0 } = settlement
  if (tone === 'success') return { icon: checkCircleIcon, text: 'All Successful' }
  // A yellow card always counts what is left — "All Pending" belongs to the orange card,
  // whose money has not moved yet.
  if (tone === 'progress') return { icon: clockIcon, text: `${pendingPayments} Pending` }
  if (tone === 'pending') return { icon: loadingIcon, text: 'All Pending' }
  return null
}

/**
 * Same props and behaviour as version 1: the whole card takes the click, SelectOverlay gives
 * it a keyboard path, and the copy glyphs show on their row's hover. Hover is drawn only
 * when the card is selectable.
 */
export function SettlementCardV2({
  settlement,
  selected = false,
  onSelect,
  compactSuccess = false,
}: {
  settlement: Settlement
  selected?: boolean
  onSelect?: () => void
  /** Drop the footer from a green card — the sandbox's "Without footer" dial. */
  compactSuccess?: boolean
}) {
  const { settlementId, amount, status, utr, failureReason, settledAt, merchantPayments } =
    settlement
  const tone = settlementTone(settlement)
  const detail =
    status === 'FAILED'
      ? (failureReason ?? 'Failed')
      : status === 'AWAITING_OCA'
        ? 'Awaiting OCA Movement'
        : (utr ?? '')
  const frame = selected ? TONE_COLOR[tone] : FRAME.rest
  const frameHover = selected ? TONE_COLOR[tone] : FRAME.hover
  const ink = selected ? SELECTED_INK[tone] : colors.gray[500]
  const payout = payoutSummary(settlement, tone)
  const showFooter = !(compactSuccess && tone === 'success')
  const paymentCount = `${merchantPayments} Payment${merchantPayments === 1 ? '' : 's'}`

  return (
    <article
      aria-label={`Settlement ${settlementId}`}
      onClick={onSelect}
      // The footer is the frame showing through under the white body, so the border and the
      // fill are one colour in every state, hover included. Both are classes, not inline, so
      // `hover:` can change them.
      className={`relative flex w-full flex-col overflow-hidden [background-color:var(--card-frame)] [border-color:var(--card-frame)] ${
        onSelect
          ? 'cursor-pointer hover:[background-color:var(--card-frame-hover)] hover:[border-color:var(--card-frame-hover)]'
          : ''
      }`}
      style={{
        borderWidth: FOUNDATION_THEME.border.width[2],
        borderStyle: 'solid',
        borderRadius: FOUNDATION_THEME.border.radius[6],
        transition: `border-color ${MICRO_MS}ms ${FEEDBACK_EASING}, background-color ${MICRO_MS}ms ${FEEDBACK_EASING}`,
        ['--card-frame' as string]: frame,
        ['--card-frame-hover' as string]: frameHover,
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
          // Rounded only at the bottom, where the footer sits; with no footer the frame's own
          // corners do it.
          borderRadius: showFooter
            ? `0 0 ${FOUNDATION_THEME.border.radius[6]} ${FOUNDATION_THEME.border.radius[6]}`
            : 0,
        }}
      >
        <div className="group/row flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            <MaskIcon src={statusDotIcon} size={16} color={TONE_COLOR[tone]} />
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
            {/* Only a UTR is worth copying — the other states put a sentence here. */}
            {status === 'MOVED' && utr && <HoverCopy value={utr} label="UTR" size={12} />}
          </span>
          {(tone === 'success' || tone === 'progress') && (
            <PrimitiveText {...font(SMALL)} color={colors.gray[400]}>
              {istDay(settledAt)}
            </PrimitiveText>
          )}
        </div>
      </div>
      {showFooter && (
        <div className="flex items-center justify-between gap-3 py-1 pr-2 pl-[29px]">
          {/* The count alone — its building glyph and "Merchant" dropped on 2026-10-21. */}
          <Meta color={ink}>{paymentCount}</Meta>
          {payout && (
            <Meta icon={payout.icon} color={ink}>
              {payout.text}
            </Meta>
          )}
        </div>
      )}
    </article>
  )
}
