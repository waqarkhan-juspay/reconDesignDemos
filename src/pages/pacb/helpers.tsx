/**
 * The non-component half of the PACB kit — date-range maths, column builders and table
 * hooks. Split from kit.tsx so that file exports only components and keeps fast refresh:
 * it is the file a layout experiment edits most.
 */

import {
  ColumnType,
  FOUNDATION_THEME,
  type ColumnDefinition,
  type DataTableProps,
  type DateRange,
  TagV2Color,
} from '@juspay/blend-design-system'
import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { EMPTY } from './data'
import { AmountCell, CopyableId, StatusTag, TruncatedId, type StatusColors } from './kit'

// ─── Range panel ─────────────────────────────────────────────────────────────────────────

const { colors } = FOUNDATION_THEME

/**
 * The bordered container a page's figures and table sit in.
 *
 * blend-gap: Blend has no section/panel container, so this is a Tailwind box drawn with the
 * card tokens — 12px radius, gray[200] hairline.
 */
export const PANEL_STYLE: CSSProperties = {
  border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
  borderRadius: FOUNDATION_THEME.border.radius[12],
  backgroundColor: colors.gray[0],
}

/** The panel's rhythm, in px — the Payment Info Generator's tuned spacing defaults. */
export type PanelSpacing = {
  /** The range row to the panel it scopes — tighter than the title above the row. */
  toolbarToPanel: number
  /** Inside the panel, on all four sides. */
  padding: number
  /** Between the stat cards. */
  cardGap: number
  /** The cards to the table under them. */
  cardsToTable: number
}

export const PANEL_SPACING: PanelSpacing = {
  toolbarToPanel: 16,
  padding: 24,
  cardGap: 12,
  cardsToTable: 32,
}

/**
 * blend-gap: DataTable pads its own bordered box by 2px (dataTable.tokens.ts:552), so its
 * edge sits 2px inside the cards' and the page's. A margin of this on the table's wrapper
 * pulls it back out to share them.
 */
export const TABLE_OUTSET = `calc(-1 * ${FOUNDATION_THEME.unit[2]})`

/**
 * Columns sized to their content — pair with FIT_COLUMNS on the table's wrapper.
 *
 * Blend gives every column a minimum and a maximum by type — TEXT 120–250px, NUMBER
 * 80–120px, which clips an amount in the crores — and never applies `width`, so both bounds
 * come off here.
 */
export const hugColumns = <T extends Row>(columns: DataTableProps<T>['columns']) =>
  columns.map((column) => ({ ...column, minWidth: '0px', maxWidth: 'none' }))

/**
 * blend-gap: no column-sizing mode. Every cell carries an inline `width: auto` and the table
 * is `width: 100%` (utils.ts getColumnStyles, dataTable.tokens.ts), so the browser spreads
 * spare width across all columns. `w-px` on every cell but the last makes each one shrink to
 * its content, and the last takes what is left; `!` because Blend's width is inline.
 * `nowrap` so a shrunk header keeps its label on one line.
 */
export const FIT_COLUMNS =
  '[&_:is(th,td)]:!w-px [&_:is(th,td)]:whitespace-nowrap [&_:is(th,td):last-child]:!w-auto'

// ─── Date range ──────────────────────────────────────────────────────────────────────────

const localDay = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00')

export const rangeOf = (from: string, to: string): DateRange => ({
  startDate: localDay(from),
  endDate: localDay(to),
})

/**
 * Whether an IST timestamp falls on a day inside the range, ends included. Compares the
 * calendar day the product shows, not the instant, so a row at 23:44 on the last day stays in.
 */
export function inRange(iso: string, { startDate, endDate }: DateRange) {
  if (iso === EMPTY) return false
  const dayOf = localDay(iso).getTime()
  const start = new Date(startDate).setHours(0, 0, 0, 0)
  const end = new Date(endDate ?? startDate).setHours(0, 0, 0, 0)
  return dayOf >= start && dayOf <= end
}


/**
 * An IST timestamp as the tables show it — "Sep 29, 2026 12:14 PM (IST)" — for the places
 * outside a DataTable that have no DATE column to do it (the detail sheet).
 */
export function formatIst(iso: string) {
  if (iso === EMPTY) return EMPTY
  const date = new Date(iso)
  const text = date.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${text.replace(/, (\d{2}:)/, ' $1')} (IST)`
}

/** Lucide size for a stat tile's title icon. */
export const STAT_ICON = 16

// ─── Columns ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

export const amount = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 3 })

/**
 * Money in a column: never fewer than two decimals, so 2,014,429.3 reads 2,014,429.30 and
 * the decimals line up with its neighbours'. Up to three, which the recon data carries.
 */
export const money = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })

export const textCol = <T extends Row>(
  field: keyof T & string,
  header: string,
  width?: string,
): ColumnDefinition<T> => ({
  field,
  header,
  type: ColumnType.TEXT,
  ...(width ? { minWidth: width, maxWidth: width } : {}),
})

/**
 * A long ID, middle-truncated to its first and last ten characters, whole in a tooltip —
 * see TruncatedId. A TEXT column still, so it sorts and filters on the full value.
 */
export const idCol = <T extends Row>(
  field: keyof T & string,
  header: string,
  { copyable = false }: { copyable?: boolean } = {},
): ColumnDefinition<T> => ({
  field,
  header,
  type: ColumnType.TEXT,
  renderCell: (value) =>
    copyable ? <CopyableId value={value} label={header} /> : <TruncatedId value={value} />,
  // Room for the 21 characters it draws, plus the header's grip and menu.
  minWidth: '200px',
})

/**
 * An ID drawn whole, with a copy glyph — Settlement ID, Payment ID, the UTRs, File Uuid.
 * Same optional fixed width as textCol, so the columns that were sized to hold a UUID still
 * do; still a TEXT column, so it sorts and filters on the value.
 */
export const copyCol = <T extends Row>(
  field: keyof T & string,
  header: string,
  width?: string,
): ColumnDefinition<T> => ({
  field,
  header,
  type: ColumnType.TEXT,
  ...(width ? { minWidth: width, maxWidth: width } : {}),
  renderCell: (value) => <CopyableId value={value} label={header} truncate={false} />,
})

export const amountCol = <T extends Row>(
  field: keyof T & string,
  header: string,
): ColumnDefinition<T> => ({
  field,
  header,
  type: ColumnType.NUMBER,
  renderCell: (value) => <AmountCell>{money(value)}</AmountCell>,
  // Wide enough for the header — "Settlement Amount" is the longest label these tables carry.
  minWidth: '168px',
})

export const statusCol = <T extends Row>(
  field: keyof T & string,
  header: string,
  colors?: StatusColors,
): ColumnDefinition<T> => ({
  field,
  header,
  type: ColumnType.TEXT,
  renderCell: (value) => <StatusTag status={value} colors={colors} />,
})

/** A timestamp, with DataTable's own muted "(IST)" after it (TableCell/index.tsx:150). */
export const dateCol = <T extends Row>(
  field: keyof T & string,
  header: string,
): ColumnDefinition<T> => ({
  field,
  header,
  type: ColumnType.DATE,
  dateFormat: 'MMM DD, YYYY hh:mm A',
  dateLabel: '(IST)',
  minWidth: '200px',
})

/**
 * A column that draws something rather than showing a field — an icon action, a pair of
 * them. Its `key` is not a field of the row, deliberately: DataTable keys every cell as
 * `${rowId}-${index}-${field}` (and the header by field alone), so two columns reading the
 * same field collide. A made-up key keeps each drawn column distinct; the row reaches
 * `render` whole, so the column never needed the field's value anyway.
 */
export const elementCol = <T extends Row>(
  key: string,
  header: string,
  render: (row: T) => ReactNode,
): ColumnDefinition<T> => ({
  field: key as keyof T,
  header,
  type: ColumnType.REACT_ELEMENT,
  isSortable: false,
  renderCell: (_value, row) => render(row),
})

// ─── Table ───────────────────────────────────────────────────────────────────────────────

/**
 * Row selection that the page can read. DataTable owns the checkboxes and reports every
 * change as the full list of selected ids, so this only has to hold on to the latest.
 */
export function useSelection() {
  const [selected, setSelected] = useState<string[]>([])
  const [tableKey, setTableKey] = useState(0)
  const onRowSelectionChange = useCallback((ids: string[]) => setSelected(ids), [])
  /**
   * blend-gap: DataTable keeps its checkboxes in its own state and takes no prop to clear
   * them (DataTable.tsx:316), so clearing from outside the table — a Deselect all of our own —
   * means remounting it. Pass `tableKey` as the table's `key`. Everything else DataTable
   * holds goes with it — its sort, which a page can hand back through `defaultSort`, and its
   * header filters, which nothing can (see `deselectAll` in ReconSummary.tsx). Paging is
   * ours (usePaged) and survives.
   */
  const clear = useCallback(() => {
    setSelected([])
    setTableKey((key) => key + 1)
  }, [])
  return { selected, onRowSelectionChange, clear, tableKey }
}

/** Rows per page every PACB table opens at. Change it here, not at a call site. */
export const DEFAULT_PAGE_SIZE = 10

/**
 * Client-side paging, sliced here rather than inside DataTable so the footer's count is the
 * filtered total and the page resets when the filter shrinks the set under it.
 */
export function usePaged<T>(rows: T[], initialSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialSize)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => rows.slice((current - 1) * pageSize, current * pageSize),
    [rows, current, pageSize],
  )
  return {
    pageRows,
    pagination: {
      pagination: {
        currentPage: current,
        pageSize,
        totalRows: rows.length,
        pageSizeOptions: [5, 10, 20, 50],
      },
      serverSidePagination: true,
      onPageChange: setPage,
      onPageSizeChange: (size: number) => {
        setPageSize(size)
        setPage(1)
      },
    } satisfies Partial<DataTableProps<Row>>,
  }
}

/**
 * File Status is the file's whole life in one column — Pending, Created, Staged — so the
 * three read as steps: amber, blue, green. The module-wide map has STAGED amber (it is one
 * of several statuses on the Form tab), which would make the first and last steps match.
 */
export const FILE_STATUS_COLORS: StatusColors = {
  PENDING: TagV2Color.WARNING,
  CREATED: TagV2Color.PRIMARY,
  STAGED: TagV2Color.SUCCESS,
}
