/**
 * Layout 1's rule — Figma's "Fee Ticket / Blend" (node 2264:5828): a rate stub, a
 * perforation, and the rule's detail beside it.
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
import { font, PrimitiveText } from '../../primitives'
import { PANEL_STYLE } from '../pacb/helpers'
import type { FeeRule } from './data'
import { NeutralTag, RuleFoot, RuleHeader, TagRow } from './tags'

const { colors } = FOUNDATION_THEME

/**
 * The stub: the number you came to read. Centred in its own 180px column on gray[25], which
 * is what makes it a stub rather than a first line — the tint and the perforation beside it
 * do the work that a heading weight would otherwise have to.
 */
function RateStub({ rule }: { rule: FeeRule }) {
  return (
    <div
      className="flex h-full w-[180px] shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden px-3.5 py-[18px]"
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
  return (
    <article className="flex items-stretch overflow-hidden" style={PANEL_STYLE}>
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
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
          {rule.description}
        </PrimitiveText>
        <TagRow rule={rule} />
        <RuleFoot lead={rule.effective} rule={rule} />
      </div>
    </article>
  )
}
