/**
 * What the assistant proposes once both files are in: which one is the base — the user's
 * own record, which the other is reconciled against — and the steps that make the other
 * line up with it.
 *
 * Every proposal comes with its evidence, read off the files themselves, and the effect it
 * would have. They are worked out in order on a copy of the tables — rows first, then
 * columns, then values — so each one is judged on what the earlier ones leave behind.
 */
import {
  amountOf,
  diagnose,
  findAmounts,
  findKeys,
  keepPrincipal,
  partnerMap,
  sameAmount,
  valueCounts,
  type Keys,
} from './match'
import { ALL_COLUMNS, applyAll, emptyColumns, type Operation } from './operations'
import { cell, count, formatCount, type Row, type Table } from './table'

/** Which of the two files is the base, and the evidence for it. */
export type BaseChoice = {
  /** 0 when the first file is the base, 1 when the second is. */
  base: 0 | 1
  /** The base's column that identifies a transaction, when one lines up with the other file. */
  key?: string
  /** Columns that read as the user's own identifiers — order, merchant, internal IDs. */
  internal: string[]
  /** The other file repeating its key: several rows per transaction. */
  repeats?: { column: string; most: number }
}

export type Recommendation = {
  side: 'base' | 'target'
  op: Operation
  /** One sentence, with the evidence. */
  reason: string
  /** What applying it would do, e.g. "Keeps 4 of 101 rows". */
  effect: string
  /** High is ticked by default; low is offered but left for the user to choose. */
  confidence: 'high' | 'low'
}

const INTERNAL = /order|merchant|juspay|internal|customer|invoice|booking/i
const EXTERNAL = /settle|payout|gateway|bank|fee|processing|utr|arn|rrn|scheme|interchange|payment.?id/i

/** How often the most repeated value in a column turns up — among `only`, when given. */
function mostRepeated(table: Table, column: string, only?: Set<string>) {
  let most = 0
  for (const [value, n] of valueCounts(table, column)) if (!only || only.has(value)) most = Math.max(most, n)
  return most
}

/** Names a few of a list and counts the rest: "A, B, C and 10 more". */
const few = (names: string[]) =>
  names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`

/**
 * The base is the file with one row per transaction where the other repeats it — a
 * settlement report lists fees and authorisations beside each payment. Failing that, the
 * file whose columns read as the user's own records. Failing both, the order they arrived in.
 */
export function chooseBase(first: Table, second: Table): BaseChoice {
  const internalOf = (table: Table) => table.columns.filter((column) => INTERNAL.test(column)).slice(0, 3)
  const keys = findKeys(first, second, true)
  if (keys) {
    // Counted over the IDs both files carry — the transactions the two have in common.
    const firstIds = new Set(first.rows.map((row) => cell(row, keys.sourceKey)))
    const secondIds = new Set(second.rows.map((row) => cell(row, keys.targetKey)))
    const firstMost = mostRepeated(first, keys.sourceKey, secondIds)
    const secondMost = mostRepeated(second, keys.targetKey, firstIds)
    if (secondMost > 1 && firstMost === 1) {
      return { base: 0, key: keys.sourceKey, internal: internalOf(first), repeats: { column: keys.targetKey, most: secondMost } }
    }
    if (firstMost > 1 && secondMost === 1) {
      return { base: 1, key: keys.targetKey, internal: internalOf(second), repeats: { column: keys.sourceKey, most: firstMost } }
    }
  }
  const lean = (table: Table) =>
    table.columns.filter((column) => INTERNAL.test(column)).length -
    table.columns.filter((column) => EXTERNAL.test(column)).length
  const base = lean(second) > lean(first) ? 1 : 0
  return {
    base,
    key: keys && (base === 0 ? keys.sourceKey : keys.targetKey),
    internal: internalOf(base === 0 ? first : second),
  }
}

/** A few of a column's other values, to say what kind of rows a filter would drop. */
function otherValues(table: Table, column: string, keep: string[]) {
  const seen = new Set<string>()
  for (const row of table.rows) {
    const value = cell(row, column)
    if (value && !keep.includes(value)) seen.add(value)
    if (seen.size === 3) break
  }
  return [...seen]
}

/** Rows of the two tables paired on their keys. */
function paired(base: Table, target: Table, keys: Keys) {
  const partners = partnerMap(target, keys.targetKey)
  return base.rows.flatMap((row) => {
    const partner = partners.get(cell(row, keys.sourceKey))
    return partner ? [[row, partner] as [Row, Row]] : []
  })
}

/**
 * Steps that make the target line up with the base, in the order they should run. The
 * base is changed only for what is wrong with it on its own — empty columns, stray spaces.
 */
export function recommend(base: Table, target: Table, targetName: string): Recommendation[] {
  const recommendations: Recommendation[] = []
  const tables = { base, target }
  /** Offer a step, and judge what comes after on the table as it would leave it. */
  const propose = (
    side: 'base' | 'target',
    op: Operation,
    reason: string,
    effect: string,
    after = applyAll(tables[side], [op]),
  ) => {
    recommendations.push({ side, op, reason, effect, confidence: 'high' })
    tables[side] = after
  }

  // Rows: one per transaction. A settlement report repeats each payment for its fees.
  const diagnosis = diagnose(tables.base, tables.target)
  if (diagnosis) {
    const side = diagnosis.role === 'target' ? 'target' : 'base'
    const table = tables[side]
    const op = keepPrincipal(diagnosis)
    const after = applyAll(table, [op])
    const kept = after.rows.length
    const others = otherValues(table, diagnosis.typeColumn, diagnosis.keep)
    // Counted over the transactions the other file has, which are the ones that matter here:
    // the key's tally, read back for each value the other file carries anywhere.
    const counts = valueCounts(table, diagnosis.key)
    let shared = 0
    for (const row of (side === 'target' ? tables.base : tables.target).rows) {
      for (const value of Object.values(row)) shared = Math.max(shared, counts.get(value.trim()) ?? 0)
    }
    propose(
      side,
      op,
      `${diagnosis.key} repeats up to ${shared || mostRepeated(table, diagnosis.key)} times — the other ` +
        `${formatCount(table.rows.length - kept)} rows are ${others.join(', ')} and the like.`,
      `Keeps ${formatCount(kept)} of ${formatCount(table.rows.length)} rows`,
      after,
    )
  }

  // Columns: what an export's trailing delimiters leave behind.
  for (const side of ['target', 'base'] as const) {
    const empty = emptyColumns(tables[side])
    if (empty.length === 0) continue
    const columns = tables[side].columns.length
    propose(
      side,
      { kind: 'dropEmpty' },
      `${count(empty.length, 'column')} ${empty.length === 1 ? 'is' : 'are'} empty in every row — ${few(empty)}.`,
      `${columns} → ${columns - empty.length} columns`,
    )
  }

  // The key: rows the base keys one way and the target another — refunds by their action ID.
  const keys = findKeys(tables.base, tables.target)
  if (keys) {
    const targetKeys = new Set(tables.target.rows.map((row) => cell(row, keys.targetKey)))
    const unmatched = new Set(
      tables.base.rows.map((row) => cell(row, keys.sourceKey)).filter((key) => key && !targetKeys.has(key)),
    )
    const elsewhere = tables.target.columns
      .filter((column) => column !== keys.targetKey)
      .map((column) => ({ column, rows: tables.target.rows.filter((row) => unmatched.has(cell(row, column))) }))
      .find((candidate) => candidate.rows.length > 0)
    if (elsewhere) {
      // A row-type column that holds one value on exactly those rows — the condition for the
      // switch. The fewest distinct values wins, so "Action Type is Refund" beats an ID that
      // happens to single out the same row. Distinct values are counted last, only for the
      // columns that pass the rest.
      const picked = new Set(elsewhere.rows)
      const others = tables.target.rows.filter((row) => !picked.has(row))
      const condition = tables.target.columns
        .map((column) => ({ column, value: cell(elsewhere.rows[0], column) }))
        .filter(
          ({ column, value }) =>
            value &&
            column !== elsewhere.column &&
            column !== keys.targetKey &&
            elsewhere.rows.every((row) => cell(row, column) === value) &&
            others.every((row) => cell(row, column) !== value),
        )
        .map((candidate) => ({ ...candidate, kinds: valueCounts(tables.target, candidate.column).size }))
        .filter(({ kinds }) => kinds > 1 && kinds < tables.target.rows.length)
        .sort((a, b) => a.kinds - b.kinds)[0]
      if (condition) {
        const op: Operation = {
          kind: 'matchKey',
          column: condition.column,
          text: condition.value,
          second: elsewhere.column,
          other: keys.targetKey,
          into: 'Match key',
        }
        const n = elsewhere.rows.length
        propose(
          'target',
          op,
          `${n === 1 ? 'A' : `${n}`} ${condition.value.toLowerCase()} ${n === 1 ? 'row is' : 'rows are'} keyed by ` +
            `${elsewhere.column} in ${targetName}, not ${keys.targetKey}.`,
          `${count(n, 'more row')} ${n === 1 ? 'pairs' : 'pair'}`,
        )
      }
    }
  }

  // Values: amounts that agree but for their sign — refunds written negative on one side.
  // Only the pair the match will compare — the columns that agree most in size — and only if
  // their signs disagree. Another amount column with a minus in it is not this recon's business.
  const settled = findKeys(tables.base, tables.target)
  if (settled) {
    const pairs = paired(tables.base, tables.target, settled)
    const amounts = findAmounts(pairs, tables.base, tables.target, settled, {
      same: (a, b) => sameAmount(Math.abs(a), Math.abs(b)),
      share: 0.5,
    })
    const flips = amounts
      ? pairs.flatMap(([a, b]) => {
          const x = amountOf(a[amounts.sourceAmount])
          const y = amountOf(b[amounts.targetAmount])
          return x !== undefined && y !== undefined && x > 0 && y < 0 && sameAmount(x, -y)
            ? [[a[amounts.sourceAmount], b[amounts.targetAmount]] as const]
            : []
        })
      : []
    if (amounts && flips.length > 0) {
      const [[positive, negative]] = flips
      propose(
        'target',
        { kind: 'absolute', column: amounts.targetAmount },
        `${amounts.targetAmount} has ${negative} where your record has ${positive} — a refund carries a minus sign on one side only.`,
        `${count(flips.length, 'value')} ${flips.length === 1 ? 'changes' : 'change'}`,
      )
    }
  }

  // Stray spaces, wherever they are. The last proposal, so nothing reads the table it would
  // leave and it is offered without being worked out.
  for (const side of ['target', 'base'] as const) {
    const spaced = tables[side].rows
      .slice(0, 200)
      .flatMap((row) => Object.values(row))
      .filter((value) => value !== value.trim()).length
    if (spaced > 0) {
      propose(
        side,
        { kind: 'trim', column: ALL_COLUMNS },
        'Some values carry spaces at either end, which stop them matching.',
        'Trims every column',
        tables[side],
      )
    }
  }

  return recommendations
}
