import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
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
import { Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ConfigDetailSheet } from './ConfigDetailSheet'
import { MiddleTruncate } from '../middle-truncate'
import { FEEDBACK_EASING, MICRO_MS } from '../motion'
import { PrimitiveText, font } from '../primitives'
import type { Categorised } from '../report-config'
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
 * The two tabs above the table. They choose which *set of rows* the table is showing —
 * the configs that exist, or the ones still being written.
 *
 * This replaces a category filter (All / Reconciliation / File Summary). Filtering by
 * category did not need a tab of its own: the Category column is a SELECT column
 * (SELECT_FILTER_FIELDS below), so its header menu offers the same choice, in the place a
 * reader already looks to narrow a column. A draft is not a narrower view of the same
 * rows — it is a different set, with a different vocabulary in Status and a different
 * control in Actions — which is the thing a tab is actually for.
 */
const ALL_REPORTS = 'All Reports'
const DRAFTS = 'Drafts'
const VIEW_TABS = [ALL_REPORTS, DRAFTS]

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
  { field: 'categorySource', header: 'Category' },
  { field: 'sourceType', header: 'Source / Type' },
  { field: 'paymentEntity', header: 'Payment Entity' },
  { field: 'frequency', header: 'Frequency' },
  { field: 'channel', header: 'Channel' },
  { field: 'status', header: 'Status' },
  { field: 'createdDate', header: 'Created on' },
  { field: 'actions', header: 'Actions' },
] as const

/**
 * The columns whose values are a closed set, and so are worth picking from a list.
 *
 * This is a *type* decision, not a flag: `getColumnTypeConfig` (columnTypes.ts) reads
 * `supportsFiltering` off the ColumnType alone, and TEXT is false — so a TEXT column offers
 * sorting only, however it is configured. SELECT is the type that opens the filter list.
 *
 * Configuration Name, Frequency and Created on are deliberately not here: a list of ten
 * distinct sentences is not a filter, it is the table again. They stay TEXT, and sortable.
 */
const SELECT_FILTER_FIELDS = ['categorySource', 'sourceType', 'paymentEntity', 'channel']

/** Let content decide the width — see the note above. */
const HUG = { minWidth: '0px', maxWidth: 'none' } as const

/**
 * What a cell shows when the question behind it has not been answered yet — every blank in
 * the Drafts view (DRAFT_ROWS).
 *
 * An em dash rather than an empty cell, at gray[400], which DESIGN.md §7 reserves for
 * placeholders: an empty cell reads as a value that failed to load, where a placeholder dash
 * reads as "not answered", which is what it is. The same choice, and the same character,
 * field-samples.ts makes for a column with no sample.
 */
const Unanswered = () => (
  <PrimitiveText
    as="span"
    {...font(FOUNDATION_THEME.font.size.body.md)}
    color={colors.gray[400]}
  >
    —
  </PrimitiveText>
)

/**
 * Wraps a cell renderer so an empty value draws `Unanswered` instead.
 *
 * Applied to every column a draft can leave blank rather than branching on the view inside
 * each one: a finished config never has an empty cell, so one closure is correct in both
 * views — which matters more than it looks, because DataTable only adopts a *new* renderCell
 * when the column count changes (see the note on `columns`). A renderer that had to know
 * which tab was showing would be the one thing this file cannot hand it.
 */
const blankable =
  (render: (value: unknown) => ReactNode = (value) => String(value)) =>
  (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return text.trim() === '' ? <Unanswered /> : render(value)
  }

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
    frequency: 'Monthly · 19th · 17:15 IST',
    channel: 'Email',
    createdDate: '19th Aug 2026',
  },
  {
    id: 'row-2',
    configurationName: 'Daily Settlement Report',
    categorySource: 'Reconciliation',
    sourceType: 'Overall',
    paymentEntity: 'Razorpay',
    frequency: 'Daily · 09:00 IST',
    channel: 'Email',
    createdDate: '12th Jul 2026',
  },
  {
    id: 'row-3',
    configurationName: 'Weekly Refund Summary',
    categorySource: 'Reconciliation',
    sourceType: 'Matched',
    paymentEntity: 'Razorpay',
    frequency: 'Weekly · Mon · 10:00 IST',
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
    frequency: 'Quarterly · 1st · 08:00 IST',
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
    frequency: 'Weekly · Fri · 18:00 IST',
    channel: 'Email',
    createdDate: '8th May 2026',
  },
  {
    id: 'row-8',
    configurationName: 'Subscription Renewal Alert',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: 'Razorpay',
    frequency: 'Daily · 07:30 IST',
    channel: 'Slack',
    createdDate: '30th Aug 2026',
  },
  {
    id: 'row-9',
    configurationName: 'Failed Payment Digest',
    categorySource: 'File Summary',
    sourceType: 'Settlement',
    paymentEntity: 'Razorpay',
    frequency: 'Daily · 11:00 IST',
    channel: 'Email',
    createdDate: '15th Feb 2026',
  },
  {
    id: 'row-10',
    // Deliberately long, and deliberately a filename: it is the row that exercises
    // MiddleTruncate. The tenth row is the one written here rather than transcribed from
    // the design, so it is the one free to carry a value the design never drew.
    configurationName: 'chargeback_file_export_razorpay_2026-09-03.csv',
    categorySource: 'File Summary',
    sourceType: 'Chargeback',
    paymentEntity: 'Razorpay',
    frequency: 'Weekly · Wed · 12:00 IST',
    channel: 'Webhook',
    createdDate: '3rd Sep 2026',
  },
]

/**
 * The step a draft stopped on, which is where Resume picks it up.
 *
 * Named steps rather than "3 of 6", because the flow's own step count is conditional now —
 * a grouped report walks six and a transaction-level one walks five (create-report-config/
 * flow-layout.tsx), so a fraction would mean different things on different rows.
 */
const DRAFT_STEPS = ['Setup', 'Delivery', 'Grouping', 'Fields', 'Filters', 'Review'] as const
type DraftStep = (typeof DRAFT_STEPS)[number]

type DraftRow = ReportConfigRow & { step: DraftStep }

/**
 * Drafts — configs that were started and left, each one stopped somewhere different.
 *
 * Every value here is one the create flow had actually collected by the time the user left,
 * and every blank is a question they had not reached. That is the whole content of the view:
 * a draft *is* a partly answered form, so the empty cells are not missing data, they are the
 * data. `—` is drawn for them at placeholder grey — see `blankable` in the columns below.
 *
 * Which columns a draft can ever fill follows from what the flow asks:
 *
 * - **Category / Source / Type** — Setup's first two questions, so every draft past the
 *   first screen has them.
 * - **Frequency and Channel** — Delivery's, so a draft that stopped on Setup has neither.
 * - **Configuration Name** — asked in the submit dialog at the very end
 *   (SubmitConfigModal.tsx), so only a draft that reached it carries one. That is why three
 *   of these four are untitled: it is not an oversight in the fixture, it is where the flow
 *   asks the question.
 * - **Payment Entity** — never asked by the flow at all. Blank on every draft, and it stays
 *   in the table because that blank is worth seeing: it is the column this flow cannot yet
 *   produce.
 */
const DRAFT_ROWS: DraftRow[] = [
  {
    id: 'draft-1',
    configurationName: '',
    categorySource: 'Reconciliation',
    sourceType: 'Mismatched',
    paymentEntity: '',
    frequency: '',
    channel: '',
    createdDate: '21st Sep 2026',
    step: 'Setup',
  },
  {
    id: 'draft-2',
    configurationName: '',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: '',
    frequency: 'Daily · 09:00 IST',
    channel: 'Email',
    createdDate: '18th Sep 2026',
    step: 'Fields',
  },
  {
    id: 'draft-3',
    configurationName: '',
    categorySource: 'Reconciliation',
    sourceType: 'Overall',
    paymentEntity: '',
    frequency: 'Weekly · Mon · 10:00 IST',
    channel: 'Slack',
    createdDate: '11th Sep 2026',
    step: 'Filters',
  },
  {
    // The one that got as far as the submit dialog, typed a name and closed it — which is
    // the only way a draft has a name at all.
    id: 'draft-4',
    configurationName: 'PayU Weekly Recon Summary',
    categorySource: 'Reconciliation',
    sourceType: 'Matched',
    paymentEntity: '',
    frequency: 'Weekly · Fri · 18:30 IST',
    channel: 'Email',
    createdDate: '2nd Sep 2026',
    step: 'Review',
  },
]

/**
 * Filter options, derived from the rows rather than written out.
 *
 * Blend derives them from the `data` prop when a column supplies none — but `data` is the
 * page slice, so the offered values would shrink to whatever page you happen to be on.
 * Taking them from the full set instead means the list is the vocabulary, not the viewport.
 */
/**
 * How a draft is named out loud — in a delete confirmation, or to a screen reader.
 *
 * Most drafts have no name at all (see DRAFT_ROWS), so there has to be something to call
 * them that is not an empty string. The row's own words rather than an index: "this
 * Reconciliation draft" is what the user would say about it.
 */
const draftLabel = (row: Record<string, unknown>) => {
  const name = String(row.configurationName ?? '').trim()
  return name === '' ? `this ${String(row.categorySource)} draft` : `“${name}”`
}

const filterOptionsFor = (field: keyof ReportConfigRow): FilterOption[] =>
  [...new Set(rows.map((row) => String(row[field])))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ id: `${String(field)}-${value}`, label: value, value }))

/**
 * Status is not on `rows` — it is derived — so its two values are named here.
 *
 * "Inactive", not "Disabled": the column's other value is "Active", and a pair should be one
 * word and its opposite. "Disabled" also carries a second meaning in an interface — a control
 * you cannot use — which is not what a switched-off config is.
 */
const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { id: 'status-active', label: 'Active', value: 'Active' },
  { id: 'status-inactive', label: 'Inactive', value: 'Inactive' },
  // One column, two vocabularies, and only ever one of them on screen: a finished config is
  // Active or Inactive, and a draft's status is how far it got. Both are listed because the
  // header menu is built from the column, not from the view — and a draft set worth filtering
  // by step is the more useful half of that, since "everything abandoned at Delivery" is a
  // real question and "which drafts are drafts" is not.
  ...DRAFT_STEPS.map((step) => ({ id: `status-${step}`, label: step, value: step })),
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

/**
 * How a channel is named inside a sentence, rather than as a column value.
 *
 * "the monthly Email" reads as a column heading dropped into prose; "the monthly email" is
 * what a person says. The three that are proper nouns keep their capital and take a noun
 * after them, because a Slack is not a thing you send.
 */
const CHANNEL_NOUN: Record<string, string> = {
  Email: 'email',
  Slack: 'Slack message',
  Webhook: 'webhook call',
  SFTP: 'SFTP drop',
}

/** "Mon" is a column width; a sentence says Monday. */
const WEEKDAY_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
}

/**
 * What turning this config off actually stops, as a sentence.
 *
 * The row carries its schedule as one packed string — "Monthly · 19th · 17:15 IST" — which is
 * a table cell, not something to drop into a paragraph. So it is taken apart and said: the
 * cadence, the day it falls on, and the time. A Real-time config names neither a day nor a
 * time and the sentence simply stops early rather than inventing either.
 */
const disableConsequence = ({ frequency, channel }: ReportConfigRow) => {
  const [cadence, ...rest] = frequency.split(' · ')
  const time = rest.find((part) => /\d{1,2}:\d{2}/.test(part))
  const day = rest.find((part) => part !== time)
  // A weekday recurs — "on Mondays" — where a date in the month is the one day it lands on.
  const on = day ? ` on ${WEEKDAY_NAMES[day] ? `${WEEKDAY_NAMES[day]}s` : `the ${day}`}` : ''
  const what = CHANNEL_NOUN[channel] ?? channel.toLowerCase()
  return `We will not send the ${cadence.toLowerCase()} ${what}${on}${time ? ` at ${time}` : ''} any more.`
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

/** A row as the table sees it: the source row plus the derived cells. */
type TableRow = ReportConfigRow & {
  enabled: boolean
  status: { text: string }
  /**
   * Which set this row came from. Carried on the row rather than read from state by the
   * cells, for the reason spelled out on `columns`: a renderCell closure is captured once
   * and `row` is the only thing in it that is guaranteed current.
   */
  isDraft: boolean
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
 * to table gap, which is 8 — the toolbar's tabs choose what the table shows, so the two read
 * as one block, and the 24px around everything else is what says where that block ends.
 */
// A factory rather than five literals: it puts the range and the 4px step in one place,
// and returns a mutable tuple, which is what DialKit's DialConfig wants — `as const` here
// produces a readonly tuple and does not typecheck.
const dial = (value: number): [number, number, number, number] => [value, 0, 96, 4]

const SPACING_DIALS = {
  aboveTitle: dial(24),
  titleToTabs: dial(24),
  tabsToToolbar: dial(24),
  toolbarToTable: dial(8),
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
  const [view, setView] = useState<string>(ALL_REPORTS)
  const showingDrafts = view === DRAFTS

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
  const handleViewChange = (next: string) => {
    setView(next)
    setPage(1)
    // Every column filter goes, because the two views do not share a vocabulary. Status is
    // the clearest case — Active does not exist among drafts — so a filter carried across
    // would empty the table for a reason nothing on screen explains, and the menu holding it
    // would be one the user had to remember to go back and clear. The tab is a change of
    // subject, and a filter is an answer to the previous one.
    setColumnFilters([])
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

  /**
   * Id of the row whose detail sheet is open, or null. An id rather than the row itself, for
   * the same reason `pendingDisableId` is: the row is looked up from `rows` on the way to
   * render, so a sheet can never be showing a stale copy of a row that has since changed.
   */
  const [detailId, setDetailId] = useState<string | null>(null)
  const detailRow = rows.find((row) => row.id === detailId) ?? null

  /**
   * Drafts the user has deleted, and the draft waiting on that confirmation.
   *
   * Confirmed rather than applied on the click, for the same reason disabling a config is:
   * it is the destructive direction. More so, in fact — a disabled config can be switched
   * back on, and a deleted draft is the only copy of a form somebody had partly filled in.
   * A page that stops to ask before turning a report off and deletes a draft on one click
   * would have its two confirmations the wrong way round.
   */
  const [deletedDrafts, setDeletedDrafts] = useState<ReadonlySet<string>>(() => new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingDraft = DRAFT_ROWS.find((row) => row.id === pendingDeleteId) ?? null

  const closeDelete = () => setPendingDeleteId(null)
  const confirmDelete = () => {
    if (pendingDeleteId) {
      setDeletedDrafts((previous) => new Set(previous).add(pendingDeleteId))
    }
    closeDelete()
  }

  /**
   * Picks a draft back up.
   *
   * The create flow holds its answers in component state and has no draft store yet — see
   * the note on `leaveFlow` in create-report-config/index.tsx, which is where "Save as
   * draft" would write one. So this opens the flow at the start rather than at `row.step`.
   * This is the call site that will pass the draft's id the day that store exists; the step
   * is already on the row, which is the half of it that does not need the store.
   */
  const resumeDraft = useCallback(() => navigate('/configurator/create'), [navigate])

  /**
   * DataTable fires `onRowClick` from the `<tr>` (TableBody/index.tsx:766), so every click
   * inside a row reaches it — the Actions toggle included. That cell stops its own clicks
   * below, so this only ever has to handle a click on a value.
   */
  const openDetail = useCallback((row: Record<string, unknown>) => {
    /*
     * Let go of the clicked cell before the sheet opens.
     *
     * DataTable gives every cell a tabindex and focuses the one you click (it tracks a
     * `focusedCell` of its own), and the drawer then puts `aria-hidden` on everything behind
     * it. Focus inside an aria-hidden subtree is the one combination that actually breaks a
     * screen reader — the browser says so out loud: "Blocked aria-hidden on an element
     * because its descendant retained focus."
     *
     * Blurring here rather than after the fact, because the alternative is moving focus into
     * the drawer manually and racing vaul's own autofocus for it. With the cell released,
     * vaul's autofocus lands unopposed and Escape / Tab behave as they should.
     */
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setDetailId(String(row.id))
  }, [])

  const closeDetail = useCallback(() => setDetailId(null), [])

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
    const projected: TableRow[] = showingDrafts
      ? DRAFT_ROWS.filter((row) => !deletedDrafts.has(row.id)).map((row) => ({
          ...row,
          isDraft: true,
          // A draft has nothing to enable: it is not running, and the switch its Actions
          // cell would otherwise draw is replaced by Resume and Delete.
          enabled: false,
          // The step it stopped on, in the slot Active/Inactive takes for a finished config
          // — a draft's status is how far it got. "Draft" would fill the column with the
          // word already written on the tab above it, which is the same width for less, and
          // the argument the Category column used to lose on a category tab.
          status: { text: row.step },
        }))
      : rows.map((row) => {
          const isEnabled = enabled[row.id] ?? true
          return {
            ...row,
            isDraft: false,
            enabled: isEnabled,
            // A TAG column's value must be TagData — an object carrying `text`. That text
            // is what the Status filter matches on; the chip comes from renderCell.
            status: { text: isEnabled ? 'Active' : 'Inactive' },
          }
        })

    // Order matters, and it is the order a reader would expect: the tab chooses the set,
    // the column filters narrow it, and only then is what survives sorted. Sorting first
    // would be the same answer at more cost, but filtering after paging would not — it
    // would filter one page and call it the result.
    const filtered = projected.filter((row) =>
      columnFilters.every((filter) => matchesFilter(row, filter)),
    )

    if (!sort) return filtered

    const direction = sort.direction === SortDirection.DESCENDING ? -1 : 1
    // Sorting a copy: `filtered` is already a new array, but `toSorted` is not in this
    // TS lib target and an in-place sort on a value derived from state is a habit worth
    // not having.
    return [...filtered].sort((a, b) => direction * compareBy(sort.field, a, b))
  }, [enabled, showingDrafts, deletedDrafts, columnFilters, sort])

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
   * Rebuilt on a tab change and on nothing else. DataTable seeds `visibleColumns` from a
   * `useState` initialiser and its resync effect only notices a changed `renderCell` when
   * the column is `ColumnType.CUSTOM` (DataTable.tsx:265-274) — so for a REACT_ELEMENT
   * column the FIRST `renderCell` closure is the only one that ever runs. Rebuilding this
   * memo per *toggle* would therefore be silently ignored, leaving a one-way switch.
   *
   * So the cell reads its state from `row`, which is always current because `data` is a
   * prop, and writes through the setters, which React guarantees are stable.
   *
   * The same rule is why switching to Drafts does not rebuild this. Both views draw the same
   * nine columns, so the count never changes and a rebuilt closure would be ignored — the
   * cells branch on `row.isDraft` instead, which arrives with the data and is therefore
   * always the view actually on screen.
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
            // so "Inactive" is offerable on a page where every row is Active.
            filterType: FilterType.SELECT,
            filterOptions: STATUS_FILTER_OPTIONS,
            renderCell: (_value, row) => {
              // Orange for a draft, which is neither of the other two: green says it is
              // running and grey says it was switched off, and a form somebody is part way
              // through is unfinished rather than either. Orange is the palette's word for
              // that (DESIGN.md §7), and it is the one colour the other two do not use.
              if (row.isDraft === true) {
                return (
                  <TagV2
                    text={String(row.step)}
                    color={TagV2Color.WARNING}
                    type={TagV2Type.SUBTLE}
                    size={TagV2Size.SM}
                  />
                )
              }
              const isEnabled = row.enabled !== false
              return (
                <TagV2
                  text={isEnabled ? 'Active' : 'Inactive'}
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
                // The row is now clickable (onRowClick, below), and DataTable listens on the
                // <tr> — so without this a click on the toggle would also open the detail
                // sheet behind the confirmation. Stopped here rather than sniffing the event
                // target in the row handler: the cell knows it is a control, and the row
                // should not have to know what its cells contain.
                <div
                  className="contents"
                  onClick={(event) => event.stopPropagation()}
                  // Keyboard reaches the controls directly, so this wrapper takes no focus
                  // and needs no key handler — the click it stops is a pointer click only.
                  role="presentation"
                >
                {row.isDraft === true ? (
                  /* Resume leads, because it is what the row is for: a draft exists to be
                     finished, and deleting one is the exception. SECONDARY rather than
                     PRIMARY for the same reason the page has one primary button — "Create
                     report config" — and it is not repeated ten times down a table. */
                  <div className="flex items-center gap-2">
                    <ButtonV2
                      buttonType={ButtonV2Type.SECONDARY}
                      size={ButtonV2Size.SMALL}
                      text="Resume"
                      onClick={resumeDraft}
                    />
                    <ButtonV2
                      buttonType={ButtonV2Type.SECONDARY}
                      subType={ButtonV2SubType.ICON_ONLY}
                      size={ButtonV2Size.SMALL}
                      // Named, because three of the four drafts are untitled and "Delete"
                      // on its own would give a screen reader four identical buttons.
                      aria-label={`Delete ${draftLabel(row)}`}
                      leftSlot={{ slot: <Trash2 size={14} /> }}
                      onClick={() => setPendingDeleteId(id)}
                    />
                  </div>
                ) : (
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
                )}
                </div>
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
            renderCell: blankable(),
          }
        }

        if (field === 'configurationName') {
          return {
            ...base,
            // The one column with a ceiling instead of `HUG`'s `none`. A column that hugs
            // without bound can never truncate — it just grows to its longest value and
            // pushes the table into its own horizontal scroll, which is what this one did
            // before. 240 is a ceiling rather than a track: the column settles at 210 on
            // the names transcribed from the design, so the headroom means nothing real is
            // clipped by it and only a genuine outlier ever meets it.
            maxWidth: '240px',
            // Still TEXT, so the column keeps its sort menu and its default cell chrome —
            // `renderCell` is checked before the generic text branch (TableCell:522) and
            // after the typed ones, so a TEXT column can supply its own body without
            // becoming CUSTOM. The wrapper Blend puts around it is already
            // `width: 100%; min-width: 0; overflow: hidden`, which is exactly the box a
            // shrinking flex row needs.
            type: ColumnType.TEXT,
            // Blank on an untitled draft, which is most of them — the name is not asked
            // until the submit dialog. See DRAFT_ROWS.
            renderCell: blankable((value) => <MiddleTruncate text={String(value)} />),
          }
        }

        return { ...base, type: ColumnType.TEXT, renderCell: blankable() }
      }),
    [resumeDraft],
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
          {/* The pair has to hug its tabs. TabsV2's root takes the full width of its flex
              parent, which would stretch the tablist — and with it the triggers' hover and
              active targets — across several hundred pixels of dead space running to the
              button. TabsV2 takes no className (rule 2), so the width is capped on a wrapper
              we own. It mattered more under BOXED, which painted that space grey; it still
              matters now that the space is merely invisible rather than absent. */}
          <div className="w-fit shrink-0">
            <TabsV2
              // FLOATING: no track, no radius on the list, and the only mark is a fill under
              // the tab you are on (gray[100] active, gray[50] on hover) — so the switch
              // reads as two words, one of them current, rather than as a segmented control
              // sitting on its own grey ground. The table below is what it changes, and this
              // keeps the eye on that rather than on the chrome that chose it.
              variant={TabsV2Variant.FLOATING}
              size={TabsV2Size.LG}
              value={view}
              onValueChange={handleViewChange}
            >
              <TabsV2List>
                {VIEW_TABS.map((label) => (
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
            // Opens the detail sheet — and only for a config that exists. A draft has no
            // delivery, no schedule and no file name for the sheet to read back, so on that
            // view the row is not a link to anything and Resume is the way in. DataTable
            // gives a clickable row `cursor: pointer` off this prop alone
            // (TableBody/index.tsx:739), so passing nothing removes the affordance with the
            // behaviour rather than leaving a row that looks clickable and is not.
            onRowClick={showingDrafts ? undefined : openDetail}
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

      {/* Clicking a row opens it. Rendered once here rather than per row — one sheet that
          changes what it shows, not ten mounted sheets waiting their turn. */}
      <ConfigDetailSheet row={detailRow} onClose={closeDetail} />

      {/* The title asks the question, and the body answers "what happens if I say yes?".
          It used to be split the other way — a standing "Confirm to disable config" heading
          with the actual question as the body's first line — which spent the one line
          everybody reads on a label for the dialog rather than on the decision, and then
          made the name of the thing being turned off the second thing you saw.

          `isOpen` is driven by the pending id, and the name is read from `pendingRow`
          rather than held in its own state, so the two cannot disagree. Curly quotes are
          written into the string because ModalV2 types `title` as `string` — no JSX, so no
          entities. */}
      <ModalV2
        isOpen={pendingRow !== null}
        onClose={closeConfirm}
        title={`Turn OFF “${pendingRow?.configurationName ?? ''}”?`}
        showCloseButton
        closeOnBackdropClick
        // ModalV2's default width is the better part of a laptop screen, which for two
        // sentences means a line you have to track across rather than read. 480 keeps the
        // copy near the 45-75 character measure.
        dimensions={{ width: 480 }}
        primaryAction={{
          // The heading asks whether to turn it off, and the body says it can be turned back
          // on — so the button answers in those words too. "Disable" was a third word for the
          // same switch, and a confirm button that renames the action it is confirming makes
          // you check the heading again before pressing it.
          text: 'Yes, turn it off',
          buttonType: ButtonV2Type.DANGER,
          onClick: confirmDisable,
        }}
        secondaryAction={{
          text: 'Cancel',
          buttonType: ButtonV2Type.SECONDARY,
          onClick: closeConfirm,
        }}
      >
        {/* The consequence, in the config's own schedule and channel rather than in general
            terms — "you will stop receiving a report" is something a user has to translate,
            where "the monthly email on the 19th at 17:15 IST" names the thing they will
            notice missing. Spelled out as prose rather than by pasting the schedule cell in:
            see disableConsequence.

            Plain copy at gray[700], not a callout: two sentences in a 480px dialog do not
            need a box around them to be read, and a banner inside the dialog that is already
            asking the question is a frame around a frame. */}
        <PrimitiveText
          as="p"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[700]}
        >
          You will stop receiving this report.{' '}
          {pendingRow ? disableConsequence(pendingRow) : ''} Although, you can turn this back
          on any time.
        </PrimitiveText>
      </ModalV2>

      {/* The draft's own confirmation. Same shape as the one above and deliberately so — the
          two destructive actions on this page should ask the same way — but the copy is the
          opposite reassurance: turning a config off says you can turn it back on, and this
          one has to say that you cannot. */}
      <ModalV2
        isOpen={pendingDraft !== null}
        onClose={closeDelete}
        title={`Delete ${pendingDraft ? draftLabel(pendingDraft) : 'this draft'}?`}
        showCloseButton
        closeOnBackdropClick
        dimensions={{ width: 480 }}
        primaryAction={{
          text: 'Yes, delete it',
          buttonType: ButtonV2Type.DANGER,
          onClick: confirmDelete,
        }}
        secondaryAction={{
          text: 'Cancel',
          buttonType: ButtonV2Type.SECONDARY,
          onClick: closeDelete,
        }}
      >
        <PrimitiveText
          as="p"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[700]}
        >
          Nothing is running yet, so nothing stops — a draft has never been submitted. What
          goes is the answers behind it, up to {pendingDraft?.step ?? ''}, and that cannot be
          undone.
        </PrimitiveText>
      </ModalV2>
    </div>
  )
}

export default Configurator
