/**
 * Demo settlements for the PACB Workflow sandbox's list — 152 of them, the count the page
 * header's search names. Seeded, so the list is the same on every reload.
 *
 * Dated relative to the real "now", not a fixed demo date, so the Today / Yesterday / Older
 * groups always have something in them. The first eight are the design's own list (PACB
 * Figma node 39:34902), in its order; the rest fill in behind them, older.
 */

import type { DateRange } from '@juspay/blend-design-system'
import {
  BUSINESS_TYPE,
  componentsOf,
  EMPTY,
  PAYMENT_ENTITY,
  PURPOSE_CODE,
  type ReconRow,
} from './data'
import { DAY_MS, dayStart, HOUR_MS } from './dates'
import type { MerchantPayment } from './PaymentCard'
import type { FilterGroup } from './FilterPanel'
import { digits, hex, seeded, seedOf, uuid } from './seed'
import type { Settlement, SettlementStatus } from './SettlementCard'

const SETTLEMENT_COUNT = 152

/**
 * Failed settlements — the red card, its "Failed" filter option, its Playground story. Hidden
 * on 2026-10-07 until asked for again; flip to `true` and every one of them returns. The data
 * is still generated with them, so the other settlements do not change when they come back.
 */
export const SHOW_FAILED = false

// Seeded, so the padding is stable across reloads.
const rand = seeded(152)
const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)]!

const settlementId = () => `sid-${hex(rand, 24)}`
const utr = (next = rand) => `YESAP${digits(next, 11)}`

const FAILURE_REASONS = [
  'Failed due to lack of funds',
  'Beneficiary account inactive',
  'Bank server timeout',
]

const now = Date.now()
const todayStart = dayStart(now)

/**
 * When each of the design's cards settled, placed so it lands in its group whatever the time
 * of day: today's a few minutes apart before now, yesterday's and the older ones in the
 * evening of their day.
 */
const TODAY = (minutesAgo: number) => now - minutesAgo * 60 * 1000
const DAYS_BACK = (days: number, hour: number) => todayStart - days * DAY_MS + hour * HOUR_MS

type Shape = Pick<Settlement, 'status' | 'merchantPayments' | 'pendingPayments'> & {
  at: number
  amount: number
}

/** The design's list: four today, two yesterday, two older. */
const DESIGN: Shape[] = [
  { status: 'MOVED', merchantPayments: 9, pendingPayments: 0, at: TODAY(2), amount: 2723731.75 },
  { status: 'FAILED', merchantPayments: 9, at: TODAY(9), amount: 2723731.75 },
  { status: 'AWAITING_OCA', merchantPayments: 83, at: TODAY(16), amount: 2723731.75 },
  { status: 'MOVED', merchantPayments: 1, pendingPayments: 1, at: TODAY(23), amount: 943.11 },
  // Five pending, so its payments show all five of a pending payment's stages (paymentDetailOf).
  {
    status: 'MOVED',
    merchantPayments: 9,
    pendingPayments: 5,
    at: DAYS_BACK(1, 18.7),
    amount: 943.11,
  },
  { status: 'AWAITING_OCA', merchantPayments: 83, at: DAYS_BACK(1, 15), amount: 2723731.75 },
  {
    status: 'MOVED',
    merchantPayments: 9,
    pendingPayments: 0,
    at: DAYS_BACK(2, 18.7),
    amount: 2723731.75,
  },
  {
    status: 'MOVED',
    merchantPayments: 9,
    pendingPayments: 0,
    at: DAYS_BACK(2, 12),
    amount: 2723731.75,
  },
]

/**
 * Everything older than the design's list is settled: moved to the OCA with every merchant
 * payment out, so the Older group is all successful. The states that need attention are
 * Today's and Yesterday's.
 */
function padding(count: number, from: number): Shape[] {
  let at = from
  return Array.from({ length: count }, () => {
    at -= (2 + rand() * 10) * HOUR_MS
    return {
      status: 'MOVED',
      merchantPayments: 1 + Math.floor(rand() * 90),
      pendingPayments: 0,
      at,
      amount: Math.round(rand() * 5_000_000 * 100) / 100,
    }
  })
}

const SHAPES = [...DESIGN, ...padding(SETTLEMENT_COUNT - DESIGN.length, DAYS_BACK(2, 12))]

const ALL_SETTLEMENTS: Settlement[] = SHAPES.map(({ at, ...shape }) => ({
  ...shape,
  settlementId: settlementId(),
  settledAt: new Date(at).toISOString(),
  utr: shape.status === 'MOVED' ? utr() : undefined,
  failureReason: shape.status === 'FAILED' ? pick(FAILURE_REASONS) : undefined,
}))

/** Every settlement the list shows — less the failed ones while SHOW_FAILED is off. */
export const SETTLEMENTS = SHOW_FAILED
  ? ALL_SETTLEMENTS
  : ALL_SETTLEMENTS.filter(({ status }) => status !== 'FAILED')

// ─── Filters ──────────────────────────────────────────────────────────────────────────────

const ALL_STATUS_OPTIONS: { value: SettlementStatus; label: string }[] = [
  { value: 'MOVED', label: 'Successful' },
  { value: 'AWAITING_OCA', label: 'Awaiting OCA' },
  { value: 'FAILED', label: 'Failed' },
]

/** The Filters menu's Status group — no "Failed" while SHOW_FAILED is off. */
export const STATUS_OPTIONS = ALL_STATUS_OPTIONS.filter(
  ({ value }) => SHOW_FAILED || value !== 'FAILED',
)

type PayoutStatus = 'ALL_SUCCESSFUL' | 'SOME_PENDING' | 'ALL_PENDING'

export const PAYOUT_OPTIONS: { value: PayoutStatus; label: string }[] = [
  { value: 'ALL_SUCCESSFUL', label: 'All Successful' },
  { value: 'SOME_PENDING', label: 'Some Pending' },
  { value: 'ALL_PENDING', label: 'All Pending' },
]

/** Where a settlement's merchant payments are — null until its money has moved. */
function payoutOf({ status, merchantPayments, pendingPayments = 0 }: Settlement) {
  if (status !== 'MOVED') return null
  if (pendingPayments === 0) return 'ALL_SUCCESSFUL'
  return pendingPayments >= merchantPayments ? 'ALL_PENDING' : 'SOME_PENDING'
}

/**
 * The Filter panel's choices, over merchant payments. Empty means "any". A settlement passes
 * when at least one of its payments does; its payments column then lists only those.
 */
export type PaymentFilters = {
  entityIds: string[]
  linesOfBusiness: string[]
  purposeCodes: string[]
}

export const NO_PAYMENT_FILTERS: PaymentFilters = {
  entityIds: [],
  linesOfBusiness: [],
  purposeCodes: [],
}

/** Every demo payment carries the module's one purpose code. */
const purposeCodeOf = (_payment: MerchantPayment) => PURPOSE_CODE

const isFiltering = (f: PaymentFilters) =>
  f.entityIds.length + f.linesOfBusiness.length + f.purposeCodes.length > 0

function paymentPasses(payment: MerchantPayment, f: PaymentFilters) {
  return (
    (!f.entityIds.length || f.entityIds.includes(payment.entityId)) &&
    (!f.linesOfBusiness.length || f.linesOfBusiness.includes(payment.lineOfBusiness)) &&
    (!f.purposeCodes.length || f.purposeCodes.includes(purposeCodeOf(payment)))
  )
}

/**
 * A settlement's payments as its column lists them: those the filters let through and, when
 * the search names payment IDs in this settlement, only those — a search for a payment opens
 * on that payment.
 */
export function paymentsShown(settlement: Settlement, filters: PaymentFilters, query: string) {
  const passing = paymentsOf(settlement).filter((payment) => paymentPasses(payment, filters))
  const needle = query.trim().toLowerCase()
  const named = needle
    ? passing.filter(({ paymentId }) => paymentId.toLowerCase().includes(needle))
    : []
  return named.length ? named : passing
}

/** Each filter's values, from the payments of the settlements in the range — sorted. */
export function paymentFilterOptions(rows: Settlement[]) {
  const sets = {
    entityIds: new Set<string>(),
    linesOfBusiness: new Set<string>(),
    purposeCodes: new Set<string>(),
  }
  for (const row of rows) {
    for (const payment of paymentsOf(row)) {
      sets.entityIds.add(payment.entityId)
      sets.linesOfBusiness.add(payment.lineOfBusiness)
      sets.purposeCodes.add(purposeCodeOf(payment))
    }
  }
  const sorted = (set: Set<string>) => [...set].sort()
  return {
    entityIds: sorted(sets.entityIds),
    linesOfBusiness: sorted(sets.linesOfBusiness),
    purposeCodes: sorted(sets.purposeCodes),
  }
}

/** The Filter panel's groups, over the payments of `rows` (the settlements in the range). */
export function paymentFilterGroups(rows: Settlement[]): FilterGroup<keyof PaymentFilters>[] {
  const options = paymentFilterOptions(rows)
  return [
    { key: 'entityIds', label: 'Entity ID', options: options.entityIds },
    { key: 'linesOfBusiness', label: 'Line of Business', options: options.linesOfBusiness },
    { key: 'purposeCodes', label: 'Purpose Code', options: options.purposeCodes },
  ]
}

/**
 * Where a settlement's money and payouts are, as the cards colour it: `success` moved with
 * every payout out, `progress` moved with some still pending, `pending` still in escrow,
 * `failed` the movement failed.
 */
export type SettlementTone = 'success' | 'progress' | 'pending' | 'failed'

export function settlementTone({ status, pendingPayments = 0 }: Settlement): SettlementTone {
  if (status === 'FAILED') return 'failed'
  if (status === 'AWAITING_OCA') return 'pending'
  return pendingPayments > 0 ? 'progress' : 'success'
}

type SettlementFilters = {
  /**
   * The page's one search: matched, case-insensitively, against the settlement ID, its UTR,
   * and the IDs of its merchant payments.
   */
  query?: string
  /** Calendar days, ends included, in the viewer's time zone — the days the groups use. */
  range?: DateRange
  /** The list's own Status / Merchant Payment Status chips (SHOW_LIST_FILTERS). */
  statuses?: string[]
  payouts?: string[]
  payments?: PaymentFilters
}

export function filterSettlements(
  rows: Settlement[],
  {
    query = '',
    range,
    statuses = [],
    payouts = [],
    payments = NO_PAYMENT_FILTERS,
  }: SettlementFilters,
) {
  const needle = query.trim().toLowerCase()
  const from = range && dayStart(range.startDate.getTime())
  const to = range && dayStart((range.endDate ?? range.startDate).getTime())
  return rows.filter((row) => {
    if (from !== undefined && to !== undefined) {
      const day = dayStart(Date.parse(row.settledAt))
      if (day < from || day > to) return false
    }
    if (statuses.length && !statuses.includes(row.status)) return false
    // A payout filter keeps only settlements whose money has moved — the others have no
    // payout status to match.
    if (payouts.length && !payouts.includes(payoutOf(row) ?? '')) return false
    if (isFiltering(payments) && !paymentsOf(row).some((p) => paymentPasses(p, payments))) {
      return false
    }
    if (!needle) return true
    return (
      row.settlementId.toLowerCase().includes(needle) ||
      (row.utr ?? '').toLowerCase().includes(needle) ||
      paymentsOf(row).some(({ paymentId }) => paymentId.toLowerCase().includes(needle))
    )
  })
}

// ─── Grouping ─────────────────────────────────────────────────────────────────────────────

type DayGroup = { label: 'Today' | 'Yesterday' | 'Older'; rows: Settlement[] }

/** Newest first, in Today / Yesterday / Older. Empty groups are dropped. */
export function groupByDay(rows: Settlement[], at = Date.now()): DayGroup[] {
  const today = dayStart(at)
  const groups: DayGroup[] = [
    { label: 'Today', rows: [] },
    { label: 'Yesterday', rows: [] },
    { label: 'Older', rows: [] },
  ]
  const sorted = [...rows].sort((a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt))
  for (const row of sorted) {
    const day = dayStart(Date.parse(row.settledAt))
    groups[day >= today ? 0 : day >= today - DAY_MS ? 1 : 2]!.rows.push(row)
  }
  return groups.filter(({ rows }) => rows.length)
}

// ─── Merchant payments ────────────────────────────────────────────────────────────────────

/** Entity · line-of-business pairs, from the design's payments list (node 39:34927). */
const MERCHANTS: [string, string][] = [
  ['jpappx', 'jpconx'],
  ['abcgroup', 'abclink'],
  ['lmntyp', 'lmcon'],
  ['trendyco', 'trendlab'],
  ['superbiz', 'supersite'],
  ['dynamics', 'dynalink'],
  ['futuretech', 'futurenet'],
]

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

const paymentCache = new Map<string, MerchantPayment[]>()

/**
 * A settlement's merchant payments — `merchantPayments` of them, splitting its amount, with
 * `pendingPayments` still pending and listed first (as the design lists them). Until the
 * money has moved to the OCA, none can have gone out, so every one is pending.
 *
 * Generated on first ask and kept, rather than all 152 settlements' worth up front.
 */
export function paymentsOf(settlement: Settlement): MerchantPayment[] {
  const cached = paymentCache.get(settlement.settlementId)
  if (cached) return cached

  const next = seeded(seedOf(settlement.settlementId))
  const count = settlement.merchantPayments
  const pending =
    settlement.status === 'MOVED' ? Math.min(settlement.pendingPayments ?? 0, count) : count
  const weights = Array.from({ length: count }, () => 0.2 + next())
  const total = weights.reduce((sum, w) => sum + w, 0)
  let left = Math.round(settlement.amount * 100)
  const payments = weights.map((weight, i): MerchantPayment => {
    // The last takes what is left, so the payments always add up to the settlement.
    const paise = i === count - 1 ? left : Math.round((settlement.amount * 100 * weight) / total)
    left -= paise
    const [entityId, lineOfBusiness] = MERCHANTS[Math.floor(next() * MERCHANTS.length)]!
    return {
      paymentId: `PS68${Array.from({ length: 6 }, () => ID_CHARS[Math.floor(next() * 36)]).join('')}`,
      amount: paise / 100,
      entityId,
      lineOfBusiness,
      status: i < pending ? 'PENDING' : 'SUCCESS',
    }
  })
  paymentCache.set(settlement.settlementId, payments)
  return payments
}

export const PAYMENT_STATUS_OPTIONS: { value: MerchantPayment['status']; label: string }[] = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'PENDING', label: 'Pending' },
]

/** The last `days` calendar days, today included. */
export function lastDays(days: number, at = Date.now()): DateRange {
  const end = new Date(dayStart(at))
  return { startDate: new Date(end.getTime() - (days - 1) * DAY_MS), endDate: end }
}

// ─── Payment detail ───────────────────────────────────────────────────────────────────────

export type PaymentFileRecord = {
  name: string
  uuid: string
  /** ISO timestamps. */
  createdAt: string
  stagedAt: string
}

/** Everything the payment detail panel shows beyond the row itself (PACB Figma 44:13275). */
export type PaymentDetail = {
  /** The payout's own UTR. A dash while the payment is pending. */
  merchantUtr: string
  /** Whether the payment file is in — the first step. */
  paymentFileReady: boolean
  paymentFile: PaymentFileRecord
  supportingFile: PaymentFileRecord
  /** Whether PACB has accepted the supporting file — the stepper's second step. */
  supportingAccepted: boolean
  form145FileId: string
  /** Which forms are already in, as the panel opens. */
  formsUploaded: ('145' | '146')[]
  /** The transaction report, which comes before the payout's own report (MPR). */
  transactionReport: { status: 'GENERATED' | 'PENDING'; createdAt: string; uuid: string }
  report: { status: 'GENERATED' | 'PENDING'; createdAt: string }
}

/** "23092026105650" — the ddMMyyyyHHmmss stamp PACB writes into its file names, in IST. */
const fileStamp = (iso: string) => {
  const ist = new Date(Date.parse(iso) + 5.5 * HOUR_MS)
  const two = (n: number) => String(n).padStart(2, '0')
  return (
    two(ist.getUTCDate()) +
    two(ist.getUTCMonth() + 1) +
    ist.getUTCFullYear() +
    two(ist.getUTCHours()) +
    two(ist.getUTCMinutes()) +
    two(ist.getUTCSeconds())
  )
}

/**
 * Where a pending payment has got to: how many of its five steps are done, in order —
 * Payment file, Supporting file, Form 145/146, Transaction Report, then the MPR, which only
 * comes with the payout. A settlement's pending payments step through the stages in list
 * order, so its first is at nothing done and each after it one step further:
 *
 * | Pending payment | Done                                          |
 * |-----------------|-----------------------------------------------|
 * | 1st             | nothing                                       |
 * | 2nd             | Payment file                                  |
 * | 3rd             | + Supporting file                             |
 * | 4th             | + Form 145/146 (both forms in)                |
 * | 5th             | + Transaction Report — only the MPR is left   |
 *
 * and round again from the 6th.
 */
const PENDING_STAGE_COUNT = 5

/**
 * A payment's detail, seeded by its ID so it is the same on every visit. Files are created a
 * few hours before the settlement lands and staged with it; a paid-out payment has every step
 * done, a pending one is at its stage in the table above.
 */
export function paymentDetailOf(settlement: Settlement, payment: MerchantPayment): PaymentDetail {
  const next = seeded(seedOf(payment.paymentId + settlement.settlementId))
  const settled = Date.parse(settlement.settledAt)
  const created = new Date(settled - (2 + next() * 20) * HOUR_MS).toISOString()
  const paid = payment.status === 'SUCCESS'
  const file = (name: string): PaymentFileRecord => ({
    name,
    uuid: uuid(next),
    createdAt: created,
    stagedAt: settlement.settledAt,
  })
  // Pending payments lead their settlement's list (paymentsOf), so a pending payment's
  // place in the list is its place among the pending.
  const pendingIndex = paymentsOf(settlement).findIndex(
    ({ paymentId }) => paymentId === payment.paymentId,
  )
  const done = paid ? PENDING_STAGE_COUNT : Math.max(0, pendingIndex) % PENDING_STAGE_COUNT
  return {
    merchantUtr: paid ? utr(next) : EMPTY,
    paymentFileReady: done >= 1,
    paymentFile: file(`JuspayA2_${payment.entityId}_${fileStamp(created)}.txt.gpg`),
    supportingFile: file(
      `JuspayNonLRSSUP_${payment.paymentId}_${payment.entityId}_PACB_${fileStamp(created)}.zip`,
    ),
    supportingAccepted: done >= 2,
    form145FileId: uuid(next),
    formsUploaded: done >= 3 ? ['145', '146'] : [],
    transactionReport: {
      status: done >= 4 ? 'GENERATED' : 'PENDING',
      createdAt: created,
      uuid: uuid(next),
    },
    report: { status: paid ? 'GENERATED' : 'PENDING', createdAt: created },
  }
}

/**
 * A merchant payment as the Payment Info Generator's row — the recon it was generated from —
 * so Version 3's View details can open that page's own detail sheet (ReconDetailSheet) on it.
 * A payment exists only once its payment info has been generated, so the row is GENERATED;
 * its parts are the same split of the amount the generator's rows use. Seeded by the payment,
 * so the sheet shows the same recon on every visit.
 */
export function reconRowOf(
  settlement: Settlement,
  payment: MerchantPayment,
  /** The payment's detail, when the caller already has it. */
  detail = paymentDetailOf(settlement, payment),
): ReconRow {
  const next = seeded(seedOf(`recon-${payment.paymentId}${settlement.settlementId}`))
  return {
    rowId: `recon-${payment.paymentId}`,
    reconId: uuid(next),
    paymentId: payment.paymentId,
    entityId: payment.entityId,
    lineOfBusiness: payment.lineOfBusiness,
    purposeCode: PURPOSE_CODE,
    businessType: BUSINESS_TYPE,
    paymentEntity: PAYMENT_ENTITY,
    piStatus: 'GENERATED',
    settlementAmount: payment.amount,
    adUtrNo: settlement.utr ?? EMPTY,
    merchantUtrNo: detail.merchantUtr,
    settlementId: settlement.settlementId,
    createdAt: detail.paymentFile.createdAt,
    updatedAt: settlement.settledAt,
    ...componentsOf(payment.amount, next),
  }
}
