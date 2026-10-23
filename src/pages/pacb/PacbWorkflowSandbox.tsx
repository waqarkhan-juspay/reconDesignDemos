/**
 * A page to tinker with, built up step by step from the PACB Figma file: the page header
 * ("Settlement ID - 3", node 46:13581), then the settlements list down the left (node
 * 39:34902). Changes here do not touch the real pages. Delete this file and its row in
 * routes.ts / router.tsx when done.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  InputSizeV2,
  MultiSelectV2,
  MultiSelectV2Size,
  TextInputV2,
  ThemeProvider,
  type DateRange,
  type MultiSelectV2GroupType,
} from '@juspay/blend-design-system'
import { ArrowLeft, ChevronDown, ListFilter, Search } from 'lucide-react'
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import { PAGE_EASING, PAGE_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { ghostIconTokens, filterChipTokens } from '../../theme'
import { HAIRLINE } from './helpers'
import { HoverCopy, InfoButton, PageTitle, RangePicker } from './kit'
import { routeDescription } from './routes'
import { PaymentCard, type MerchantPayment } from './PaymentCard'
import { PaymentDetailV3 } from './PaymentDetailV3'
import { FilterPanel } from './FilterPanel'
import { useSearchShortcut } from './use-search-shortcut'
import { useWorkflowDials } from './workflow-layout'
import { Overview } from './overview-panes'
import type { Settlement } from './SettlementCard'
import { SettlementCardV2, SettlementToneDot } from './SettlementCardV2'
import {
  filterSettlements,
  groupByDay,
  lastDays,
  NO_PAYMENT_FILTERS,
  PAYMENT_STATUS_OPTIONS,
  paymentFilterGroups,
  paymentsOf,
  paymentsShown,
  PAYOUT_OPTIONS,
  type PaymentFilters,
  SETTLEMENTS,
  STATUS_OPTIONS,
} from './settlements'

const { colors } = FOUNDATION_THEME

/**
 * The filter-lines button beside the two filter chips. Hidden on 2026-10-07 until what it
 * opens is decided — flip to `true` to bring it back.
 */
const SHOW_MORE_FILTERS = false

/**
 * The filter chips — Filters over the settlements, Status over the payments. Taken off the
 * page on 2026-10-07; flip to `true` to bring both back.
 */
const SHOW_LIST_FILTERS = false

/**
 * The page header as the design draws it: full-bleed with a hairline under it, rather than
 * PacbPage's inset title, and the settlement search on the right.
 *
 * ⌘K / Ctrl+K focuses the search (useSearchShortcut, shared with Version 3). The field does
 * not spell the shortcut out.
 */
function PageHeader({
  title,
  description,
  query,
  onQueryChange,
  range,
  onRangeChange,
  filter,
}: {
  title: string
  description: string
  query: string
  onQueryChange: (query: string) => void
  range: DateRange
  onRangeChange: (range: DateRange) => void
  /** The Filter button, between the search and the range as the design orders them. */
  filter: ReactNode
}) {
  const searchRef = useSearchShortcut()

  return (
    <header
      className="flex min-h-10 flex-wrap items-center justify-between gap-3 px-6 py-5"
      style={{ borderBottom: HAIRLINE }}
    >
      <PageTitle title={title} description={description} />
      {/* Search, Filter, then the range — the design's order (node 88:47578). The range is
          the Payment Info Generator's picker behind a ButtonV2, so it matches Filter. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-80">
          <TextInputV2
            ref={searchRef}
            size={InputSizeV2.MD}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search settlements and payments"
            aria-label="Search by settlement ID or payment ID"
            leftSlot={{ slot: <Search size={16} color={colors.gray[400]} />, maxHeight: 16 }}
          />
        </div>
        {filter}
        <RangePicker value={range} onChange={onRangeChange} asButton />
      </div>
    </header>
  )
}

// ─── Settlements list ────────────────────────────────────────────────────────────────────

/** Toggles one value in a multi-select's list — how MultiSelectV2 reports a row click. */
const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value]

/**
 * A filter's trigger: a dashed pill naming the filter, then — once it is set — the value it
 * is set to in place of the name ("Failed", or "Failed +1" past one).
 *
 * blend-gap: Blend has no filter-chip trigger. MultiSelectV2's own trigger is a form field,
 * and ButtonV2 has no dashed variant, so this is a plain button on the button tokens' values
 * (radius 10, gray[200] hairline, the sm shadow). MultiSelectV2 mounts it through Radix's
 * `asChild`, which hands it a ref and its open/close props — hence the spread.
 */
function FilterChip({
  label,
  picked,
  ref,
  ...trigger
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  picked: string[]
  ref?: Ref<HTMLButtonElement>
}) {
  const active = picked.length > 0
  // Once set, the chip shows what it is set to, not the filter's name — the values say which
  // filter they belong to. Past one, the first and how many more.
  const text = !active
    ? label
    : picked.length === 1
      ? picked[0]
      : `${picked[0]} +${picked.length - 1}`
  return (
    <button
      ref={ref}
      type="button"
      {...trigger}
      // The name leaves the visible text once set; a screen reader still hears it.
      aria-label={active ? `${label}: ${picked.join(', ')}` : undefined}
      // py 5 + 20 + the 1px hairline twice = 32, the design's height.
      className="flex shrink-0 cursor-pointer items-center gap-2 px-4 py-[5px] hover:bg-[var(--chip-hover)]"
      style={{
        background: colors.gray[0],
        border: `${FOUNDATION_THEME.border.width[1]} ${active ? 'solid' : 'dashed'} ${
          active ? colors.gray[300] : colors.gray[200]
        }`,
        borderRadius: FOUNDATION_THEME.border.radius[10],
        boxShadow: FOUNDATION_THEME.shadows.sm,
        ['--chip-hover' as string]: colors.gray[25],
      }}
    >
      <PrimitiveText
        as="span"
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={active ? colors.gray[700] : colors.gray[400]}
      >
        {text}
      </PrimitiveText>
      <ChevronDown size={14} color={colors.gray[400]} aria-hidden />
    </button>
  )
}

type FilterOption = { value: string; label: string }

/**
 * A dashed-pill filter over a fixed set of options — one list, or several under their own
 * headings (`groups`), which MultiSelectV2 draws with a label and a separator each. Values
 * must be unique across groups: the selection is one list.
 */
function FilterSelect({
  label,
  groups,
  selected,
  onChange,
}: {
  label: string
  groups: { label?: string; options: FilterOption[] }[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  const items: MultiSelectV2GroupType[] = groups.map(({ label: groupLabel, options }, i) => ({
    groupLabel,
    items: options,
    showSeparator: i < groups.length - 1,
  }))
  const picked = groups
    .flatMap(({ options }) => options)
    .filter(({ value }) => selected.includes(value))
    .map((o) => o.label)
  return (
    <MultiSelectV2
      label=""
      aria-label={label}
      placeholder={label}
      // SM is the 32px box the chip is — MD would hold it in a 36px one, 4px taller than
      // the design's filter row.
      size={MultiSelectV2Size.SM}
      items={items}
      selectedValues={selected}
      // A row toggles one value; the clear button hands back the whole list.
      onChange={(next) => onChange(Array.isArray(next) ? next : toggle(selected, next))}
      customTrigger={<FilterChip label={label} picked={picked} />}
    />
  )
}

/**
 * A column's header: its title, then — while SHOW_LIST_FILTERS is on — its filter chip and
 * the filter-lines button. Both columns' headers are this, so their dividers line up.
 */
function ColumnHeader({
  filter,
  moreFiltersLabel,
  children,
}: {
  filter: ReactNode
  moreFiltersLabel: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 px-6 py-5" style={{ borderBottom: HAIRLINE }}>
      {children}
      {SHOW_LIST_FILTERS && (
        <div className="flex items-center justify-between gap-2">
          <ThemeProvider componentTokens={filterChipTokens}>{filter}</ThemeProvider>
          {/* Drawn as the design has it; what it opens is not specified yet. */}
          {SHOW_MORE_FILTERS && (
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              subType={ButtonV2SubType.ICON_ONLY}
              size={ButtonV2Size.SMALL}
              leftSlot={{ slot: <ListFilter size={14} />, maxHeight: 14 }}
              aria-label={moreFiltersLabel}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A list card bound to its own ID. Memoised with the page's stable `onSelect(id)`, so a click
 * or a keystroke re-renders only the cards whose props changed, not the whole list.
 */
const SelectableSettlement = memo(function SelectableSettlement({
  settlement,
  onSelect,
  ...card
}: {
  settlement: Settlement
  selected: boolean
  compactSuccess: boolean
  onSelect: (settlementId: string) => void
}) {
  return (
    <SettlementCardV2
      settlement={settlement}
      onSelect={() => onSelect(settlement.settlementId)}
      {...card}
    />
  )
})

/**
 * All Settlements — the list down the left of the page (node 39:34902): a header with the
 * filters, then the settlements newest first in Today / Yesterday / Older, each a
 * SettlementCardV2 (built in Playground → Settlement Cards). The list scrolls on its own; the
 * header stays.
 */
const SettlementList = memo(function SettlementList({
  settlements,
  compactSuccess,
  cardGap,
  selectedId,
  onSelect,
  onInfo,
  hidden = false,
  bodyClassName = '',
}: {
  /** Already narrowed by the page's search, range and Filter panel. */
  settlements: Settlement[]
  /** The heading's ⓘ: back to the period's Overview. */
  onInfo: () => void
  /**
   * Out of sight while a settlement is drilled into ("Drill in" dial). Hidden rather than
   * unmounted, so back finds the list scrolled where you left it, chips and all.
   */
  hidden?: boolean
  /** The drill-in return, put on the cards — the header above them stays still. */
  bodyClassName?: string
  compactSuccess: boolean
  /** Px between a group's cards — the "Card gap" dial. The heading keeps its 16. */
  cardGap: number
  selectedId: string | null
  onSelect: (settlementId: string) => void
}) {
  // One selection for both groups in the Filters menu, split back out by which group each
  // value belongs to.
  const [filters, setFilters] = useState<string[]>([])
  const groups = useMemo(() => {
    const statuses = filters.filter((v) => STATUS_OPTIONS.some((o) => o.value === v))
    const payouts = filters.filter((v) => PAYOUT_OPTIONS.some((o) => o.value === v))
    // The list's own chips, on top of what the page has already filtered.
    const chipped =
      statuses.length || payouts.length
        ? filterSettlements(settlements, { statuses, payouts })
        : settlements
    return groupByDay(chipped)
  }, [settlements, filters])

  return (
    <aside
      aria-label="All Settlements"
      hidden={hidden}
      // overflow-hidden clips the cards as they slide in, so they come from the column's edge.
      className={`w-[420px] shrink-0 flex-col gap-1 overflow-hidden ${hidden ? 'hidden' : 'flex'}`}
      style={{ borderRight: HAIRLINE }}
    >
      <ColumnHeader
        moreFiltersLabel="More filters"
        filter={
          <FilterSelect
            label="Filters"
            groups={[
              { label: 'Status', options: STATUS_OPTIONS },
              { label: 'Merchant Payment Status', options: PAYOUT_OPTIONS },
            ]}
            selected={filters}
            onChange={setFilters}
          />
        }
      >
        <div className="flex min-h-6 items-center justify-between gap-2">
          <PrimitiveText
            as="h2"
            {...font(FOUNDATION_THEME.font.size.body.lg)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            All Settlements
            {/* Everything the search, range and Filter panel leave — the day groups' counts
                add up to it. */}
            <span
              style={{ color: colors.gray[400], fontWeight: FOUNDATION_THEME.font.weight[500] }}
            >{` · ${settlements.length}`}</span>
          </PrimitiveText>
          {/* Version 3's ⓘ at the row's far end, as in the payments column beside it;
              `-my-[6px]` keeps the 36px button inside the 24px row. */}
          <span className="-my-[6px] -mr-[9px] flex shrink-0">
            <InfoButton label="Show the figures for all settlements" onClick={onInfo} />
          </span>
        </div>
      </ColumnHeader>

      <div className={`min-h-0 flex-1 overflow-y-auto p-6 ${bodyClassName}`}>
        {groups.length === 0 ? (
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
            No settlements match these filters.
          </PrimitiveText>
        ) : (
          <div className="flex flex-col gap-9">
            {groups.map(({ label, rows }) => (
              <section key={label} aria-label={label} className="flex flex-col gap-4">
                {/* Sticks to the top of the column while its group scrolls under it, and the
                    next group's heading pushes it off — so you always know which day you are
                    in, and how many are in it. White, edge to edge (`-mx-6`), and above the
                    cards' select overlays (z-10), so nothing shows through.

                    `-top-6` because sticky offsets count from inside the column's 24px
                    padding: at 0 it would stop 24px down with cards showing above it. The
                    padding pairs (`pt-6`/`-mt-6`, `pb-2`/`-mb-2`) give it a white band without
                    moving the layout. The top pair matches that 24px, so the label sticks
                    exactly where it rests — 24px from the top — and never moves on the way. */}
                <div
                  className="sticky -top-6 z-20 -mx-6 -mt-6 -mb-2 px-6 pt-6 pb-2"
                  style={{ background: colors.gray[0] }}
                >
                  <PrimitiveText
                    as="h3"
                    {...font(FOUNDATION_THEME.font.size.body.md)}
                    color={colors.gray[500]}
                  >
                    {label.toUpperCase()}
                    <span style={{ color: colors.gray[400] }}>{` · ${rows.length}`}</span>
                  </PrimitiveText>
                </div>
                <div className="flex flex-col" style={{ gap: cardGap }}>
                  {rows.map((settlement) => (
                    <SelectableSettlement
                      key={settlement.settlementId}
                      settlement={settlement}
                      selected={settlement.settlementId === selectedId}
                      onSelect={onSelect}
                      compactSuccess={compactSuccess}
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

// ─── Merchant payments ───────────────────────────────────────────────────────────────────

/**
 * The selected settlement's merchant payments — the column beside the list (node 39:34927).
 * A header naming the settlement in full with its status dot, a Status filter, then the
 * payments as PaymentCard rows (built in Playground → Payment Card), flush, scrolling on
 * their own. Click a row to select it.
 *
 * Keyed on the settlement by its caller, so the filter and the selected row start fresh for
 * each settlement rather than carrying over to payments they never referred to.
 */
/** A payment row bound to its index — memoised for the reason SelectableSettlement is. */
const SelectablePayment = memo(function SelectablePayment({
  payment,
  index,
  selected,
  onSelect,
}: {
  payment: MerchantPayment
  index: number
  selected: boolean
  onSelect: (index: number) => void
}) {
  return <PaymentCard payment={payment} selected={selected} onSelect={() => onSelect(index)} />
})

const PaymentList = memo(function PaymentList({
  settlement,
  paymentFilters,
  query,
  selectedIndex,
  onSelect,
  onBack,
  onInfo,
}: {
  settlement: Settlement
  /** The heading's ⓘ: clears the payment, back to the settlement's own figures. */
  onInfo: () => void
  /**
   * Drill-in mode: the list is hidden and this column stands in its place — as wide, with a
   * back button and the settlement's ID as its heading where "All Settlements" was.
   */
  onBack?: () => void
  /** The Filter panel's choices and the page search — see paymentsShown in settlements.ts. */
  paymentFilters: PaymentFilters
  query: string
  /** Index into the settlement's payments — IDs can repeat in the demo data, positions cannot. */
  selectedIndex: number | null
  onSelect: (index: number) => void
}) {
  const payments = paymentsOf(settlement)
  const positions = useMemo(() => new Map(payments.map((p, i) => [p, i])), [payments])
  const [statuses, setStatuses] = useState<string[]>([])
  const matching = paymentsShown(settlement, paymentFilters, query)
  const shown = statuses.length
    ? matching.filter(({ status }) => statuses.includes(status))
    : matching

  return (
    <section
      aria-label={`Merchant payments for ${settlement.settlementId}`}
      className={`flex shrink-0 flex-col overflow-hidden ${onBack ? 'w-[420px]' : 'w-[360px]'}`}
      style={{ borderRight: HAIRLINE }}
    >
      <ColumnHeader
        moreFiltersLabel="More payment filters"
        filter={
          <FilterSelect
            label="Status"
            groups={[{ options: PAYMENT_STATUS_OPTIONS }]}
            selected={statuses}
            onChange={setStatuses}
          />
        }
      >
        {/* A 24px row, the height of the list header's title beside it, so the two columns'
            dividers stay on one line now that both headers pad 20px. */}
        <div className="group/row flex min-h-6 min-w-0 items-center gap-1">
          {onBack && (
            // Back to the list, borderless (ghostIconTokens). `-my-[5px]` keeps the 34px
            // button inside the 24px row, so the header stays as tall as the list's and the
            // dividers line up.
            <span className="-my-[5px] mr-1 flex shrink-0">
              <ThemeProvider componentTokens={ghostIconTokens}>
                <ButtonV2
                  buttonType={ButtonV2Type.SECONDARY}
                  subType={ButtonV2SubType.INLINE}
                  size={ButtonV2Size.SMALL}
                  leftSlot={{ slot: <ArrowLeft size={14} />, maxHeight: 14 }}
                  aria-label="Back to All Settlements"
                  onClick={onBack}
                />
              </ThemeProvider>
            </span>
          )}
          <SettlementToneDot settlement={settlement} />
          {/* Drilled in, the ID takes the list heading's place — and its size and weight. */}
          <PrimitiveText
            as="h2"
            {...font(FOUNDATION_THEME.font.size.body[onBack ? 'lg' : 'md'])}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[onBack ? 600 : 500]}
            truncate
          >
            {settlement.settlementId}
          </PrimitiveText>
          <HoverCopy value={settlement.settlementId} label="Settlement ID" size={14} />
          {/* Version 3's ⓘ at the row's far end; `-my-[6px]` keeps it inside the 24px row. */}
          <span className="-my-[6px] -mr-[9px] ml-auto flex shrink-0">
            <InfoButton
              label={`Show the figures for settlement ${settlement.settlementId}`}
              onClick={onInfo}
            />
          </span>
        </div>
      </ColumnHeader>

      {/* Drilled in, only the payments slide in — the header swaps in place. */}
      <div className={`min-h-0 flex-1 overflow-y-auto ${onBack ? 'drill-forward' : ''}`}>
        {shown.length === 0 ? (
          <div className="p-6">
            <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
              No payments match this filter.
            </PrimitiveText>
          </div>
        ) : (
          shown.map((payment) => {
            // Its place in the full list, not the filtered one, so a filter change keeps the
            // same row selected.
            const index = positions.get(payment)!
            return (
              <SelectablePayment
                key={index}
                payment={payment}
                index={index}
                selected={selectedIndex === index}
                onSelect={onSelect}
              />
            )
          })
        )}
      </div>
    </section>
  )
})

/**
 * The right-hand column: the selected payment's detail, or — until one is picked — the
 * settlement's own figures. Takes the rest of the width and scrolls on its own, like the
 * columns before it.
 *
 * Since 2026-10-21 this is Version 3's panel (PaymentDetailV3): the payment's figures in a
 * still strip, then a collapsible row per step, in place of the stepper over cards.
 */
const PaymentPanel = memo(function PaymentPanel({
  settlement,
  paymentIndex,
}: {
  settlement: Settlement
  paymentIndex: number | null
}) {
  const payment = paymentIndex === null ? undefined : paymentsOf(settlement)[paymentIndex]
  return (
    // The panel scrolls its own rows under a still strip, so this only gives it the room.
    <section
      aria-label="Payment detail"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      style={{ background: colors.gray[0] }}
    >
      <PaymentDetailV3 settlement={settlement} payment={payment ?? null} />
    </section>
  )
})

/** The PACB Workflow: settlements, their merchant payments, and the selected payment. */
function PacbWorkflowSandbox() {
  const { successCard, columns, cardGap } = useWorkflowDials()
  const [query, setQuery] = useState('')
  // A month back from today: the demo settlements are dated relative to now (settlements.ts).
  const [range, setRange] = useState<DateRange>(() => lastDays(30))
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>(NO_PAYMENT_FILTERS)
  const drillIn = columns === 'drill-in'
  // Nothing is picked on arrival: the right-hand columns open on the Overview.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // The payment, by its place in its settlement's list. Held with the settlement it belongs
  // to, so selecting another settlement leaves no payment selected — an index means nothing
  // against another settlement's payments.
  const [picked, setPicked] = useState<{ settlementId: string; index: number } | null>(null)
  const paymentIndex = picked?.settlementId === selectedId ? picked.index : null
  const selected = SETTLEMENTS.find(({ settlementId }) => settlementId === selectedId)
  // Stable per settlement, so the memoized columns re-render only when their own props change.
  // Clicking the open settlement again closes it, back to the Overview.
  const selectSettlement = useCallback(
    (settlementId: string) =>
      setSelectedId((current) => (current === settlementId ? null : settlementId)),
    [],
  )
  // Set by the first back: from then on the list animates in each time it reappears. Not
  // before, so the page does not slide its list in on arrival.
  const [cameBack, setCameBack] = useState(false)
  const closeToOverview = useCallback(() => setSelectedId(null), [])
  const clearPayment = useCallback(() => setPicked(null), [])
  const closeSettlement = useCallback(() => {
    setSelectedId(null)
    setCameBack(true)
  }, [])
  // What the list shows, and what the Overview counts.
  const shown = useMemo(
    () => filterSettlements(SETTLEMENTS, { query, range, payments: paymentFilters }),
    [query, range, paymentFilters],
  )
  // The Filter panel's values: what the payments in the range carry, whatever else is set.
  const filterGroups = useMemo(
    () => paymentFilterGroups(filterSettlements(SETTLEMENTS, { range })),
    [range],
  )
  const selectPayment = useCallback(
    (index: number) => {
      if (selectedId) setPicked({ settlementId: selectedId, index })
    },
    [selectedId],
  )

  // Full height, so each column scrolls inside itself under a still header rather than the
  // whole page scrolling.
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col"
      style={{ ['--drill-ms' as string]: `${PAGE_MS}ms`, ['--drill-ease' as string]: PAGE_EASING }}
    >
      <PageHeader
        title="PACB Workflow"
        description={routeDescription('PACB Workflow')}
        query={query}
        onQueryChange={setQuery}
        range={range}
        onRangeChange={setRange}
        filter={
          <FilterPanel groups={filterGroups} value={paymentFilters} onApply={setPaymentFilters} />
        }
      />
      <div className="flex min-h-0 flex-1">
        <SettlementList
          settlements={shown}
          compactSuccess={successCard === 'compact'}
          cardGap={cardGap}
          selectedId={selectedId}
          onSelect={selectSettlement}
          // Closes the open settlement, so the right-hand columns show the Overview again.
          onInfo={closeToOverview}
          hidden={drillIn && Boolean(selected)}
          bodyClassName={drillIn && cameBack ? 'drill-back' : ''}
        />
        {selected ? (
          <>
            <PaymentList
              key={selected.settlementId}
              settlement={selected}
              paymentFilters={paymentFilters}
              query={query}
              selectedIndex={paymentIndex}
              onSelect={selectPayment}
              onBack={drillIn ? closeSettlement : undefined}
              onInfo={clearPayment}
            />
            <PaymentPanel settlement={selected} paymentIndex={paymentIndex} />
          </>
        ) : (
          <Overview settlements={shown} />
        )}
      </div>
    </div>
  )
}

export default PacbWorkflowSandbox
