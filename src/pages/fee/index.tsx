/**
 * Fee → Pricing Rules — the ticket rows of Figma frame 2268:7289.
 *
 * Two alternative layouts are built beside it (2268:8499 and 2268:9641) and reachable from
 * the Fee Layout dial, which is where comparing them belongs; the page itself opens on the
 * tickets and offers no switch (fee-layout.ts).
 *
 * Search filters on everything a rule says it covers — its name, what it charges for, the
 * acquirers and the methods — rather than on the name alone, because "UPI" or "Razorpay" is
 * what you would actually type when hunting for a rule you did not name. The field is drawn
 * here for the two grids and inside the list for the split view, which is where that layout
 * puts it.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
} from '@juspay/blend-design-system'
import { Plus } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactElement } from 'react'
import { FEEDBACK_EASING, FEEDBACK_MS } from '../../motion'
import { PacbPage } from '../pacb/kit'
import { FEE_RULES, matchesQuery, type FeeRule } from './data'
import { FeeCard } from './FeeCard'
import { useFeeDials, type FeeLayout } from './fee-layout'
import { FeeGroup, FeePaged } from './FeeGroup'
import { FeeSplit } from './FeeSplit'
import { FeeTicket } from './FeeTicket'
import { Empty, RuleSearch } from './tags'

/** 16px between the title row, the search row and the rules — the design's rhythm. */
const PAGE_SPACING = { top: 24, gap: 16, bottom: 24 }

/** The search field's width in the design. */
const SEARCH_WIDTH = 350

/** The + on the page's one primary action. */
const CTA_ICON_SIZE = 16

/**
 * The slab table's reveal, handed to the stylesheet as custom properties so rule 14 keeps one
 * source of truth and index.css holds no second copy of the numbers.
 */
const MOTION = {
  '--slab-reveal': `${FEEDBACK_MS}ms`,
  '--slab-reveal-ease': FEEDBACK_EASING,
} as CSSProperties

/** The layouts that are a grid of cards — every one but the split view, which owns its page. */
type GridLayout = Exclude<FeeLayout, 'v3'>

/**
 * What each grid layout is: its columns, which gap dial sizes it, and what it draws a rule as.
 *
 * A table rather than a branch, so adding a layout is a row here and a row in `LAYOUTS`
 * (fee-layout.ts) — and so that forgetting this row is `TS2741` at build time rather than a
 * version switch that silently renders the previous layout.
 */
const GRIDS: Record<
  GridLayout,
  { columns: string; gap: 'ticketGap' | 'cardGap'; Card: (props: { rule: FeeRule }) => ReactElement }
> = {
  // One column below `lg`, because a 653px ticket in half of a tablet is a ticket whose stub
  // and body are both too narrow to read.
  v1: { columns: 'grid-cols-1 lg:grid-cols-2', gap: 'ticketGap', Card: FeeTicket },
  // Three equal columns across the page's full width, rather than Figma's 1060px grid
  // floating in a 1320px frame: the cards grow to fill the row instead of leaving a column of
  // empty page beside them.
  v2: { columns: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3', gap: 'cardGap', Card: FeeCard },
  // Two columns like layout 1, which this frame is a variation of — 640px against its 653,
  // and the same reason for collapsing to one below `lg`.
  v4: { columns: 'grid-cols-1 lg:grid-cols-2', gap: 'ticketGap', Card: FeeGroup },
  // Layout 4's grid: same frame, same width, and the pager changes only what is in the
  // body's corner.
  v5: { columns: 'grid-cols-1 lg:grid-cols-2', gap: 'ticketGap', Card: FeePaged },
}

function Rules({
  rules,
  layout,
  gaps,
}: {
  rules: FeeRule[]
  layout: GridLayout
  gaps: Record<'ticketGap' | 'cardGap', number>
}) {
  const { columns, gap, Card } = GRIDS[layout]
  return (
    <div className={`grid ${columns}`} style={{ gap: gaps[gap] }}>
      {rules.map((rule) => (
        <Card key={rule.id} rule={rule} />
      ))}
    </div>
  )
}

export default function Fee() {
  const { layout, ticketGap, cardGap } = useFeeDials()
  const [query, setQuery] = useState('')

  const rules = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return FEE_RULES
    return FEE_RULES.filter((rule) => matchesQuery(rule, needle))
  }, [query])

  return (
    <PacbPage
      title="Pricing Rules"
      spacing={PAGE_SPACING}
      actions={
        <ButtonV2
          text="Create Fee Rule"
          buttonType={ButtonV2Type.PRIMARY}
          size={ButtonV2Size.MEDIUM}
          leftSlot={{ slot: <Plus size={CTA_ICON_SIZE} /> }}
        />
      }
    >
      <div style={MOTION} className="contents">
      {layout === 'v3' ? (
        <FeeSplit rules={rules} query={query} onQueryChange={setQuery} />
      ) : (
        <>
          <div style={{ width: SEARCH_WIDTH, maxWidth: '100%' }}>
            <RuleSearch query={query} onChange={setQuery} />
          </div>
          {rules.length === 0 ? (
            <Empty query={query} />
          ) : (
            <Rules rules={rules} layout={layout} gaps={{ ticketGap, cardGap }} />
          )}
        </>
      )}
      </div>
    </PacbPage>
  )
}
