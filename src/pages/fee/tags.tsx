/**
 * The vocabulary every Fee layout is built from — status, PSPs, methods, the header and
 * footer rows, the search field, the empty line.
 *
 * One file because these are one set of decisions: what a neutral tag's stroke is, what
 * colour a status is, how a list overflows, how a rule's name and provenance are set. Three
 * layouts read them; none of them gets to disagree. It holds the composites as well as the
 * atoms, because the composites are where the layouts were quietly drifting apart — one
 * footer truncated its date and the other did not.
 *
 * Acquirers and methods used to be told apart by their stroke — outlined against filled.
 * They are not any more: every neutral tag shares one edge, and the brand mark on an acquirer
 * is what says which family it belongs to.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  InputSizeV2,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  TextInputV2,
} from '@juspay/blend-design-system'
import { EllipsisVertical, Search } from 'lucide-react'
import type { CSSProperties, ReactElement } from 'react'
import { font, PrimitiveText } from '../../primitives'
import {
  METHOD_OVERFLOW,
  METHODS,
  PSP_OVERFLOW,
  PSPS,
  withOverflow,
  type BrandMarkPath,
  type MethodId,
  type PspId,
} from './brands'
import { lastTouched, type FeeRule, type FeeStatus } from './data'

const { colors } = FOUNDATION_THEME

/** The glyph inside a tag. 12px against a 20px tag — the same ratio Blend's own slots use. */
const TAG_ICON_SIZE = 12

/** The kebab's glyph. 14px in the design, which is ButtonV2's SMALL icon slot. */
const KEBAB_ICON_SIZE = 14

/** An icon in an input slot is the placeholder's grey, never `currentColor` (rule 11). */
const SLOT_ICON_SIZE = 16

// ─── Status ──────────────────────────────────────────────────────────────────────────────

/**
 * The status tag's colour. Blend has a palette for every state the design draws, so none of
 * this is a hand-mixed colour — `Draft` is purple because it is the one status that is
 * neither live, nor waiting, nor wrong, and purple is the palette's spare.
 */
const STATUS_COLOR: Record<FeeStatus, TagV2Color> = {
  Active: TagV2Color.SUCCESS,
  Draft: TagV2Color.PURPLE,
  'Pending approval': TagV2Color.WARNING,
  Expired: TagV2Color.ERROR,
  Scheduled: TagV2Color.PRIMARY,
  Inactive: TagV2Color.NEUTRAL,
}

export function StatusTag({
  status,
  size = TagV2Size.XS,
}: {
  status: FeeStatus
  size?: TagV2Size
}) {
  return (
    <TagV2
      text={status}
      type={TagV2Type.SUBTLE}
      size={size}
      color={STATUS_COLOR[status]}
      subType={TagV2SubType.ROUNDED}
    />
  )
}

// ─── Tags ────────────────────────────────────────────────────────────────────────────────

/**
 * The module's one neutral tag: the rate's mode, a payment method, "All PSPs", and the `+3`
 * that stands for the ones there was no room for.
 *
 * SUBTLE rather than NO_FILL, which is what the Figma frames specify. NO_FILL's border token
 * is gray[950] — a hard black edge, and at this size the loudest line on the page. SUBTLE
 * resolves to gray[200] on gray[50], so every tag in a row shares one edge.
 */
export function NeutralTag({ text, icon }: { text: string; icon?: ReactElement }) {
  return (
    <TagV2
      text={text}
      type={TagV2Type.SUBTLE}
      size={TagV2Size.XS}
      color={TagV2Color.NEUTRAL}
      subType={TagV2SubType.ROUNDED}
      leftSlot={icon ? { slot: icon } : undefined}
    />
  )
}

/**
 * A payment method: its glyph and its name. The name stays because a glyph cannot separate a
 * credit card from a debit card — see the note at the top of brands.ts.
 */
function MethodTag({ method }: { method: MethodId }) {
  const { name, icon: Icon, logo } = METHODS[method]
  return (
    <NeutralTag
      text={name}
      icon={
        logo ? (
          <img
            src={logo}
            alt=""
            width={TAG_ICON_SIZE}
            height={TAG_ICON_SIZE}
            style={{ objectFit: 'contain' }}
            aria-hidden
          />
        ) : (
          <Icon size={TAG_ICON_SIZE} />
        )
      }
    />
  )
}

// ─── Brand marks ─────────────────────────────────────────────────────────────────────────

/**
 * A brand silhouette, drawn at the size asked for and in its own colour.
 *
 * The hex travels with the path (brands.ts), so it is data about the brand rather than a
 * colour chosen here. That is the only reason a value outside FOUNDATION_THEME reaches the
 * page (rule 1): a logo is not a UI colour, and Paytm's navy is a fact about Paytm. Everything
 * around the mark — the chip, its backing, its text — stays on the palette.
 */
function BrandMark({ mark, size }: { mark: BrandMarkPath; size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={`#${mark.hex}`}
      aria-hidden
      focusable="false"
    >
      <path d={mark.path} />
    </svg>
  )
}

/**
 * A PSP's artwork, whichever kind it has: the full-colour export if one was supplied, else
 * the single-colour silhouette, else nothing and the caller falls back to the short code.
 *
 * Drawn with `img`, not with MaskIcon as the rest of the app draws its SVGs: MaskIcon paints
 * one colour through the shape as a mask, which is exactly what would throw the colour away.
 * `contain` because the logos are not one aspect ratio — PayU is a wordmark, PhonePe a circle
 * — and letting them fill would squash the wide ones.
 */
function PspGlyph({ psp, size }: { psp: PspId; size: number }) {
  const { logo, mark } = PSPS[psp]
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
        aria-hidden
      />
    )
  }
  if (mark) return <BrandMark mark={mark} size={size} />
  return null
}

/**
 * A PSP, as a plain circular logo — no outline.
 *
 * The ring is gone on purpose. These logos carry their own shape: PhonePe and CCAvenue are
 * circles, PayU sits in one. Drawing a 1px gray[950] ring around a circle that is already
 * there gave every chip a hard black edge and two concentric outlines, which read as a
 * control rather than a brand.
 *
 * blend-gap: this cannot be a `TagV2`. TagV2 always renders its `Text` child and puts `gap`
 * between it and the left slot, so a logo with `text=""` comes out with 6px of dead space on
 * its right — a chip that is visibly off-centre. It also has no borderless variant.
 *
 * The backing is invisible under a logo that fills its circle; it is what gives the two that
 * do not — Paytm's silhouette, and the short code where there is no artwork at all — a circle
 * of their own to sit in. A brand whose mark brings no plate names a `tint` instead.
 */
const CHIP_SIZE = 20

/**
 * How far a stacked chip slides under the one before it, and the ring that keeps the two
 * readable where they meet.
 *
 * Both are Blend's AvatarGroup values (avatarGroup.tokens.ts): -4px of margin at its SM size,
 * and a ring in gray[0] around each avatar. AvatarGroup itself is not used here because its
 * smallest avatar is 24px and this row is 20px — a 24px stack beside 20px method tags makes
 * the row two heights. Borrowing its numbers keeps the gesture Blend's even though the
 * element is ours.
 *
 * The ring is a shadow rather than a border so it costs no layout: a border would grow each
 * chip by 3px and reopen the gaps the overlap just closed.
 */
const CHIP_OVERLAP = -4
const CHIP_RING = `0 0 0 1.5px ${colors.gray[0]}`

const CHIP_STYLE: CSSProperties = {
  width: CHIP_SIZE,
  height: CHIP_SIZE,
  borderRadius: FOUNDATION_THEME.border.radius.full,
  backgroundColor: colors.gray[50],
  color: colors.gray[700],
}

/**
 * Every chip's style, settled once per brand rather than rebuilt per render: five PSPs times
 * stacked-or-not is ten objects, and they never change.
 */
const CHIP_STYLES = Object.fromEntries(
  (Object.keys(PSPS) as PspId[]).map((psp) => {
    const base = PSPS[psp].tint ? { ...CHIP_STYLE, backgroundColor: PSPS[psp].tint } : CHIP_STYLE
    return [psp, { flush: base, stacked: { ...base, marginLeft: CHIP_OVERLAP, boxShadow: CHIP_RING } }]
  }),
) as Record<PspId, { flush: CSSProperties; stacked: CSSProperties }>

function PspChip({ psp, stacked = false }: { psp: PspId; stacked?: boolean }) {
  const { name, short, logo, mark } = PSPS[psp]
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={stacked ? CHIP_STYLES[psp].stacked : CHIP_STYLES[psp].flush}
      title={name}
      aria-label={name}
      role="img"
    >
      {logo || mark ? (
        // A logo fills the circle, since its own edge is the circle's edge; a silhouette sits
        // inside it at glyph size.
        <PspGlyph psp={psp} size={logo ? CHIP_SIZE : TAG_ICON_SIZE} />
      ) : (
        <PrimitiveText
          as="span"
          {...font(FOUNDATION_THEME.font.size.body.xs)}
          color={colors.gray[700]}
          aria-hidden
        >
          {short}
        </PrimitiveText>
      )}
    </span>
  )
}

/**
 * The acquirers: a stack of logos, then a `+N` for the ones that did not fit. `'all'` is one
 * word instead, since there is no list to show.
 *
 * They overlap rather than sitting in a row because the row is a set, not a sequence — which
 * acquirer comes first means nothing, and a tight cluster says "these three" in the width of
 * about two. The first chip stays flush and every one after slides under its neighbour, so
 * the stack grows from a fixed left edge.
 */
function PspTags({ psps }: { psps: FeeRule['psps'] }) {
  if (psps === 'all') return <NeutralTag text="All PSPs" />
  const { shown, extra } = withOverflow(psps, PSP_OVERFLOW)
  return (
    <>
      <span className="inline-flex shrink-0 items-center">
        {shown.map((psp, index) => (
          <PspChip key={psp} psp={psp} stacked={index > 0} />
        ))}
      </span>
      {extra > 0 && <NeutralTag text={`+${extra}`} />}
    </>
  )
}

/** The methods, capped the same way. */
export function MethodTags({ methods }: { methods: MethodId[] }) {
  const { shown, extra } = withOverflow(methods, METHOD_OVERFLOW)
  return (
    <>
      {shown.map((method) => (
        <MethodTag key={method} method={method} />
      ))}
      {extra > 0 && <NeutralTag text={`+${extra}`} />}
    </>
  )
}

/**
 * The acquirers again, named — for layout 3's detail pane, where there is a column for them
 * and the name is the point. The mark leads, so the same brand is recognisable at both sizes;
 * `+N` never appears here, because the column has room for the whole list.
 */
export function PspNameTags({ psps }: { psps: FeeRule['psps'] }) {
  if (psps === 'all') return <NeutralTag text="All PSPs" />
  return (
    <>
      {psps.map((psp) => (
        <NeutralTag
          key={psp}
          text={PSPS[psp].name}
          icon={<PspGlyph psp={psp} size={TAG_ICON_SIZE} />}
        />
      ))}
    </>
  )
}

/** Who it covers — acquirers first, then methods, wrapping together as one row. */
export function TagRow({ rule }: { rule: FeeRule }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 overflow-hidden">
      <PspTags psps={rule.psps} />
      <MethodTags methods={rule.methods} />
    </div>
  )
}

// ─── Rows every card shares ──────────────────────────────────────────────────────────────

/**
 * The row's one action. Icon-only and secondary, so ten of them down a page read as a column
 * of affordances rather than ten buttons competing with the one primary CTA in the header.
 */
export function Kebab({ name }: { name: string }) {
  return (
    <ButtonV2
      buttonType={ButtonV2Type.SECONDARY}
      size={ButtonV2Size.SMALL}
      subType={ButtonV2SubType.ICON_ONLY}
      aria-label={`Actions for ${name}`}
      leftSlot={{ slot: <EllipsisVertical size={KEBAB_ICON_SIZE} /> }}
    />
  )
}

/** A rule's name, how it stands, and its menu — the top line of both card layouts. */
export function RuleHeader({ rule }: { rule: FeeRule }) {
  return (
    <div className="flex w-full items-center gap-2 overflow-hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <PrimitiveText
          as="h3"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[700]}
          truncate
        >
          {rule.name}
        </PrimitiveText>
        <StatusTag status={rule.status} />
      </div>
      <Kebab name={rule.name} />
    </div>
  )
}

/**
 * The footer: when the rule applies on the left, who last touched it on the right.
 *
 * `lead` is the caller's because the two layouts say it differently — the ticket shows the
 * date alone, the card prefixes it with the mode it moved out of the stub. Everything else is
 * shared, including the truncation, which the two had already stopped agreeing on.
 *
 * Both halves are gray[500], the card's one secondary tone. The design draws the right half
 * lighter still, at gray[400], but rule 10 reserves that for placeholders and disabled — so
 * the two share a colour and position carries the hierarchy instead.
 */
export function RuleFoot({
  lead,
  rule,
  className,
  style,
}: {
  lead: string
  rule: FeeRule
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`flex w-full items-center gap-2 overflow-hidden${className ? ` ${className}` : ''}`}
      style={style}
    >
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.xs)}
        color={colors.gray[500]}
        style={{ flex: '1 0 0', minWidth: 0 }}
        truncate
      >
        {lead}
      </PrimitiveText>
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.xs)}
        color={colors.gray[500]}
        style={{ whiteSpace: 'nowrap' }}
      >
        {lastTouched(rule)}
      </PrimitiveText>
    </div>
  )
}

/**
 * The search field. The width is the caller's, because the two places it appears size it
 * differently — 350px in the page header, the full width of the list pane in the split view.
 * What it says, and the grey its glyph is tinted, are not.
 */
export function RuleSearch({
  query,
  onChange,
}: {
  query: string
  onChange: (next: string) => void
}) {
  return (
    <TextInputV2
      value={query}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search rule"
      aria-label="Search pricing rules"
      size={InputSizeV2.MD}
      leftSlot={{ slot: <Search size={SLOT_ICON_SIZE} color={colors.gray[400]} /> }}
    />
  )
}

/**
 * Nothing matched.
 *
 * blend-gap: Blend 0.0.37 publishes no EmptyState — it exists on GitHub but not in the
 * package (rule 3) — so this is the one line the case needs rather than a component invented
 * for it. `size` is the only thing the two callers disagree about: the page says it at body
 * size, the list pane one step down.
 */
export function Empty({ query, size = 'md' }: { query: string; size?: 'md' | 'sm' }) {
  return (
    <PrimitiveText {...font(FOUNDATION_THEME.font.size.body[size])} color={colors.gray[500]}>
      No rules match “{query.trim()}”.
    </PrimitiveText>
  )
}
