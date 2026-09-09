import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  FilterType,
  ModalV2,
  SelectorV2Size,
  SortDirection,
  SwitchV2,
  TabsV2,
  TabsV2List,
  TabsV2Size,
  TabsV2Trigger,
  TabsV2Variant,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
  ThemeProvider,
  type ColumnDefinition,
  type ColumnFilter,
  type FilterOption,
  type SortConfig,
} from '@juspay/blend-design-system'
import { useDialKit } from 'dialkit'
import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { FEEDBACK_EASING, MICRO_MS } from '../motion'
import { PrimitiveText, font } from '../primitives'
import { REPORT_CATEGORY_IDS, type Categorised, type ReportCategory } from '../report-config'
import { sectionTabsTokens } from '../theme'

const { colors } = FOUNDATION_THEME

/** The page-level tabs under the title. Labels are the identity — keep them unique. */
const SECTION_TABS = [
  'Report Config',
  'SFTP Config',
  'Schedule Jobs',
  'Configuration Setup',
  'Recon Configs',
  'Query Jobs',
  'SFTP Setup',
  'Settlement Report',
]

/**
 * The filter tabs sitting above the table: the categories themselves, plus an unfiltered
 * "All". The tab label *is* the category, so nothing has to be mapped back — and the list
 * is derived from src/report-config.ts, so a category cannot exist without a tab.
 */
const ALL = 'All'
const FILTER_TABS: (typeof ALL | ReportCategory)[] = [ALL, ...REPORT_CATEGORY_IDS]

const toValue = (label: string) => label.toLowerCase().replace(/\s+/g, '-')

/**
 * `status` is deliberately absent: it is derived from the row's enabled state at render
 * time, so the toggle and the Status cell cannot drift out of sync. `actions` is absent
 * too — that column renders a control, not a value.
 */
type ReportConfigRow = Categorised & {
  id: string
  configurationName: string
  paymentEntity: string
  frequency: string
  channel: string
  createdDate: string
}

/**
 * Every column hugs its content except Configuration Name, which absorbs the slack.
 *
 * The fixed tracks the design specifies (238 / 232 / 134.5) are gone on purpose: they were
 * floors, and a floor is exactly what stops a column hugging. Blend's own type defaults are
 * floors too — TEXT is min 120 / max 250 (utils.ts getTypeBasedDefaults) — so both are
 * overridden below with `0` / `none`, leaving each column free to size to its content.
 *
 * Which column takes the leftover width is not expressible here: getColumnStyles hardcodes
 * `width: 'auto'` on every cell and ignores ColumnDefinition.width entirely. That part is
 * done in index.css against `.reports-config-table`.
 */
const COLUMNS = [
  { field: 'configurationName', header: 'Configuration Name' },
  { field: 'categorySource', header: 'Category/Source' },
  { field: 'sourceType', header: 'Source / Type' },
  { field: 'paymentEntity', header: 'Payment Entity' },
  { field: 'frequency', header: 'Frequency' },
  { field: 'channel', header: 'Channel' },
  { field: 'status', header: 'Status' },
  { field: 'createdDate', header: 'Created Date' },
  { field: 'actions', header: 'Actions' },
] as const

/**
 * The columns whose values are a closed set, and so are worth picking from a list.
 *
 * This is a *type* decision, not a flag: `getColumnTypeConfig` (columnTypes.ts) reads
 * `supportsFiltering` off the ColumnType alone, and TEXT is false — so a TEXT column offers
 * sorting only, however it is configured. SELECT is the type that opens the filter list.
 *
 * Configuration Name, Frequency and Created Date are deliberately not here: a list of ten
 * distinct sentences is not a filter, it is the table again. They stay TEXT, and sortable.
 */
const SELECT_FILTER_FIELDS = ['categorySource', 'sourceType', 'paymentEntity', 'channel']

/** Let content decide the width — see the note above. */
const HUG = { minWidth: '0px', maxWidth: 'none' } as const

/**
 * Nine rows transcribed from the design's populated table (node 4410:25166), plus a tenth
 * written here so the set fills one page of ten. It splits the categories five and five,
 * which is also what makes the filter tabs worth clicking.
 *
 * Status is absent on purpose — it is derived from the row's enabled state (see `data`)
 * rather than transcribed, so the design's Active/Inactive/Paused values are not carried
 * over. Actions is absent for the same reason: that column renders the toggle.
 */
const rows: ReportConfigRow[] = [
  {
    id: 'row-1',
    configurationName: 'Razorpay Monthly Summary',
    categorySource: 'File Summary',
    sourceType: 'Settlement',
    paymentEntity: 'Razorpay',
    frequency: 'Monthly on 19th at 17:15 IST',
    channel: 'Email',
    createdDate: '19th Aug 2026',
  },
  {
    id: 'row-2',
    configurationName: 'Daily Settlement Report',
    categorySource: 'Reconciliation',
    sourceType: 'Overall',
    paymentEntity: 'Razorpay',
    frequency: 'Daily at 09:00 IST',
    channel: 'Email',
    createdDate: '12th Jul 2026',
  },
  {
    id: 'row-3',
    configurationName: 'Weekly Refund Summary',
    categorySource: 'Reconciliation',
    sourceType: 'Matched',
    paymentEntity: 'Razorpay',
    frequency: 'Weekly on Mon at 10:00 IST',
    channel: 'Email',
    createdDate: '5th Jun 2026',
  },
  {
    id: 'row-4',
    configurationName: 'Payment Gateway Alerts',
    categorySource: 'Reconciliation',
    sourceType: 'Mismatched',
    paymentEntity: 'Razorpay',
    frequency: 'Real-time',
    channel: 'Slack',
    createdDate: '22nd Mar 2026',
  },
  {
    id: 'row-5',
    configurationName: 'Quarterly Tax Invoice',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: 'Razorpay',
    frequency: 'Quarterly on 1st at 08:00 IST',
    channel: 'Email',
    createdDate: '1st Jan 2026',
  },
  {
    id: 'row-6',
    configurationName: 'Dispute Escalation Notify',
    categorySource: 'Reconciliation',
    sourceType: 'Mismatched',
    paymentEntity: 'Razorpay',
    frequency: 'Real-time',
    channel: 'Webhook',
    createdDate: '14th Apr 2026',
  },
  {
    id: 'row-7',
    configurationName: 'Payout Reconciliation',
    categorySource: 'Reconciliation',
    sourceType: 'Overall',
    paymentEntity: 'RazorpayX',
    frequency: 'Weekly on Fri at 18:00 IST',
    channel: 'Email',
    createdDate: '8th May 2026',
  },
  {
    id: 'row-8',
    configurationName: 'Subscription Renewal Alert',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: 'Razorpay',
    frequency: 'Daily at 07:30 IST',
    channel: 'Slack',
    createdDate: '30th Aug 2026',
  },
  {
    id: 'row-9',
    configurationName: 'Failed Payment Digest',
    categorySource: 'File Summary',
    sourceType: 'Settlement',
    paymentEntity: 'Razorpay',
    frequency: 'Daily at 11:00 IST',
    channel: 'Email',
    createdDate: '15th Feb 2026',
  },
  {
    id: 'row-10',
    configurationName: 'Chargeback File Export',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: 'Razorpay',
    frequency: 'Weekly on Wed at 12:00 IST',
    channel: 'Webhook',
    createdDate: '3rd Sep 2026',
  },
]

/**
 * Filter options, derived from the rows rather than written out.
 *
 * Blend derives them from the `data` prop when a column supplies none — but `data` is the
 * page slice, so the offered values would shrink to whatever page you happen to be on.
 * Taking them from the full set instead means the list is the vocabulary, not the viewport.
 */
const filterOptionsFor = (field: keyof ReportConfigRow): FilterOption[] =>
  [...new Set(rows.map((row) => String(row[field])))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ id: `${String(field)}-${value}`, label: value, value }))

/** Status is not on `rows` — it is derived — so its two values are named here. */
const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { id: 'status-active', label: 'Active', value: 'Active' },
  { id: 'status-disabled', label: 'Disabled', value: 'Disabled' },
]

/**
 * Frequency sorts by cadence, not by spelling. Alphabetically "Daily" precedes "Real-time"
 * precedes "Weekly", which tells you nothing; ascending here means most frequent first.
 */
const FREQUENCY_ORDER = ['Real-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly']
const frequencyRank = (value: string) => {
  const index = FREQUENCY_ORDER.findIndex((word) => value.startsWith(word))
  // Anything unrecognised sorts after every known cadence rather than silently landing first.
  return index === -1 ? FREQUENCY_ORDER.length : index
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * "19th Aug 2026" → a sortable number. Sorting these as strings puts 1st Jan next to 15th
 * Feb because it compares the leading digit, so the column has to be parsed to be ordered.
 * An unparseable date sorts last, for the same reason as above.
 */
const createdDateRank = (value: string) => {
  const match = /^(\d{1,2})\w{2}\s+([A-Za-z]{3})\s+(\d{4})$/.exec(value.trim())
  if (!match) return Number.POSITIVE_INFINITY
  const month = MONTHS.indexOf(match[2])
  if (month === -1) return Number.POSITIVE_INFINITY
  return Number(match[3]) * 10000 + month * 100 + Number(match[1])
}

/** A TAG cell's value is TagData — `{ text }` — so its sort and filter key is that text. */
const cellText = (value: unknown) =>
  typeof value === 'object' && value !== null && 'text' in value
    ? String((value as { text: unknown }).text)
    : String(value ?? '')

/** Ascending order for one field. `compare` is negated for descending — nothing else changes. */
const compareBy = (field: string, a: TableRow, b: TableRow) => {
  if (field === 'frequency') {
    const rank = frequencyRank(String(a.frequency)) - frequencyRank(String(b.frequency))
    // Two Daily rows still need a stable order, so fall through to the text.
    if (rank !== 0) return rank
  }
  if (field === 'createdDate') {
    return createdDateRank(String(a.createdDate)) - createdDateRank(String(b.createdDate))
  }
  return cellText(a[field]).localeCompare(cellText(b[field]), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

/**
 * One column filter against one row.
 *
 * The shapes come from Blend: a single-select sends a string with `equals`, a multi-select
 * sends an array. The `{ min, max }` case cannot arise — no column here is numeric or a
 * slider — so it is let through rather than half-implemented.
 */
const matchesFilter = (row: TableRow, filter: ColumnFilter) => {
  const value = cellText(row[String(filter.field)])

  if (Array.isArray(filter.value)) {
    return filter.value.length === 0 || filter.value.includes(value)
  }

  if (typeof filter.value === 'string') {
    if (filter.value === '') return true
    return filter.operator === 'equals'
      ? value === filter.value
      : value.toLowerCase().includes(filter.value.toLowerCase())
  }

  return true
}

/** A row as the table sees it: the source row plus the two derived cells. */
type TableRow = ReportConfigRow & {
  enabled: boolean
  status: { text: string }
  [key: string]: unknown
}

/**
 * The page's vertical rhythm, tunable live from the DialKit panel.
 *
 * One dial per gap between the page's top-level blocks — title, section tabs, the
 * toolbar row, the table. The table is deliberately a single block: nothing here reaches
 * inside it, so row heights, header height and cell padding stay owned by Blend's tokens
 * and cannot be knocked off the design by a stray drag.
 *
 * Tuples are [value, min, max, step]. The step is 4 so every value the dial can produce
 * still lands on the 4px spacing grid (DESIGN.md §7). Defaults are 24 except the toolbar
 * to table gap, tuned down to 16 so the toolbar sits tighter to the table it belongs to.
 */
// A factory rather than five literals: it puts the range and the 4px step in one place,
// and returns a mutable tuple, which is what DialKit's DialConfig wants — `as const` here
// produces a readonly tuple and does not typecheck.
const dial = (value: number): [number, number, number, number] => [value, 0, 96, 4]

const SPACING_DIALS = {
  aboveTitle: dial(24),
  titleToTabs: dial(24),
  tabsToToolbar: dial(24),
  toolbarToTable: dial(16),
  belowTable: dial(24),
}

/**
 * Handed to index.css so the hover reveal on the column filter buttons reads its timing
 * from src/motion.ts (rule 14) rather than keeping a second copy in the stylesheet.
 */
const TABLE_MOTION = {
  '--table-feedback': `${MICRO_MS}ms`,
  '--table-feedback-ease': FEEDBACK_EASING,
} as CSSProperties

function Configurator() {
  const navigate = useNavigate()
  const [section, setSection] = useState(toValue(SECTION_TABS[0]))
  const [filter, setFilter] = useState<string>(ALL)
  const activeCategory = filter === ALL ? null : filter

  /**
   * Sorting, column filters and pagination all live here rather than inside DataTable.
   *
   * Not a preference — `serverSidePagination` makes DataTable return `data` untouched
   * (DataTable.tsx:535-538, before the search/filter/sort block), which is what lets the
   * footer describe a set the parent has already sliced. The same early return is why its
   * own sort and filter menus would otherwise do nothing: they update its internal state,
   * fire the callbacks, and then no code path applies them. So the parent applies them.
   */
  const [sort, setSort] = useState<SortConfig | null>(null)
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  /**
   * Anything that changes which rows exist sends you back to page one — page 3 of a set
   * that now has four rows is an empty table, and an empty table reads as a bug.
   */
  const handleFilterTabChange = (next: string) => {
    setFilter(next)
    setPage(1)
  }

  const handleFilterChange = useCallback((filters: ColumnFilter[]) => {
    setColumnFilters(filters)
    setPage(1)
  }, [])

  /**
   * DataTable reports SortDirection.NONE for the third click of a header, which is the
   * cycle's way of saying "unsorted" — held as null so the pipeline can skip sorting
   * entirely and fall back to the authored row order.
   */
  const handleSortChange = useCallback((next: SortConfig) => {
    setSort(next.direction === SortDirection.NONE ? null : next)
  }, [])

  const handlePageSizeChange = useCallback((next: number) => {
    setPageSize(next)
    setPage(1)
  }, [])

  const spacing = useDialKit('Configurator spacing', SPACING_DIALS)

  /** Row id → enabled. Every row starts enabled, so every row starts "Active". */
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, true])),
  )

  /**
   * Id of the row waiting on a disable confirmation, or null. Disabling is the destructive
   * direction, so only that one asks; re-enabling applies straight away. Nothing is written
   * to `enabled` until the user confirms, so the switch stays visibly ON behind the modal
   * and a cancel needs no rollback.
   */
  const [pendingDisableId, setPendingDisableId] = useState<string | null>(null)
  const pendingRow = rows.find((row) => row.id === pendingDisableId) ?? null

  const closeConfirm = () => setPendingDisableId(null)

  const confirmDisable = () => {
    if (pendingDisableId) {
      setEnabled((previous) => ({ ...previous, [pendingDisableId]: false }))
    }
    closeConfirm()
  }

  /**
   * Both the toggle's position and the Status cell are projected from one flag, so they
   * cannot disagree. `enabled` rides along on the row because the Actions cell has to read
   * it from here — see the note on `columns` below.
   */
  const matchingRows = useMemo(() => {
    const projected: TableRow[] = rows.map((row) => {
      const isEnabled = enabled[row.id] ?? true
      return {
        ...row,
        enabled: isEnabled,
        // A TAG column's value must be TagData — an object carrying `text`. That text
        // is what the Status filter matches on; the chip comes from renderCell.
        status: { text: isEnabled ? 'Active' : 'Disabled' },
      }
    })

    // Order matters, and it is the order a reader would expect: the tab narrows the set,
    // the column filters narrow it further, and only then is what survives sorted. Sorting
    // first would be the same answer at more cost, but filtering after paging would not —
    // it would filter one page and call it the result.
    const filtered = projected
      .filter((row) => activeCategory === null || row.categorySource === activeCategory)
      .filter((row) => columnFilters.every((filter) => matchesFilter(row, filter)))

    if (!sort) return filtered

    const direction = sort.direction === SortDirection.DESCENDING ? -1 : 1
    // Sorting a copy: `filtered` is already a new array, but `toSorted` is not in this
    // TS lib target and an in-place sort on a value derived from state is a habit worth
    // not having.
    return [...filtered].sort((a, b) => direction * compareBy(sort.field, a, b))
  }, [enabled, activeCategory, columnFilters, sort])

  /**
   * The page is clamped rather than corrected in state: a filter that shrinks the set
   * below the current page is resolved on the way to render, in one pass, instead of
   * rendering an empty table and then re-rendering the right one from an effect.
   */
  const totalRows = matchingRows.length
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  const currentPage = Math.min(page, pageCount)

  const data = useMemo(
    () => matchingRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [matchingRows, currentPage, pageSize],
  )

  /**
   * Built once, deliberately. DataTable seeds `visibleColumns` from a `useState`
   * initialiser and its resync effect only notices a changed `renderCell` when the column
   * is `ColumnType.CUSTOM` (DataTable.tsx:265-274) — so for a REACT_ELEMENT column the
   * FIRST `renderCell` closure is the only one that ever runs. Rebuilding this memo per
   * toggle would therefore be silently ignored, leaving a one-way switch.
   *
   * So the cell reads its state from `row`, which is always current because `data` is a
   * prop, and writes through `setEnabled`, which React guarantees is stable.
   */
  const columns = useMemo<ColumnDefinition<Record<string, unknown>>[]>(
    () =>
      // Two of the nine columns render a control instead of a value. `base` is the shape
      // they all share, written once; each branch then adds only what makes it different.
      // Kept as three returns rather than a spread of partials because ColumnDefinition is
      // a union discriminated on `type` — a widened `type` stops it narrowing at all.
      COLUMNS.map(({ field, header }) => {
        const base = { field, header, ...HUG }

        if (field === 'status') {
          return {
            ...base,
            // TableCell has no TAG branch in 0.0.37 — ColumnType.TAG only drives sorting,
            // validation and default widths — so the chip has to come from renderCell.
            // Colour is read off `row.enabled`, the same single source of truth the toggle
            // writes to, rather than parsed back out of the label text.
            type: ColumnType.TAG,
            // TAG's type config is `filterComponent: 'select'`, so the header offers a
            // one-of list. The two values are named rather than scraped from the page,
            // so "Disabled" is offerable on a page where every row is Active.
            filterType: FilterType.SELECT,
            filterOptions: STATUS_FILTER_OPTIONS,
            renderCell: (_value, row) => {
              const isEnabled = row.enabled !== false
              return (
                <TagV2
                  text={isEnabled ? 'Active' : 'Disabled'}
                  color={isEnabled ? TagV2Color.SUCCESS : TagV2Color.NEUTRAL}
                  type={TagV2Type.SUBTLE}
                  size={TagV2Size.SM}
                />
              )
            },
          }
        }

        if (field === 'actions') {
          return {
            ...base,
            // REACT_ELEMENT is the one column type that takes arbitrary JSX, and it
            // reports supportsSorting/supportsFiltering false — so this column also
            // correctly renders without the header's sort/filter menu.
            type: ColumnType.REACT_ELEMENT,
            isSortable: false,
            renderCell: (_value, row) => {
              const id = String(row.id)
              const checked = row.enabled !== false
              return (
                <SwitchV2
                  checked={checked}
                  size={SelectorV2Size.MD}
                  aria-label={`${checked ? 'Disable' : 'Enable'} ${String(row.configurationName)}`}
                  onCheckedChange={(next) => {
                    // Turning ON is not destructive, so it commits immediately. Turning
                    // OFF only opens the confirmation — `enabled` is written by
                    // confirmDisable, which is why the switch stays ON underneath.
                    if (next) {
                      setEnabled((previous) => ({ ...previous, [id]: true }))
                    } else {
                      setPendingDisableId(id)
                    }
                  }}
                />
              )
            },
          }
        }

        if (SELECT_FILTER_FIELDS.includes(field)) {
          // SELECT renders exactly like TEXT — TableCell has no SELECT branch, so the value
          // falls through to the same truncated text — but its type config carries
          // `supportsFiltering: true`, which is what puts the value list in the header menu.
          return {
            ...base,
            type: ColumnType.SELECT,
            filterType: FilterType.SELECT,
            filterOptions: filterOptionsFor(field as keyof ReportConfigRow),
          }
        }

        return { ...base, type: ColumnType.TEXT }
      }),
    [],
  )

  return (
    // Capped and centred: 1440 is the design's frame, and past it the table would keep
    // stretching while the eye has to travel further to read a row. `max-w` is border-box
    // under Preflight, so the 24px gutters are inside the 1440 rather than added to it.
    <div
      className="mx-auto flex w-full max-w-[1440px] flex-col px-6"
      style={{ paddingTop: spacing.aboveTitle }}
    >
      <PrimitiveText
        as="h1"
        // heading.md — 20/28. The token rather than the numbers, so the page heading keeps
        // moving with the scale rather than pinning itself to today's value of it.
        {...font(FOUNDATION_THEME.font.size.heading.md)}
        color={colors.gray[700]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        Configurator
      </PrimitiveText>

      {/* The class carries the 24px inter-tab gap the design specifies — see index.css.
          TabsV2List takes no className, so it has to be reached through this wrapper. */}
      {/* Its own ThemeProvider, so the 24px trigger gap reaches these tabs and not the
          boxed filter tabs below — `tabList.gap` is a single token, not keyed by variant.
          See sectionTabsTokens in src/theme.ts. */}
      <div style={{ marginTop: spacing.titleToTabs }}>
        <ThemeProvider componentTokens={sectionTabsTokens}>
          <TabsV2
            variant={TabsV2Variant.UNDERLINE}
            size={TabsV2Size.MD}
            value={section}
            onValueChange={setSection}
          >
            <TabsV2List>
              {SECTION_TABS.map((label) => (
                <TabsV2Trigger key={label} value={toValue(label)}>
                  {label}
                </TabsV2Trigger>
              ))}
            </TabsV2List>
          </TabsV2>
        </ThemeProvider>
      </div>

      {/* No horizontal padding of its own. The panel used to carry `px-6` so it read as
          content nested under the active Report Config tab, but that put the toolbar and
          table 24px right of the heading and the section tabs — two keylines on one page.
          The gutter now belongs to the page container alone, so every row starts at the
          same x. Vertical padding is still the dial's. */}
      <div
        className="flex flex-col"
        style={{
          paddingTop: spacing.tabsToToolbar,
          paddingBottom: spacing.belowTable,
          gap: spacing.toolbarToTable,
        }}
      >
        <div className="flex items-center justify-between">
          {/* The track has to hug its three tabs. BOXED paints a background on the tablist,
              and TabsV2's root takes the full width of its flex parent — which left 588px
              of empty grey running from "File Summary" to the button. TabsV2 takes no
              className (rule 2), so the width is capped on a wrapper we own. */}
          <div className="w-fit shrink-0">
            <TabsV2
              // BOXED, not FLOATING: the filter sits on the same ground as the table it
              // filters, so it needs a track of its own to read as a control rather than
              // three loose words. FLOATING gives the active tab a fill and nothing else.
              variant={TabsV2Variant.BOXED}
              size={TabsV2Size.LG}
              value={filter}
              onValueChange={handleFilterTabChange}
            >
              <TabsV2List>
                {FILTER_TABS.map((label) => (
                  <TabsV2Trigger key={label} value={label}>
                    {label}
                  </TabsV2Trigger>
                ))}
              </TabsV2List>
            </TabsV2>
          </div>

          {/* ButtonV2 sizes to its text; without this it is a flex item that can shrink
              and wrap "Create report config" onto a second line. */}
          <div className="shrink-0">
            <ButtonV2
              buttonType={ButtonV2Type.PRIMARY}
              size={ButtonV2Size.LARGE}
              text="Create report config"
              onClick={() => navigate('/configurator/create')}
            />
          </div>
        </div>

        <div className="reports-config-table" style={TABLE_MOTION}>
          <DataTable
            data={data}
            columns={columns}
            idField="id"
            showHeader={false}
            // Columns are deliberately fixed. The Figma draws a drag handle on the first
            // header, but reordering was not wanted — and `enableColumnReordering` is what
            // gates both the grip icon and the DraggableColumnHeader wrapper
            // (TableHeader/index.tsx:841), so leaving it off removes the affordance and
            // the behaviour together. Default is already false; stated here so the
            // divergence from the design is deliberate rather than forgotten.
            enableColumnReordering={false}
            // Defaults to true, which adds a "+" column-manager button past the last
            // header cell. The design ends at column six.
            enableColumnManager={false}
            // The header's sort and filter menus are inert on their own here — see the
            // note on the state above — so both callbacks are the wiring, not extras.
            // `enableFiltering` and `serverSideFiltering` say the same thing to DataTable:
            // filtering happens, and it happens outside.
            enableFiltering
            serverSideFiltering
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            // The footer describes the set the parent sliced, not `data.length`, which is
            // only ever the current page — otherwise ten of forty rows would read as "10".
            pagination={{
              currentPage,
              pageSize,
              totalRows,
              pageSizeOptions: [10, 20, 30, 40, 50],
            }}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            // Server-side pagination is what lets the footer describe a page the parent has
            // already sliced, so DataTable renders `data` as given rather than cutting it to
            // `pageSize` a second time.
            serverSidePagination
          />
        </div>
      </div>

      {/* Copy follows the reference dialog: a "Confirm to …" title, a body that names the
          thing in quotes and asks in plain words, and a destructive primary. `isOpen` is
          driven by the pending id, and the row name is read from `pendingRow` rather than
          held in its own state so the two cannot disagree. */}
      <ModalV2
        isOpen={pendingRow !== null}
        onClose={closeConfirm}
        title="Confirm to disable config"
        showCloseButton
        closeOnBackdropClick
        primaryAction={{
          text: 'Yes, Disable it',
          buttonType: ButtonV2Type.DANGER,
          onClick: confirmDisable,
        }}
        secondaryAction={{
          text: 'Cancel',
          buttonType: ButtonV2Type.SECONDARY,
          onClick: closeConfirm,
        }}
      >
        <PrimitiveText
          as="p"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[600]}
        >
          Are you sure you want to turn OFF the &ldquo;{pendingRow?.configurationName}&rdquo;
          config?
        </PrimitiveText>
      </ModalV2>
    </div>
  )
}

export default Configurator
