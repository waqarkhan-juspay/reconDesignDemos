/**
 * The PACB Workflow sandbox's "Version 3" view, picked on the View dial (workflow-layout.ts).
 * PACB Figma, section 113:31935 — four frames of one flow:
 *
 * 1. Arrival (113:30799): the settlements on the left, the right panel empty. The design's
 *    annotation asks for the period's hero figures there, so it shows the Overview cards.
 * 2. A settlement picked (113:29664): its merchant payments open as a column in the panel.
 * 3. A payment picked (113:24832): its detail fills the rest — files and reports, collapsed.
 *    Each section holds the current view's card content.
 * 4. A section opened (113:28410): the same, with one section expanded.
 *
 * The header is the design's: the search ("⌘ + K" focuses it), Filter, and the range. The
 * search, range and Filter narrow the list exactly as they do in the current view.
 *
 * blend-gap: Blend has no page header or list layout; this is Tailwind layout around Blend
 * inputs and buttons, with the cards and panes composed in their own files.
 */

import { FOUNDATION_THEME, InputSizeV2, TextInputV2 } from '@juspay/blend-design-system'
import type { DateRange } from '@juspay/blend-design-system'
import { Search } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import { font, PrimitiveText } from '../../primitives'
import { FilterPanel, type FilterGroup } from './FilterPanel'
import { LOOKS, type SettlementCardLook } from './settlement-card-looks'
import { HAIRLINE } from './helpers'
import { InfoButton, PageTitle, RangePicker } from './kit'
import { useSearchShortcut } from './use-search-shortcut'
import { Overview } from './overview-panes'
import { PaymentDetailV3 } from './PaymentDetailV3'
import { PaymentListV3 } from './PaymentListV3'
import { routeDescription } from './routes'
import type { Settlement } from './SettlementCard'
import { SettlementCardV3 } from './SettlementCardV3'
import {
  filterSettlements,
  groupByDay,
  lastDays,
  NO_PAYMENT_FILTERS,
  paymentFilterGroups,
  paymentsShown,
  type PaymentFilters,
  SETTLEMENTS,
} from './settlements'

const { colors } = FOUNDATION_THEME

const BODY = FOUNDATION_THEME.font.size.body.md

export function PacbWorkflowV3({
  cardLook = 'plain',
}: {
  /** The "Version 3 — Settlement card" dial (workflow-layout.ts). */
  cardLook?: SettlementCardLook
}) {
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<DateRange>(() => lastDays(30))
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>(NO_PAYMENT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Held with its settlement, so picking another settlement leaves no payment picked.
  const [picked, setPicked] = useState<{ settlementId: string; paymentId: string } | null>(null)

  const shown = useMemo(
    () => filterSettlements(SETTLEMENTS, { query, range, payments: paymentFilters }),
    [query, range, paymentFilters],
  )
  const filterGroups = useMemo(
    () => paymentFilterGroups(filterSettlements(SETTLEMENTS, { range })),
    [range],
  )

  const selected = SETTLEMENTS.find(({ settlementId }) => settlementId === selectedId)
  const payments = useMemo(
    () => (selected ? paymentsShown(selected, paymentFilters, query) : []),
    [selected, paymentFilters, query],
  )
  const paymentId = picked?.settlementId === selectedId ? picked.paymentId : null
  const payment = payments.find((row) => row.paymentId === paymentId) ?? null

  // Clicking the open settlement again closes it, back to the Overview.
  const selectSettlement = useCallback(
    (settlementId: string) =>
      setSelectedId((current) => (current === settlementId ? null : settlementId)),
    [],
  )
  const selectPayment = useCallback(
    (id: string) => {
      if (selectedId) setPicked({ settlementId: selectedId, paymentId: id })
    },
    [selectedId],
  )

  const clearPayment = useCallback(() => setPicked(null), [])
  const closeSettlement = useCallback(() => setSelectedId(null), [])

  // Full height, so each column scrolls inside itself under a still header.
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Header
        query={query}
        onQueryChange={setQuery}
        range={range}
        onRangeChange={setRange}
        filterGroups={filterGroups}
        paymentFilters={paymentFilters}
        onPaymentFiltersChange={setPaymentFilters}
      />
      <div className="flex min-h-0 flex-1">
        <SettlementList
          settlements={shown}
          selectedId={selectedId}
          onSelect={selectSettlement}
          // Closes the open settlement, so the panel shows the period's Overview again.
          onInfo={closeSettlement}
          cardLook={cardLook}
        />
        {/* The panel (node 113:30883): 8px above, 12px below, open on the right where it
            runs into the window's edge. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-2 pb-3">
          <div
            className="flex min-h-0 flex-1 overflow-hidden"
            style={{
              background: colors.gray[0],
              borderStyle: 'solid',
              borderColor: colors.gray[200],
              borderWidth: `${FOUNDATION_THEME.border.width[1]} 0 ${FOUNDATION_THEME.border.width[1]} ${FOUNDATION_THEME.border.width[1]}`,
              borderRadius: `${FOUNDATION_THEME.border.radius[16]} 0 0 ${FOUNDATION_THEME.border.radius[16]}`,
              boxShadow: FOUNDATION_THEME.shadows.md,
            }}
          >
            {selected ? (
              <>
                <PaymentListV3
                  key={selected.settlementId}
                  settlement={selected}
                  payments={payments}
                  selectedId={paymentId}
                  onSelect={selectPayment}
                  // Clears the payment, so the panel shows the settlement's figures again.
                  onInfo={clearPayment}
                />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <PaymentDetailV3 settlement={selected} payment={payment} />
                </div>
              </>
            ) : (
              <Overview settlements={shown} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The page header (node 113:28421): title and description on the left; the search, Filter
 * and range on the right, 16px apart. No rule under it — the panel's own edge does that job.
 */
function Header({
  query,
  onQueryChange,
  range,
  onRangeChange,
  filterGroups,
  paymentFilters,
  onPaymentFiltersChange,
}: {
  query: string
  onQueryChange: (query: string) => void
  range: DateRange
  onRangeChange: (range: DateRange) => void
  filterGroups: FilterGroup<keyof PaymentFilters>[]
  paymentFilters: PaymentFilters
  onPaymentFiltersChange: (next: PaymentFilters) => void
}) {
  const searchRef = useSearchShortcut()

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-5 pr-6 pl-5">
      <PageTitle title="PACB Workflow" description={routeDescription('PACB Workflow')} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-full sm:w-80">
          <TextInputV2
            ref={searchRef}
            size={InputSizeV2.MD}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search settlements & payments"
            aria-label="Search by settlement ID or payment ID"
            leftSlot={{ slot: <Search size={16} color={colors.gray[400]} />, maxHeight: 16 }}
            rightSlot={{
              slot: (
                <PrimitiveText {...font(BODY)} color={colors.gray[400]}>
                  ⌘ + K
                </PrimitiveText>
              ),
              maxHeight: 20,
            }}
          />
        </div>
        <FilterPanel
          groups={filterGroups}
          value={paymentFilters}
          onApply={onPaymentFiltersChange}
        />
        <RangePicker value={range} onChange={onRangeChange} asButton />
      </div>
    </header>
  )
}

/**
 * All Settlements (node 113:28445): a 420px column, its heading still, the day groups
 * scrolling under it — the label 16px over its cards, 6px between cards, 24px between groups.
 */
// Memoised with stable props (the page's `shown`, `selectedId`, callbacks and look), so a
// keystroke, a payment click or a payment's own state redraws no card it does not touch.
const SettlementList = memo(function SettlementList({
  settlements,
  selectedId,
  onSelect,
  onInfo,
  cardLook,
}: {
  settlements: Settlement[]
  selectedId: string | null
  onSelect: (settlementId: string) => void
  /** The heading's info button: back to the period's Overview. */
  onInfo: () => void
  cardLook: SettlementCardLook
}) {
  const groups = useMemo(() => groupByDay(settlements), [settlements])
  return (
    <aside aria-label="All Settlements" className="flex w-[420px] shrink-0 flex-col">
      <div className="flex items-center p-5">
        <PrimitiveText
          as="h2"
          {...font(FOUNDATION_THEME.font.size.body.lg)}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          All Settlements
        </PrimitiveText>
        {/* The payments column's info button, here for the whole list. Held to the heading's
            24px line (the button overflows it, centred), and pulled in beside the title. */}
        <span className="-mr-1.5 ml-[-4px] flex h-6 shrink-0 items-center">
          <InfoButton label="Show the figures for all settlements" onClick={onInfo} />
        </span>
        {/* Everything the search, range and Filter leave — the day groups add up to it. */}
        <PrimitiveText
          as="span"
          {...font(FOUNDATION_THEME.font.size.body.lg)}
          color={colors.gray[400]}
        >{`⋅ ${settlements.length}`}</PrimitiveText>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-6">
        {groups.length === 0 ? (
          <PrimitiveText {...font(BODY)} color={colors.gray[500]}>
            No settlements match.
          </PrimitiveText>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(({ label, rows }) => (
              <section key={label} aria-label={label} className="flex flex-col gap-4">
                <PrimitiveText as="h3" {...font(BODY)} color={colors.gray[500]}>
                  {label.toUpperCase()}
                </PrimitiveText>
                <div
                  // Divider lines go between the cards, not round them.
                  className={`flex flex-col ${LOOKS[cardLook].divided ? '[&>*+*]:[border-top:var(--divider)]' : ''}`}
                  style={{ gap: LOOKS[cardLook].gap, ['--divider' as string]: HAIRLINE }}
                >
                  {rows.map((settlement) => (
                    <SelectableSettlement
                      key={settlement.settlementId}
                      settlement={settlement}
                      selected={settlement.settlementId === selectedId}
                      onSelect={onSelect}
                      look={cardLook}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
})

/** A card bound to its own ID, so the list hands every card the one stable `onSelect(id)`. */
const SelectableSettlement = memo(function SelectableSettlement({
  settlement,
  onSelect,
  ...card
}: {
  settlement: Settlement
  selected: boolean
  onSelect: (settlementId: string) => void
  look: SettlementCardLook
}) {
  return (
    <SettlementCardV3
      settlement={settlement}
      onSelect={() => onSelect(settlement.settlementId)}
      dateFirst
      {...card}
    />
  )
})
