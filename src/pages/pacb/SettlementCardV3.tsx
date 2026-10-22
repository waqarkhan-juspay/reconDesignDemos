/**
 * One settlement, as a card — version 3. PACB Figma, node 112:25465.
 *
 * blend-gap: Blend has no list-card component, so this is composed from PrimitiveText and
 * tokens, like versions 1 and 2. The glyphs are the design's own exports (Untitled UI, in
 * src/assets/icons) drawn through MaskIcon.
 *
 * What changed from version 2: no frame, no footer, no dot. The card is two lines on the
 * page's own white — the full ID and the amount, then the UTR (or "Awaiting OCA Movement")
 * and a short date — and the payouts' progress moves to the second line's right end, in the
 * tone's colour:
 *
 * | Tone        | Data                         | Right side            | Colour     |
 * |-------------|------------------------------|-----------------------|------------|
 * | Success     | `MOVED`, nothing pending     | ✓ N settled           | green 600  |
 * | In Progress | `MOVED`, some still pending  | ⟳ settled/N settled   | yellow 500 |
 * | Pending     | `AWAITING_OCA`               | ⧗ N pending           | orange 500 |
 *
 * Hover and selected are the same state: a gray 50 fill.
 *
 * `dateFirst` is the PACB Workflow's Version 3 view (node 113:31935): the date leads the
 * second line ("28/09/26 ⋅ UTR"), and a card whose money has not moved shows only "Awaiting
 * OCA Movement", with no date — nothing has happened on it yet.
 *
 * `FAILED` is not in the design; it keeps its failure reason where the UTR goes and shows
 * no progress. It only appears while SHOW_FAILED is on.
 */

import {
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
} from '@juspay/blend-design-system'
import { Fragment, type ReactNode } from 'react'
import checkIcon from '../../assets/icons/check.svg'
import hourglassIcon from '../../assets/icons/hourglass-01.svg'
import loadingIcon from '../../assets/icons/loading-02.svg'
import statusDotIcon from '../../assets/icons/status-dot.svg'
import MaskIcon from '../../components/MaskIcon'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { istShortDate, rupees } from './helpers'
import { SelectOverlay, TruncatedId } from './kit'
import type { Settlement } from './SettlementCard'
import { LOOKS, type SettlementCardLook } from './settlement-card-looks'
import { settlementTone, type SettlementTone } from './settlements'

const { colors } = FOUNDATION_THEME

const SMALL = FOUNDATION_THEME.font.size.body.sm
const BODY = FOUNDATION_THEME.font.size.body.md
const RADIUS = FOUNDATION_THEME.border.radius[8]

/** Hover and selected share it. */
const ACTIVE_FILL = colors.gray[50]

/** "6/9" — settled out of all the settlement's payments. */
const settledCount = ({ merchantPayments, pendingPayments = 0 }: Settlement) =>
  `${merchantPayments - pendingPayments}/${merchantPayments}`

/** Each tone's colour, as the second line's progress and the dot and rail draw it. */
const TONE_COLOR: Record<SettlementTone, string | undefined> = {
  success: colors.green[600],
  progress: colors.yellow[500],
  pending: colors.orange[500],
  failed: colors.red[500],
}

/** Blend's tag has no yellow, so in-progress takes primary there; the rest match the tones. */
const TAG: Record<SettlementTone, { color: TagV2Color; text: (s: Settlement) => string }> = {
  success: { color: TagV2Color.SUCCESS, text: () => 'All settled' },
  progress: { color: TagV2Color.PRIMARY, text: (s) => `${settledCount(s)} settled` },
  pending: { color: TagV2Color.WARNING, text: () => 'Awaiting OCA' },
  failed: { color: TagV2Color.ERROR, text: () => 'Failed' },
}

/** How much of the payouts is out, 0–1 — the progress layout's bar. */
function settledShare({ status, merchantPayments, pendingPayments = 0 }: Settlement) {
  if (status !== 'MOVED' || merchantPayments === 0) return 0
  return (merchantPayments - pendingPayments) / merchantPayments
}

/** The split layout's stub: a count over a word. */
function stubOf(settlement: Settlement, tone: SettlementTone) {
  const { merchantPayments } = settlement
  if (tone === 'success') return { count: String(merchantPayments), word: 'settled' }
  if (tone === 'progress') return { count: settledCount(settlement), word: 'settled' }
  if (tone === 'pending') return { count: String(merchantPayments), word: 'pending' }
  return { count: '—', word: 'failed' }
}

/** The second line's right end: how far the merchant payouts have got. */
function payoutProgress(settlement: Settlement, tone: SettlementTone) {
  const color = TONE_COLOR[tone]
  const { merchantPayments } = settlement
  if (tone === 'pending') return { icon: hourglassIcon, color, text: `${merchantPayments} pending` }
  if (tone === 'success') return { icon: checkIcon, color, text: `${merchantPayments} settled` }
  if (tone === 'progress')
    return { icon: loadingIcon, color, text: `${settledCount(settlement)} settled` }
  return null
}

/**
 * Same props and behaviour as versions 1 and 2: the whole card takes the click and
 * SelectOverlay gives it a keyboard path. Hover is drawn only when the card is selectable.
 */
export function SettlementCardV3({
  settlement,
  selected = false,
  onSelect,
  dateFirst = false,
  look = 'plain',
}: {
  settlement: Settlement
  selected?: boolean
  onSelect?: () => void
  /** Date before the UTR, and no date until the money moves — see above. */
  dateFirst?: boolean
  look?: SettlementCardLook
}) {
  const { settlementId, amount, status, utr, failureReason, settledAt } = settlement
  const detail =
    status === 'FAILED'
      ? (failureReason ?? 'Failed')
      : status === 'AWAITING_OCA'
        ? 'Awaiting OCA Movement'
        : (utr ?? '')
  const tone = settlementTone(settlement)
  const progress = payoutProgress(settlement, tone)
  const date = istShortDate(settledAt)
  // The second line's left side, in order; a dot goes between each.
  const meta = dateFirst ? (status === 'MOVED' ? [date, detail] : [detail]) : [detail, date]
  const { layout, outlined, divided, tinted } = LOOKS[look]
  const toneColor = TONE_COLOR[tone]
  const radius = divided ? 0 : RADIUS
  const restFill = tinted ? colors.gray[25] : 'transparent'
  // A card with a visible edge (outline or fill) holds its two lines closer: 12 above and
  // below, 8 between them, so the lines read as one unit inside the box rather than two rows
  // floating in it. The edgeless looks keep the design's 16 / 12, where the space is the edge.
  const boxed = layout || outlined || tinted
  // The split layout lays its two halves side by side, each padding itself.
  const frameLayout =
    look === 'split' ? 'flex-row' : boxed ? 'flex-col gap-2 px-4 py-3' : 'flex-col gap-3 p-4'

  const idLine = (
    <PrimitiveText {...font(BODY)} color={colors.gray[700]} truncate>
      {settlementId}
    </PrimitiveText>
  )
  const metaLine = (
    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      {meta.map((text, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <PrimitiveText {...font(SMALL)} color={colors.gray[500]}>
              ⋅
            </PrimitiveText>
          )}
          <PrimitiveText {...font(SMALL)} color={colors.gray[500]} truncate>
            {text}
          </PrimitiveText>
        </Fragment>
      ))}
    </span>
  )
  const progressLine = progress && (
    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
      <MaskIcon src={progress.icon} size={14} color={progress.color} />
      <PrimitiveText {...font(SMALL)} color={progress.color}>
        {progress.text}
      </PrimitiveText>
    </span>
  )

  return (
    <article
      aria-label={`Settlement ${settlementId}`}
      onClick={onSelect}
      // A class, not inline, so `hover:` can change it.
      className={`relative flex w-full overflow-hidden [background-color:var(--card-fill)] ${frameLayout} ${
        onSelect ? 'cursor-pointer hover:[background-color:var(--card-active)]' : ''
      }`}
      style={{
        borderRadius: radius,
        // Outlined: the hairline goes clear once the card is selected — the fill marks it then.
        // Clear rather than removed, so the card keeps its size and nothing shifts.
        ...(outlined && {
          border: `${FOUNDATION_THEME.border.width[1]} solid ${selected ? 'transparent' : colors.gray[200]}`,
        }),
        transition: `background-color ${MICRO_MS}ms ${FEEDBACK_EASING}`,
        ['--card-fill' as string]: selected ? ACTIVE_FILL : restFill,
        ['--card-active' as string]: ACTIVE_FILL,
      }}
    >
      {onSelect && (
        <SelectOverlay
          selected={selected}
          label={`Select settlement ${settlementId}`}
          onSelect={onSelect}
          radius={radius}
        />
      )}
      {layout ? (
        <LayoutBody
          look={look}
          settlement={settlement}
          tone={tone}
          toneColor={toneColor}
          idLine={idLine}
          metaLine={metaLine}
          progressLine={progressLine}
          detail={detail}
          date={status === 'MOVED' ? date : null}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1">
              {look === 'dot' && (
                // A failed card has no progress to colour it; red, as version 2 has it.
                <MaskIcon src={statusDotIcon} size={16} color={toneColor} />
              )}
              {idLine}
            </span>
            <PrimitiveText {...font(BODY)} color={colors.gray[800]}>
              {rupees(amount)}
            </PrimitiveText>
          </div>
          {/* With the dot, the second line starts under the ID, not under the dot. */}
          <div
            className={`flex items-center justify-between gap-3 ${look === 'dot' ? 'pl-5' : ''}`}
          >
            {metaLine}
            {progressLine}
          </div>
        </>
      )}
    </article>
  )
}

/**
 * The six rebuilt layouts' insides (see SettlementCardLook). The card around them — frame,
 * fill, click and keyboard — is SettlementCardV3's, the same for every look.
 */
function LayoutBody({
  look,
  settlement,
  tone,
  toneColor,
  idLine,
  metaLine,
  progressLine,
  detail,
  date,
}: {
  look: SettlementCardLook
  settlement: Settlement
  tone: SettlementTone
  toneColor: string | undefined
  idLine: ReactNode
  metaLine: ReactNode
  progressLine: ReactNode
  detail: string
  /** Only once the money has moved. */
  date: string | null
}) {
  const { settlementId, amount, merchantPayments } = settlement
  const amountText = (
    <PrimitiveText {...font(BODY)} color={colors.gray[800]}>
      {rupees(amount)}
    </PrimitiveText>
  )

  if (look === 'amount')
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.heading.sm)}
            color={colors.gray[800]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {rupees(amount)}
          </PrimitiveText>
          {progressLine}
        </div>
        <PrimitiveText {...font(SMALL)} color={colors.gray[600]} truncate>
          {settlementId}
        </PrimitiveText>
        {metaLine}
      </>
    )

  if (look === 'progress')
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          {idLine}
          {amountText}
        </div>
        {/* blend-gap: ProgressBar is V1-only (rule 4) and draws its own label; a 4px track
            with the payout colour filled in is all this needs. */}
        <div
          role="progressbar"
          aria-label="Merchant payments settled"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(settledShare(settlement) * 100)}
          className="h-1 w-full overflow-hidden rounded-full"
          style={{ background: colors.gray[100] }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${settledShare(settlement) * 100}%`, background: toneColor }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          {metaLine}
          {progressLine}
        </div>
      </>
    )

  if (look === 'rail')
    return (
      <>
        {/* The payout colour as a strip down the left edge, clipped by the card's corners. */}
        <span
          aria-hidden
          className="absolute top-0 bottom-0 left-0 w-[3px]"
          style={{ background: toneColor }}
        />
        <div className="flex items-center justify-between gap-3">
          {idLine}
          {amountText}
        </div>
        <div className="flex items-center justify-between gap-3">
          {metaLine}
          {progressLine}
        </div>
      </>
    )

  if (look === 'compact')
    return (
      <div className="flex items-center gap-2">
        <MaskIcon src={statusDotIcon} size={16} color={toneColor} />
        <span className="min-w-0 flex-1">
          <PrimitiveText as="span" {...font(BODY)} color={colors.gray[700]}>
            <TruncatedId value={settlementId} keep={6} />
          </PrimitiveText>
        </span>
        {progressLine}
        {amountText}
      </div>
    )

  if (look === 'split') {
    const stub = stubOf(settlement, tone)
    return (
      <>
        <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3">
          {idLine}
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.lg)}
            color={colors.gray[800]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {rupees(amount)}
          </PrimitiveText>
          {metaLine}
        </div>
        {/* The stub, behind a dashed tear line. */}
        <div
          className="flex w-[88px] shrink-0 flex-col items-center justify-center gap-0.5 px-2"
          style={{ borderLeft: `${FOUNDATION_THEME.border.width[1]} dashed ${colors.gray[200]}` }}
        >
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.lg)}
            color={toneColor}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {stub.count}
          </PrimitiveText>
          <PrimitiveText {...font(SMALL)} color={colors.gray[500]}>
            {stub.word}
          </PrimitiveText>
        </div>
      </>
    )
  }

  // tag
  const tag = TAG[tone]
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <TagV2
          text={tag.text(settlement)}
          size={TagV2Size.XS}
          type={TagV2Type.SUBTLE}
          color={tag.color}
        />
        {date && (
          <PrimitiveText {...font(SMALL)} color={colors.gray[500]}>
            {date}
          </PrimitiveText>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        {idLine}
        {amountText}
      </div>
      <PrimitiveText {...font(SMALL)} color={colors.gray[500]} truncate>
        {settlement.status === 'MOVED' ? detail : `${merchantPayments} merchant payments`}
      </PrimitiveText>
    </>
  )
}
