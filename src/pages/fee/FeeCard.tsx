/**
 * Layout 2's rule — Figma's "Fee Card / Blend" (node 2262:5415), from frame 2268:8499.
 *
 * The stub is gone: the rate sits on its own line under the name, with its bounds beside it
 * on the baseline, and the mode moves into the footer where it reads as a qualifier of the
 * date ("Net · 01 Nov 2026 →") rather than a third thing to look at. That is what lets the
 * card be a third of the width the ticket needs.
 *
 * blend-gap: `CardV2` exists and maps onto this shape — header with a trailing slot, body
 * with a description, footer with a divider — but its padding tokens are 10px and 12px where
 * the design is 16px, and it strips `style`, so the design's spacing cannot be reached
 * through it. Same note as FeeTicket.tsx.
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import type { CSSProperties } from 'react'
import { font, PrimitiveText } from '../../primitives'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { PANEL_STYLE } from '../pacb/helpers'
import { ruleHref } from './fee-tree'
import type { FeeRule } from './data'
import { RuleFoot, RuleHeader, TagRow } from './tags'

const { colors } = FOUNDATION_THEME

/**
 * The footer's rule is gray[100], a step lighter than the card's own gray[200] edge — an
 * internal division should not read as loudly as the card's boundary. `mt-auto` pins it to
 * the bottom of a stretched card, which keeps the three footers in a row on one line however
 * tall the tag rows above them run.
 */
const FOOT_STYLE: CSSProperties = {
  borderTop: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[100]}`,
}

export function FeeCard({ rule }: { rule: FeeRule }) {
  const navigate = useNavigate()
  /** The kebab is a real button; let it answer for its own clicks. */
  const open = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    navigate(ruleHref(rule))
  }
  return (
    // `h-full` so every card in a row is as tall as the tallest: the grid stretches them, and
    // a card that did not fill its cell would leave its footer floating mid-air.
    <article
      className="flex h-full cursor-pointer flex-col gap-3 overflow-hidden p-4"
      style={PANEL_STYLE}
      onClick={open}
    >
      <RuleHeader rule={rule} />

      {/* Baseline-aligned, so the 10px bounds sit on the same line the 20px rate stands on
          rather than floating against its cap height. */}
      <div className="flex w-full items-baseline gap-2 overflow-hidden whitespace-nowrap">
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.heading.md)}
          color={colors.gray[700]}
        >
          {rule.rate}
        </PrimitiveText>
        {rule.rateCaption && (
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.xs)}
            color={colors.gray[500]}
          >
            {rule.rateCaption}
          </PrimitiveText>
        )}
        {/* Without this the span reads as one rate. This card does not open — it is a third
            of the ticket's width — so it says the rule is banded and leaves opening to the
            ticket and the split view. */}
        {rule.slabs && (
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.xs)}
            color={colors.gray[500]}
          >
            · {rule.slabs.length} slabs
          </PrimitiveText>
        )}
      </div>

      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
        {rule.description}
      </PrimitiveText>

      <TagRow rule={rule} />

      <RuleFoot
        lead={`${rule.mode} · ${rule.effective}`}
        rule={rule}
        className="mt-auto pt-2.5"
        style={FOOT_STYLE}
      />
    </article>
  )
}
