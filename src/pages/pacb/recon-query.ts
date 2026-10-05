/**
 * Filter and sort for the Payment Info Generator, over every field its row detail sheet
 * shows (ReconDetailSheet.tsx). Kept out of the component file so that file exports only
 * components and keeps fast refresh.
 *
 * Text fields filter by value — pick any of the values the rows in range actually have.
 * Numbers and timestamps are sort-only: a value list of 30 distinct amounts is not a filter
 * anyone can use, and the date range already scopes the timestamps.
 */

import type { ReconRow } from './data'

export type FilterField =
  | 'reconId'
  | 'piStatus'
  | 'entityId'
  | 'lineOfBusiness'
  | 'paymentEntity'
  | 'businessType'
  | 'purposeCode'
  | 'paymentId'
  | 'settlementId'
  | 'adUtrNo'
  | 'merchantUtrNo'

/** In the sheet's order — Recon, Merchant, References — so the two read the same way. */
export const FILTER_FIELDS: FieldOption<FilterField>[] = [
  { field: 'reconId', label: 'Recon ID' },
  { field: 'piStatus', label: 'PI Generation Status' },
  { field: 'entityId', label: 'Entity ID' },
  { field: 'lineOfBusiness', label: 'Line of Business' },
  { field: 'paymentEntity', label: 'Payment Entity' },
  { field: 'businessType', label: 'Business Type' },
  { field: 'purposeCode', label: 'Purpose Code' },
  { field: 'paymentId', label: 'Payment ID' },
  { field: 'settlementId', label: 'Settlement ID' },
  { field: 'adUtrNo', label: 'AD UTR No' },
  { field: 'merchantUtrNo', label: 'Merchant UTR No' },
]

export type SortField =
  | FilterField
  | 'createdAt'
  | 'updatedAt'
  | 'orderAmount'
  | 'refundAmount'
  | 'chargebackAmount'
  | 'disputeAmount'
  | 'feeAmount'
  | 'taxAmount'
  | 'surchargeAmount'
  | 'holdAmount'
  | 'releaseAmount'
  | 'settlementAmount'
  | 'totalCount'

/** Every field in the sheet, grouped as the sheet groups them. */
export const SORT_GROUPS: { groupLabel: string; items: FieldOption<SortField>[] }[] = [
  {
    groupLabel: 'Recon',
    items: [
      { field: 'reconId', label: 'Recon ID' },
      { field: 'piStatus', label: 'PI Generation Status' },
      { field: 'createdAt', label: 'Created At' },
      { field: 'updatedAt', label: 'Updated At' },
    ],
  },
  {
    groupLabel: 'Merchant',
    items: [
      { field: 'entityId', label: 'Entity ID' },
      { field: 'lineOfBusiness', label: 'Line of Business' },
      { field: 'paymentEntity', label: 'Payment Entity' },
      { field: 'businessType', label: 'Business Type' },
      { field: 'purposeCode', label: 'Purpose Code' },
    ],
  },
  {
    groupLabel: 'Settlement breakdown',
    items: [
      { field: 'orderAmount', label: 'Order Amount' },
      { field: 'refundAmount', label: 'Refund Amount' },
      { field: 'chargebackAmount', label: 'Chargeback Amount' },
      { field: 'disputeAmount', label: 'Dispute Amount' },
      { field: 'feeAmount', label: 'Fee Amount' },
      { field: 'taxAmount', label: 'Tax Amount' },
      { field: 'surchargeAmount', label: 'Surcharge Amount' },
      { field: 'holdAmount', label: 'Hold Amount' },
      { field: 'releaseAmount', label: 'Release Amount' },
      { field: 'settlementAmount', label: 'Settlement Amount' },
      { field: 'totalCount', label: 'Total Count' },
    ],
  },
  {
    groupLabel: 'References',
    items: [
      { field: 'paymentId', label: 'Payment ID' },
      { field: 'settlementId', label: 'Settlement ID' },
      { field: 'adUtrNo', label: 'AD UTR No' },
      { field: 'merchantUtrNo', label: 'Merchant UTR No' },
    ],
  },
]

export type FieldOption<F> = { field: F; label: string }
export type SortGroup = { groupLabel?: string; items: FieldOption<SortField>[] }

/** What the panel offers: which fields filter, and which sort, grouped for the menu. */
export type QueryOptions = { filter: FieldOption<FilterField>[]; sort: SortGroup[] }

/** Version 1 — every field in the row detail sheet. */
export const SHEET_OPTIONS: QueryOptions = { filter: FILTER_FIELDS, sort: SORT_GROUPS }

const FILTERABLE = new Set<string>(FILTER_FIELDS.map(({ field }) => field))
const SORTABLE = new Set<string>(SORT_GROUPS.flatMap(({ items }) => items.map(({ field }) => field)))

/**
 * Version 2 — only what the table shows: its columns, under its own header names and in its
 * own order, so the panel never offers a field you would have to open a row to see.
 */
export function tableOptions(columns: { field: string; label: string }[]): QueryOptions {
  return {
    filter: columns.filter(({ field }) => FILTERABLE.has(field)) as FieldOption<FilterField>[],
    sort: [{ items: columns.filter(({ field }) => SORTABLE.has(field)) as FieldOption<SortField>[] }],
  }
}

/**
 * The query with anything the panel no longer offers taken out — a filter left on a column
 * the table has since hidden would narrow the rows with nothing on screen saying so.
 */
export function withinOptions({ filters, sort }: ReconQuery, options: QueryOptions): ReconQuery {
  const filterable = new Set(options.filter.map(({ field }) => field))
  const sortable = new Set(options.sort.flatMap(({ items }) => items.map(({ field }) => field)))
  return {
    filters: Object.fromEntries(
      Object.entries(filters).filter(([field]) => filterable.has(field as FilterField)),
    ),
    sort: sort && sortable.has(sort.field) ? sort : null,
  }
}

export type SortDirection = 'asc' | 'desc'

export type ReconQuery = {
  /** Per field, the values a row must have one of. An empty or missing list filters nothing. */
  filters: Partial<Record<FilterField, string[]>>
  /** Null keeps the rows in their own order — newest first, as the data comes. */
  sort: { field: SortField; direction: SortDirection } | null
}

export const EMPTY_QUERY: ReconQuery = { filters: {}, sort: null }

/** How many filter fields are in use — what the Filters button counts. */
export const activeFilterCount = (query: ReconQuery) =>
  Object.values(query.filters).filter((values) => values && values.length > 0).length

const sortValue = (row: ReconRow, field: SortField): string | number =>
  field === 'totalCount'
    ? row.orderCount + row.refundCount
    : field === 'createdAt' || field === 'updatedAt'
      ? Date.parse(row[field])
      : row[field]

export function applyQuery(rows: ReconRow[], { filters, sort }: ReconQuery) {
  const active = Object.entries(filters).filter(([, values]) => values && values.length > 0) as [
    FilterField,
    string[],
  ][]
  const kept = active.length
    ? rows.filter((row) => active.every(([field, values]) => values.includes(String(row[field]))))
    : rows
  if (!sort) return kept
  const sign = sort.direction === 'asc' ? 1 : -1
  return [...kept].sort((a, b) => {
    const x = sortValue(a, sort.field)
    const y = sortValue(b, sort.field)
    return typeof x === 'number' && typeof y === 'number'
      ? (x - y) * sign
      : String(x).localeCompare(String(y), 'en', { numeric: true }) * sign
  })
}

/** The distinct values a field has across these rows, in a stable order. */
export const valuesOf = (rows: ReconRow[], field: FilterField) =>
  [...new Set(rows.map((row) => String(row[field])))].sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  )
