/**
 * The transactions behind one Payment Info Generator row — what the detail sheet's View
 * transactions opens. Demo data, seeded from the row so it is the same on every open.
 *
 * They add up to the row: `orderCount` orders sharing `orderAmount`, `refundCount` refunds
 * sharing `refundAmount`, each order paying the 0.35% fee and 18% tax on it that data.ts
 * builds the settlement from. So the table and the sheet's Settlement breakdown agree.
 */

import { FEE_RATE, r3, TAX_RATE, type ReconRow } from './data'
import { hex, seeded, seedOf } from './seed'

export type TransactionType = 'ORDER' | 'REFUND'

export type ReconTransaction = {
  /** Row identity — unique within one recon's transactions. */
  txnId: string
  orderId: string
  txnType: TransactionType
  amount: number
  fee: number
  tax: number
  paymentMethod: string
  status: 'SUCCESS'
  createdAt: string
}

const METHODS = ['UPI', 'CARD', 'NETBANKING', 'WALLET'] as const

/** An instant as the module's other timestamps are written — IST, with its offset. */
const istIso = (ms: number) =>
  new Date(ms + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19) + '+05:30'

/** `total` split into `count` uneven parts that sum to it exactly (to the paisa's tenth). */
function split(total: number, count: number, rand: () => number) {
  const weights = Array.from({ length: count }, () => 0.2 + rand() ** 2 * 4)
  const sum = weights.reduce((a, b) => a + b, 0)
  const parts = weights.map((w) => r3((total * w) / sum))
  parts[count - 1] = r3(total - parts.slice(0, -1).reduce((a, b) => a + b, 0))
  return parts
}

const cache = new Map<string, ReconTransaction[]>()

/**
 * Newest first, spread over the day before the recon was created. Built newest first — each
 * one a random step back from the last — so the list needs no sort; orders and refunds are
 * interleaved by drawing which kind each step is, in proportion to how many of each are left.
 */
export function transactionsOf(row: ReconRow): ReconTransaction[] {
  const cached = cache.get(row.rowId)
  if (cached) return cached

  const rand = seeded(seedOf(row.rowId))
  const orders = split(row.orderAmount, row.orderCount, rand)
  const refunds = row.refundCount ? split(row.refundAmount, row.refundCount, rand) : []
  const total = orders.length + refunds.length
  // Average step so the whole list spans about a day.
  const step = (24 * 60 * 60 * 1000) / total
  let at = Date.parse(row.createdAt)

  const rows: ReconTransaction[] = []
  while (orders.length || refunds.length) {
    const txnType: TransactionType =
      rand() * (orders.length + refunds.length) < orders.length ? 'ORDER' : 'REFUND'
    const amount = (txnType === 'ORDER' ? orders : refunds).pop()!
    const fee = txnType === 'ORDER' ? r3(amount * FEE_RATE) : 0
    at -= Math.floor(rand() * 2 * step)
    rows.push({
      txnId: `txn_${hex(rand, 20)}`,
      orderId: `ORD${Math.floor(1e9 + rand() * 9e9)}`,
      txnType,
      amount,
      fee,
      tax: r3(fee * TAX_RATE),
      paymentMethod: METHODS[Math.floor(rand() * METHODS.length)],
      status: 'SUCCESS',
      createdAt: istIso(at),
    })
  }

  cache.set(row.rowId, rows)
  return rows
}
