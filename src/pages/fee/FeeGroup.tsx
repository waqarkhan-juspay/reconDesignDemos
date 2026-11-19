/**
 * Layout 4 — the grouped ticket of Figma `2321:8333`, closed (`2319:8283`) and open
 * (`2327:8382`).
 *
 * The frame is the receipt ticket again, but the body stops being a description and becomes a
 * list of **scopes**: both `MDR (4)` and `Platform` are a layer the designer named `scope`,
 * and the difference between them is only that one charges by amount and the other charges
 * one rate. So that is the model here — a scope has a `value` or it has `bands`, and the card
 * draws whichever it was given. The open frame is the same card with one scope's bands shown;
 * there is no second component.
 *
 * `GroupCard` takes the frame's slots and nothing else, so the playground can fill them with
 * the frame's own copy (FeeCards.tsx) while the page fills them from a rule. `FeeGroup` is
 * that second binding.
 *
 * blend-gap: same as FeeTicket.tsx — `CardV2`'s padding scale stops at 12px where the frame
 * is 16px, and it strips `style`, so the frame is composed on PANEL_STYLE.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
} from '@juspay/blend-design-system'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Block, font, PrimitiveText } from '../../primitives'
import { HAIRLINE, PANEL_STYLE } from '../pacb/helpers'
import { METHODS } from './brands'
import { MODE_HINT, type FeeRule, type FeeStatus } from './data'
import { mdrLines, platformFee, ruleHref } from './fee-tree'
import { BUTTONV2_TOKENS } from '../../tokens/ButtonV2'
import { Kebab, StatusTag } from './tags'

const { colors } = FOUNDATION_THEME

/**
 * The stub's edge, where this frame draws it dashed rather than solid — the perforation the
 * ticket shape has always implied, finally made literal.
 *
 * `border.width[1]` is already the string `'1px'`, so it is interpolated bare: appending a
 * second `px` yields `1pxpx`, which browsers drop silently and the card loses its divider.
 */
export const PERFORATION_DASHED = `${FOUNDATION_THEME.border.width[1]} dashed ${colors.gray[200]}`

/** The stub's width, which is also where the perforation runs. */
const STUB_WIDTH = 180

/**
 * The perforation's own centre line, in the card's coordinates.
 *
 * The stub is border-box, so its 1px dashed right border is the last pixel *inside* its 180 —
 * the line's middle is at 179.5, not at 180. Half a pixel, and skipping it is what makes a
 * punch look very slightly glued on rather than cut.
 */
const PERFORATION_X = STUB_WIDTH - 0.5

/** The punch's width. Its height is half that: each one is a half-circle on an edge. */
const PUNCH = 14

/** The frame draws this card's disclosure chevron at 10.5px, smaller than the module's 14. */
// blend-gap: there is no borderless icon button in Blend 0.0.37. `ButtonV2SubType` offers
// DEFAULT, ICON_ONLY and INLINE — ICON_ONLY carries a border and INLINE drops the padding
// along with it, so a padded ghost is not a combination the enum can express. `GHOST` does
// ship, but on `CardV2Variant`, not on a button.
//
// So it is composed here, per rule 13 — and composed out of ButtonV2's own token tree rather
// than out of numbers typed to look similar. `BUTTONV2_TOKENS` is the generated transcript of
// what 0.0.37 ships (src/tokens/ButtonV2.ts), which `npm run tokens:check` diffs against the
// install, so a Blend upgrade that moves the padding moves this button with it instead of
// leaving it 1px adrift from the real secondary buttons beside it. The first `sm` is the
// breakpoint; the second is the size.
const BUTTON = BUTTONV2_TOKENS.sm
const GHOST_PADDING = BUTTON.padding.top.sm.secondary.iconOnly
const GHOST_RADIUS = BUTTON.borderRadius.sm.secondary.iconOnly
/**
 * The hover ButtonV2 gives a secondary icon button — the one state a ghost still shows.
 *
 * Taken from the palette rather than from `BUTTON.backgroundColor`, which is typed as
 * styled-components' `Background` and so admits images and gradients that `Block`'s
 * `backgroundColor` does not. The token holds exactly this grey; reading it through a cast
 * would buy the same value and lose the typecheck.
 */
const GHOST_HOVER = colors.gray[50]

function GhostIconButton({
  icon,
  onClick,
  label,
}: {
  icon: ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <Block
      as="button"
      aria-label={label}
      onClick={onClick}
      display="flex"
      alignItems="center"
      justifyContent="center"
      padding={GHOST_PADDING}
      borderRadius={GHOST_RADIUS}
      color={BUTTON.text.color.secondary.iconOnly.default}
      backgroundColor="transparent"
      border="none"
      cursor="pointer"
      _hover={{ backgroundColor: GHOST_HOVER }}
      _active={{ backgroundColor: colors.gray[100] }}
    >
      {icon}
    </Block>
  )
}

const DISCLOSURE_ICON_SIZE = 11

/** The pager's arrows, at the kebab's size so the two layouts' corners agree. */
const PAGER_ICON_SIZE = 14

/**
 * One thing the rule charges for.
 *
 * `value` and `bands` are the two shapes the frame draws, and a scope has exactly one of
 * them: `Platform 0.05%` is a flat rate, `MDR (4)` is four bands behind a chevron.
 */
export type GroupScope = {
  /**
   * The scope's bare name — `MDR`, `Slabs`, `Net`. The `(4)` the card shows beside a banded
   * one is appended by `Scope`, not written here: the count belongs to the disclosure, and a
   * caller that wrote it into the label had no way of knowing the card was about to decide
   * there was nothing to disclose.
   */
  label: string
  /** What it charges, where it charges one rate. */
  value?: string
  /** What it charges by band, already written as the frame writes it: `0 – 2000 → 0%`. */
  bands?: string[]
}

/**
 * The frame, with its slots open.
 *
 * `action` rather than a fixed control, because the callers put different things in that
 * corner: layout 5 and the playground's exploration both page between conditions with a pair
 * of chevrons, and layout 4 draws a rule as one thing, so it has nothing to page and keeps
 * the kebab — which is the frame's own layer `2327:8393`, left hidden under the chevrons.
 */
export function GroupCard({
  heading,
  note,
  status,
  title,
  action,
  footerAction,
  scopes,
  effective,
  touched,
  defaultOpen,
  onOpen,
  surface = colors.gray[0],
}: {
  /** The stub's first line — what this card is *about*, not what it costs. */
  heading: string
  /** The line under it: the count of whatever the body pages through. */
  note?: string
  status: FeeStatus
  title: string
  action: ReactNode
  /**
   * The card's way in, on the footer's right.
   *
   * Its own slot rather than a flag, for the same reason `action` is one: layout 4 opens by
   * clicking the card and has nothing to put here, and a `showView` boolean would have this
   * file deciding what the button says and where it goes.
   */
  footerAction?: ReactNode
  scopes: GroupScope[]
  effective: string
  /** When it was last touched. The stamp only — who did it is not a card-sized fact. */
  touched: string
  /** A scope's label, to draw the card open on it — the frame's `2327:8382` state. */
  defaultOpen?: string
  /** Where the whole card leads, where it leads anywhere. The playground's does not. */
  onOpen?: () => void
  /** The colour behind the card — what the punches are filled with. See `Punch`. */
  surface?: string
}) {
  /**
   * Which scope is open, by label. One at a time: a card with two scopes open would push its
   * foot off the row it shares with nine others, and no rule drawn here has two band lists.
   */
  const [openScope, setOpenScope] = useState<string | null>(defaultOpen ?? null)
  /** The kebab and the scope toggles are real buttons; let them answer for their own clicks. */
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    onOpen?.()
  }
  return (
    <article
      className={`relative flex items-stretch${onOpen ? ' cursor-pointer' : ''}`}
      style={PANEL_STYLE}
      onClick={onOpen ? handleClick : undefined}
    >
      <div
        className="flex w-[180px] shrink-0 flex-col items-start justify-between gap-3 px-4 py-[18px]"
        style={{
          backgroundColor: colors.gray[25],
          borderRight: PERFORATION_DASHED,
          // The card no longer clips, so the stub rounds its own outer corners. One pixel
          // larger than the true inner radius, which is invisible and saves arithmetic on a
          // token that is a string.
          borderTopLeftRadius: FOUNDATION_THEME.border.radius[12],
          borderBottomLeftRadius: FOUNDATION_THEME.border.radius[12],
        }}
      >
        <div className="flex w-full min-w-0 flex-col">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.md)}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
            color={colors.gray[700]}
          >
            {heading}
          </PrimitiveText>
          {note && (
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[500]}
              style={{ whiteSpace: 'nowrap' }}
            >
              {note}
            </PrimitiveText>
          )}
        </div>
        <StatusTag status={status} />
      </div>
      {/* The slack goes under the foot, not between the lines.
 
          A card in a grid row is stretched to the tallest card beside it, and a rule with one
          rate has far less to say than a rule with four bands. `justify-between` shared that
          borrowed height out between every row, which pushed the rates into the middle of the
          card and left the title hanging — the two answers that belong under the title drifted
          away from it exactly when a neighbour opened up. A plain stack instead, with
          `mt-auto` on the foot: the rates stay attached under the title whatever the row
          does, and the dates still sit on the bottom edge opposite the stub's status tag. */}
      {/* `gap-5` between the three groups and `gap-1` inside the scope list, rather than one
          even gap throughout. Evenly spaced, the card read as five unrelated lines; the rates
          are one thing the card says, and the title above and the dates below are each
          another. The uneven rhythm is what says so — nothing here is a border. */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-hidden px-4 py-3.5">
        <div className="flex w-full items-center gap-2 overflow-hidden">
          <PrimitiveText
            as="h3"
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
            style={{ flex: '1 0 0', minWidth: 0 }}
            truncate
          >
            {title}
          </PrimitiveText>
          {action}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-1">
          {scopes.map((scope) => (
            <Scope
              key={scope.label}
              scope={scope}
              open={openScope === scope.label}
              onToggle={() =>
                setOpenScope((at) => (at === scope.label ? null : scope.label))
              }
              title={title}
            />
          ))}
        </div>
        {/* One run rather than two ends. Both halves answer *when* — when the rule applies,
            and when it was last touched — so a gap stretched between them read as two
            unrelated facts the card had failed to fill the space between. Side by side on a
            single gap, with nothing drawn between them, they read as the one answer they are.
            `touched` keeps its nowrap and `effective` keeps the truncation, so a narrow card
            eats the span rather than the stamp. */}
        <div className="mt-auto flex w-full min-w-0 items-center gap-3 overflow-hidden">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.sm)}
            color={colors.gray[500]}
            style={{ minWidth: 0 }}
            truncate
          >
            {effective}
          </PrimitiveText>
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.sm)}
            color={colors.gray[500]}
            style={{ whiteSpace: 'nowrap' }}
          >
            {touched}
          </PrimitiveText>
          {footerAction && <div className="ml-auto shrink-0">{footerAction}</div>}
        </div>
      </div>
      <Punch edge="top" surface={surface} />
      <Punch edge="bottom" surface={surface} />
    </article>
  )
}

/**
 * One end of the perforation, bitten out of the card's edge.
 *
 * A half-circle rather than a full one clipped in half: a full circle would need the card to
 * clip it, and the card's clip stops at the *padding* box — so its own 1px border would still
 * run straight across the notch and give the game away. This sits one pixel proud of the
 * padding box instead, covering that border where it crosses, and carries the border on its
 * own arc so the card's outline follows the bite round and back.
 *
 * Which is why it needs `surface`: it is painted in the colour the card sits *on*, and that is
 * the one thing a card cannot know about itself.
 */
function Punch({ edge, surface }: { edge: 'top' | 'bottom'; surface: string | undefined }) {
  const top = edge === 'top'
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: PERFORATION_X - PUNCH / 2,
        top: top ? -1 : undefined,
        bottom: top ? undefined : -1,
        width: PUNCH,
        height: PUNCH / 2,
        backgroundColor: surface,
        borderLeft: HAIRLINE,
        borderRight: HAIRLINE,
        borderTop: top ? undefined : HAIRLINE,
        borderBottom: top ? HAIRLINE : undefined,
        // Clamped by the browser to half the width, which on a box this shape is a semicircle.
        borderRadius: top ? `0 0 ${PUNCH}px ${PUNCH}px` : `${PUNCH}px ${PUNCH}px 0 0`,
      }}
    />
  )
}

/**
 * A scope, in whichever of the frame's two shapes it was given.
 *
 * The banded one is a real `button` rather than the whole card: the card already holds the
 * kebab's button, and a button inside a button is markup the browser repairs by splitting, so
 * the kebab's clicks would reach both. It also carries the `aria-expanded` a screen reader
 * needs, which a clickable card cannot.
 *
 * A single band takes the flat shape instead. `MDR (1) ⌄` is a disclosure that promises a list
 * and then hands over one line — it costs a click to say what the card had room to say
 * outright, and the `(1)` only ever counts to one. So one band reads `MDR 0.5%`, exactly as
 * `Platform 0.05%` does, and the chevron is kept for the rules that have something folded up.
 */
function Scope({
  scope,
  open,
  onToggle,
  title,
}: {
  scope: GroupScope
  open: boolean
  onToggle: () => void
  title: string
}) {
  const [only] = scope.bands ?? []
  if (!scope.bands || scope.bands.length === 1) {
    return (
      <div className="flex items-center gap-1 overflow-hidden">
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.sm)}
          color={colors.gray[700]}
          style={{ whiteSpace: 'nowrap' }}
        >
          {scope.label}
        </PrimitiveText>
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.sm)}
          color={colors.gray[500]}
          truncate
        >
          {scope.value ?? only}
        </PrimitiveText>
      </div>
    )
  }
  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${scope.label} on ${title}`}
        className="flex cursor-pointer items-center gap-1 self-start border-none bg-transparent p-0"
      >
        <PrimitiveText
          as="span"
          {...font(FOUNDATION_THEME.font.size.body.sm)}
          color={colors.gray[700]}
          style={{ whiteSpace: 'nowrap' }}
        >
          {`${scope.label} (${scope.bands.length})`}
        </PrimitiveText>
        <ChevronDown
          size={DISCLOSURE_ICON_SIZE}
          color={colors.gray[400]}
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          aria-hidden
        />
      </button>
      {open && (
        <div className="slab-reveal flex w-full flex-col">
          {/* Keyed by position: the frame's own band list repeats a line, and two identical
              strings cannot both be a React key. */}
          {scope.bands.map((band, index) => (
            <PrimitiveText
              key={index}
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[500]}
              truncate
            >
              {band}
            </PrimitiveText>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * One pricing rule, drawn as the frame's grouped ticket.
 *
 * The stub keeps the rate and its caption, as it does in layout 1 — the frame's stub layers
 * are still named `rate` and `rateCaption`, whatever copy was typed into them. The scopes are
 * the rule's bands where it has them, and then what mode it charges in, which is the one
 * label-and-value pair every rule has.
 */
export function FeeGroup({ rule }: { rule: FeeRule }) {
  const navigate = useNavigate()
  const scopes: GroupScope[] = [
    ...(rule.slabs
      ? [
          {
            label: 'Slabs',
            bands: rule.slabs.map((slab) => `${slab.band} → ${slab.rate}`),
          },
        ]
      : []),
    { label: rule.mode, value: MODE_HINT[rule.mode] },
  ]
  return (
    <GroupCard
      heading={rule.rate}
      note={rule.rateCaption}
      status={rule.status}
      title={rule.name}
      action={<Kebab name={rule.name} />}
      scopes={scopes}
      effective={rule.effective}
      touched={rule.when}
      onOpen={() => navigate(ruleHref(rule))}
    />
  )
}

/**
 * Layout 5 — the same frame with the kebab's corner given to a pager.
 *
 * Layout 4 draws a rule as one thing. This draws it as the several things it actually covers:
 * the body is one payment method at a time and the arrows walk them, so `Card MDR` reads as
 * `Credit card`, then `Debit card`, rather than as a row of tags you have to expand mentally.
 *
 * The rates move with the method. The rule's headline is the baseline and each method sits at
 * its own ratio around it (`METHOD_FACTOR`, fee-tree.ts), so paging is not a tour of the same
 * number under nine labels — it is the one view in the module that shows what a rule actually
 * resolves to, method by method. The tree and the coverage view read the same table, so none
 * of the three can quote a method a figure the others do not recognise.
 *
 * Closed at rest. The frame draws a card open (`2327:8382`) and that reads well as *a frame*,
 * but a grid of ten open cards is ten rate lists arguing before you have picked a rule — and
 * the band list is the one thing on this card that changes its height. So the scopes start
 * shut, the same as layout 4, and a card grows only where you asked it to.
 */
export function FeePaged({ rule }: { rule: FeeRule }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const methods = rule.methods
  const method = methods[page]
  const lines = mdrLines(rule, method)
  const step = (by: number) => setPage((at) => (at + by + methods.length) % methods.length)
  return (
    <GroupCard
      heading={rule.name}
      note={`${methods.length} payment ${methods.length === 1 ? 'method' : 'methods'}`}
      status={rule.status}
      title={METHODS[method].name}
      scopes={[
        { label: 'MDR', bands: lines },
        { label: 'Platform', value: platformFee(method) },
      ]}
      effective={rule.effective}
      touched={rule.when}
      action={
        <div className="flex shrink-0 items-center gap-0.5">
          <GhostIconButton
            icon={<ChevronLeft size={PAGER_ICON_SIZE} />}
            onClick={() => step(-1)}
            label={`Previous method on ${rule.name}`}
          />
          <GhostIconButton
            icon={<ChevronRight size={PAGER_ICON_SIZE} />}
            onClick={() => step(1)}
            label={`Next method on ${rule.name}`}
          />
        </div>
      }
      footerAction={
        /* A real secondary button, border and all. INLINE drew it as a link, and a link in the
           corner of a card reads as a footnote rather than as the thing to press — the card
           no longer opens on its own click, so this is the only way in and it should look
           like one. */
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="View"
          onClick={() => navigate(ruleHref(rule))}
          aria-label={`View ${rule.name}`}
        />
      }
    />
  )
}
