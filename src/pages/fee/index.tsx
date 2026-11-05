/**
 * Fee → Pricing Rules — three layouts of one screen, drawn in Figma as frames 2268:7289,
 * 2268:8499 and 2268:9641. Which one the page shows is a dial and a bar on the page, not a
 * decision baked in here (fee-layout.ts, VersionBar.tsx).
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
import { useMemo, useState, type ReactElement } from 'react'
import { PacbPage } from '../pacb/kit'
import { FEE_RULES, matchesQuery, type FeeRule } from './data'
import { FeeCard } from './FeeCard'
import { useFeeDials, type FeeLayout } from './fee-layout'
import { FeeSplit } from './FeeSplit'
import { FeeTicket } from './FeeTicket'
import { Empty, RuleSearch } from './tags'
import { VersionBar } from './VersionBar'

/**
 * 16px between the title row, the search row and the rules — the design's rhythm. The bottom
 * is the exception: the floating bar sits 24px off the viewport and stands about 40px, so the
 * page keeps enough room under its last row that the bar never covers content at full scroll.
 */
const PAGE_SPACING = { top: 24, gap: 16, bottom: 88 }

/** The search field's width in the design. */
const SEARCH_WIDTH = 350

/** The + on the page's one primary action. */
const CTA_ICON_SIZE = 16

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
  const { layout, ticketGap, cardGap, setLayout } = useFeeDials()
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
      <VersionBar layout={layout} onChange={setLayout} />

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
    </PacbPage>
  )
}
