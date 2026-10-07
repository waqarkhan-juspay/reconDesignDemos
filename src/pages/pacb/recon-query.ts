/**
 * Filter and sort for the Payment Info Generator, driven from the table's own column headers.
 * Kept out of the component file so that file exports only components and keeps fast refresh.
 *
 * DataTable draws the header menus — sort on every column, a value list on the text columns,
 * a date range on Created At — and reports each change through `onFilterChange` and
 * `onSortChange`. It never applies them itself here: paging is ours (usePaged), and with
 * `serverSidePagination` DataTable passes `data` straight through (DataTable.tsx:536). So
 * the page applies the query, and the totals and Generate act on the same rows the table
 * shows.
 */

import {
  ColumnType,
  FilterType,
  SortDirection,
  type ColumnDefinition,
  type ColumnFilter,
  type SortConfig,
} from '@juspay/blend-design-system'
import type { ReconRow } from './data'
import { inRange, rangeOf } from './helpers'

/**
 * The columns that filter by value — pick any of the values the rows in range actually have.
 * Amounts are sort-only: a list of 30 distinct amounts is not a filter anyone can use.
 */
const FILTERABLE = new Set<string>([
  'reconId',
  'piStatus',
  'entityId',
  'lineOfBusiness',
  'paymentEntity',
  'businessType',
  'purposeCode',
  'paymentId',
  'settlementId',
  'adUtrNo',
  'merchantUtrNo',
])

export type ReconQuery = {
  /** As DataTable reports them — one entry per column with a filter on it. */
  filters: ColumnFilter[]
  /** Null keeps the rows in their own order — newest first, as the data comes. */
  sort: SortConfig | null
}

export const EMPTY_QUERY: ReconQuery = { filters: [], sort: null }

/** Text order with numbers read as numbers — "S9" before "S10". Built once, not per compare. */
const collator = new Intl.Collator('en', { numeric: true })

/** The distinct values a field has across these rows, in a stable order. */
const valuesOf = (rows: ReconRow[], field: keyof ReconRow) =>
  [...new Set(rows.map((row) => String(row[field])))].sort(collator.compare)

/**
 * The columns with a value filter in their header menu. DataTable offers one only on its
 * select-like types (columnTypes.ts getColumnTypeConfig — TEXT has `supportsFiltering:
 * false`), so the filterable text columns become MULTISELECT. A plain string still renders
 * as text in that type (utils.ts:1160), and any `renderCell` the column has still wins.
 *
 * The options are listed from every row in range, not left to DataTable — it would list
 * them from `data`, which is only the page on screen.
 */
export function withColumnFilters(
  columns: ColumnDefinition<ReconRow>[],
  rows: ReconRow[],
): ColumnDefinition<ReconRow>[] {
  return columns.map((column) =>
    FILTERABLE.has(String(column.field))
      ? ({
          ...column,
          type: ColumnType.MULTISELECT,
          filterType: FilterType.MULTISELECT,
          filterOptions: valuesOf(rows, column.field).map((value) => ({
            id: value,
            label: value,
            value,
          })),
        } as ColumnDefinition<ReconRow>)
      : column,
  )
}

/** A sort with no direction is DataTable saying the sort was cleared. */
export const sortFrom = (config: SortConfig): SortConfig | null =>
  config.direction === SortDirection.NONE ? null : config

/**
 * The query with anything on a column the table no longer shows taken out — a filter left
 * on a hidden column would narrow the rows with nothing on screen saying so. DataTable keeps
 * it, so it applies again, and shows again, when the column comes back.
 */
export function withinColumns({ filters, sort }: ReconQuery, fields: string[]): ReconQuery {
  const shown = new Set(fields)
  return {
    filters: filters.filter(({ field }) => shown.has(String(field))),
    sort: sort && shown.has(sort.field) ? sort : null,
  }
}

const isEmpty = (value: ColumnFilter['value']) =>
  Array.isArray(value) ? value.length === 0 || value.every((v) => !v) : value === ''

/** One filter as a row test — a date filter's range is built once, not once per row. */
function matcher({ field, type, value }: ColumnFilter): (row: ReconRow) => boolean {
  const cell = (row: ReconRow) => String(row[field as keyof ReconRow])
  if (type === FilterType.DATE && Array.isArray(value)) {
    const [from, to = from] = value
    const range = rangeOf(from, to)
    return (row) => inRange(cell(row), range)
  }
  return Array.isArray(value)
    ? (row) => value.includes(cell(row))
    : (row) => cell(row) === String(value)
}

const sortValue = (row: ReconRow, field: string): string | number => {
  const value = row[field as keyof ReconRow]
  return field === 'createdAt' || field === 'updatedAt' ? Date.parse(String(value)) : value
}

export function applyQuery(rows: ReconRow[], { filters, sort }: ReconQuery) {
  const tests = filters.filter(({ value }) => !isEmpty(value)).map(matcher)
  const kept = tests.length ? rows.filter((row) => tests.every((test) => test(row))) : rows
  if (!sort) return kept
  const sign = sort.direction === SortDirection.ASCENDING ? 1 : -1
  return [...kept].sort((a, b) => {
    const x = sortValue(a, sort.field)
    const y = sortValue(b, sort.field)
    return typeof x === 'number' && typeof y === 'number'
      ? (x - y) * sign
      : collator.compare(String(x), String(y)) * sign
  })
}
