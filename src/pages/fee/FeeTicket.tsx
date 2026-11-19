/**
 * Layout 1's rule — Figma's "Fee Ticket / Blend" (node 2264:5828): a rate stub, a
 * perforation, and the rule's detail beside it.
 *
 * The card opens the rule — its configuration tree, on a page of its own (FeeTree.tsx).
 * The whole card takes that click, because the thing you want to open is the thing you are
 * looking at.
 *
 * A rule priced in bands (`rule.slabs`) also expands in place, and that stays a real button
 * rather than a second meaning for the card: two different outcomes from one click would be
 * a coin toss. `SlabToggle` (tags.tsx) is that button, and the card's handler ignores clicks
 * that came from any control, so the two never fire together.
 *
 * blend-gap: Blend 0.0.37 does ship `CardV2`, and its OUTLINED tokens match this surface
 * exactly — but its padding scale is 10px (COMPACT) or 12px (COMFORTABLE) where the design
 * is 16px, and it strips `style`, so the gap cannot be closed from here. The stub is further
 * out of reach: `CardV2.Media` fixes its own radius, a gray[50] fill and a 96px minimum,
 * where this is a full-bleed gray[25] column with a 1px perforation. So the frame is composed
 * from `PANEL_STYLE` and everything inside it that Blend does have — the tags, the kebab — is
 * Blend's (tags.tsx).
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { font, PrimitiveText } from '../../primitives'
import { PANEL_STYLE } from '../pacb/helpers'
import type { FeeRule } from './data'
import { ruleHref } from './fee-tree'
import { NeutralTag, RuleFoot, RuleHeader, SlabTable, SlabToggle, TagRow } from './tags'

const { colors } = FOUNDATION_THEME

/**
 * The stub: the number you came to read. Centred in its own 180px column on gray[25], which
 * is what makes it a stub rather than a first line — the tint and the perforation beside it
 * do the work that a heading weight would otherwise have to.
 */
function RateStub({ rule }: { rule: FeeRule }) {
  return (
    // No `h-full`: the parent is `items-stretch`, and `height: 100%` against an auto-height
    // parent does not resolve, so it fell back to the stub's own content height and cancelled
    // the stretch — a tinted column stopping short of the card's bottom edge.
    <div
      className="flex w-[180px] shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden px-3.5 py-[18px]"
      style={{ backgroundColor: colors.gray[25] }}
    >
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.heading.md)}
        color={colors.gray[700]}
        style={{ whiteSpace: 'nowrap' }}
      >
        {rule.rate}
      </PrimitiveText>
      {rule.rateCaption && (
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.xs)}
          color={colors.gray[500]}
          style={{ whiteSpace: 'nowrap' }}
        >
          {rule.rateCaption}
        </PrimitiveText>
      )}
      <NeutralTag text={rule.mode} />
    </div>
  )
}

export function FeeTicket({ rule }: { rule: FeeRule }) {
  const [open, setOpen] = useState(false)
  const slabs = rule.slabs
  const toggle = () => setOpen((was) => !was)
  const navigate = useNavigate()

  /** The kebab and the toggle are real buttons; let them answer for their own clicks. */
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    navigate(ruleHref(rule))
  }

  return (
    <article
      className="flex cursor-pointer items-stretch overflow-hidden"
      style={PANEL_STYLE}
      onClick={handleClick}
    >
      <RateStub rule={rule} />
      {/* The perforation. A 1px column rather than a border, so it spans the full height of
          whichever side is taller without either side owning it. */}
      <div
        className="w-px shrink-0 self-stretch"
        style={{ backgroundColor: colors.gray[200] }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-hidden px-4 py-3.5">
        <RuleHeader rule={rule} />
        {slabs ? (
          // The count sits on the description's line rather than below it, so a banded card
          // is the same height at rest as every other card in the grid.
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[500]}
              style={{ flex: '1 0 0', minWidth: 0 }}
              truncate
            >
              {rule.description}
            </PrimitiveText>
            <SlabToggle count={slabs.length} open={open} onToggle={toggle} name={rule.name} />
          </div>
        ) : (
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
            {rule.description}
          </PrimitiveText>
        )}
        {slabs && open && <SlabTable slabs={slabs} />}
        <TagRow rule={rule} />
        <RuleFoot lead={rule.effective} rule={rule} />
      </div>
    </article>
  )
}
