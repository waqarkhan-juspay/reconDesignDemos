/**
 * Matching the source against the target, on the tables as cleaned.
 *
 * Nothing is configured: the key is the pair of columns whose values turn up in both files,
 * and the amount is the pair of money columns that agree most often across the rows that
 * key pairs. The outcome names both, so the assistant can say what it matched on.
 */
import { numberText, type Operation } from './operations'
import { cell, type Row, type Table } from './table'

/** The three outcomes worth opening — everything except the rows that matched. */
export type Bucket = 'amountMismatch' | 'missingInTarget' | 'missingInSource'

/** Each outcome's name — on its result card, and over its rows once opened. */
export const BUCKET_TITLE: Record<Bucket, string> = {
  amountMismatch: 'Amount Mismatch',
  missingInTarget: 'Missing in Target',
  missingInSource: 'Missing in Source',
}

export type Mismatch = { key: string; source: string; target: string; difference: number }

export type ReconOutcome = {
  sourceKey: string
  targetKey: string
  /** Absent when no money column agrees between the files — then only presence is checked. */
  sourceAmount?: string
  targetAmount?: string
  matched: number
  amountMismatch: Mismatch[]
  /** Source rows with no partner in the target, and the other way round. */
  missingInTarget: Row[]
  missingInSource: Row[]
}

export type Keys = { sourceKey: string; targetKey: string }

/** Rows looked at to choose the columns. Matching itself covers every row. */
const SAMPLE = 2000

/** Two amounts are the same within a paisa — rounding is not a mismatch. */
export const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.005

const AMOUNT_NAME = /amount|amt|capture|settle|total|value|price|fee|net|gross|refund/i

export const amountOf = (value: string | undefined) => {
  const text = numberText(value ?? '')
  return text === undefined ? undefined : Number(text)
}

/** How many rows hold each of a column's values, blanks left out. */
export function valueCounts(table: Table, column: string) {
  const counts = new Map<string, number>()
  for (const row of table.rows) {
    const value = cell(row, column)
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

/** A column's values for choosing by, blanks and "-" placeholders left out. */
const sampled = (rows: Row[], column: string) =>
  rows
    .slice(0, SAMPLE)
    .map((row) => cell(row, column))
    .filter((value) => value !== '' && value !== '-')

type ValueSet = { column: string; set: Set<string>; unique: boolean }

/**
 * Each column's distinct values, and whether they are (nearly) unique within the file.
 * Money columns are left out: amounts are often unique and agree between the files, which
 * is what an ID does too — but an amount is what gets compared, never what pairs the rows.
 *
 * Kept against the table: a table is never changed, only replaced, and one upload asks for
 * the keys of the same pair several times over — the base, the diagnosis, the proposals.
 */
const valueSetCache = new WeakMap<Table, ValueSet[]>()
function valueSets(table: Table) {
  let sets = valueSetCache.get(table)
  if (!sets) {
    sets = table.columns.flatMap((column) => {
      if (isMoney(table.rows, column)) return []
      const values = sampled(table.rows, column)
      const set = new Set(values)
      return set.size > 0 ? [{ column, set, unique: set.size >= values.length * 0.9 }] : []
    })
    valueSetCache.set(table, sets)
  }
  return sets
}

/**
 * The columns that identify a row in both files: sharing the most values with the other,
 * and each (nearly) unique within its own file — or, when `loose`, at least one of them, so
 * an ID repeated across a file's fee rows still lines up while a shared "VISA" never does.
 * First in column order wins a tie, which keeps an ID column ahead of a second one that
 * happens to agree as well.
 */
export function findKeys(source: Table, target: Table, loose = false): Keys | undefined {
  const targets = valueSets(target)
  let best: (Keys & { score: number }) | undefined
  for (const { column: sourceKey, set: values, unique } of valueSets(source)) {
    for (const { column: targetKey, set: others, unique: theirsUnique } of targets) {
      if (loose ? !unique && !theirsUnique : !unique || !theirsUnique) continue
      let shared = 0
      for (const value of values) if (others.has(value)) shared++
      const score = shared / Math.min(values.size, others.size)
      if (score > (best?.score ?? 0.2)) best = { sourceKey, targetKey, score }
    }
  }
  return best && { sourceKey: best.sourceKey, targetKey: best.targetKey }
}

/**
 * Whether a column holds money: named like it, or mostly decimal numbers. Keeps a numeric
 * code — an order number both files carry — from being read as an amount.
 */
export function isMoney(rows: Row[], column: string) {
  if (AMOUNT_NAME.test(column)) return true
  const values = sampled(rows, column)
  const decimals = values.filter((value) => numberText(value)?.includes('.')).length
  return values.length > 0 && decimals >= values.length * 0.5
}

/** Each key's partner: the first target row that carries it. */
export function partnerMap(target: Table, targetKey: string) {
  const partners = new Map<string, Row>()
  for (const row of target.rows) {
    const key = cell(row, targetKey)
    if (key && !partners.has(key)) partners.set(key, row)
  }
  return partners
}

/** How two amounts count as agreeing, and on what share of the paired rows they must. */
type AmountRule = { same?: (a: number, b: number) => boolean; share?: number }

/**
 * The pair of money columns that agree on the most paired rows, if any agree on enough. The
 * match compares amounts as they are; a caller looking for sign flips compares their size.
 */
export function findAmounts(
  pairs: [Row, Row][],
  source: Table,
  target: Table,
  keys: Keys,
  { same = sameAmount, share = 0.2 }: AmountRule = {},
) {
  const sample = pairs.slice(0, SAMPLE)
  const read = (side: 0 | 1, table: Table, key: string) =>
    table.columns
      .filter((column) => column !== key && isMoney(table.rows, column))
      .map((column) => [column, sample.map((pair) => amountOf(pair[side][column]))] as const)

  const targets = read(1, target, keys.targetKey)
  let best: { sourceAmount: string; targetAmount: string; equal: number } | undefined
  for (const [sourceAmount, mine] of read(0, source, keys.sourceKey)) {
    for (const [targetAmount, theirs] of targets) {
      let equal = 0
      mine.forEach((value, index) => {
        const other = theirs[index]
        if (value !== undefined && other !== undefined && same(value, other)) equal++
      })
      if (equal > (best?.equal ?? 0)) best = { sourceAmount, targetAmount, equal }
    }
  }
  return best && best.equal >= sample.length * share ? best : undefined
}

/** The row types that carry a transaction's own amount, as against the fees around it. */
const PRINCIPAL = /^(capture|captured|sale|refund|refunded|payment|order|charge)$/i

/**
 * Why there is no key, when the reason is fixable: a column lines up with the other file's
 * ID, but one file has several rows per transaction — fees and authorisations beside the
 * capture. Then the fix is to keep only the principal rows, and this names the column that
 * says which rows those are: the most selective one holding a principal value.
 */
export type Diagnosis = {
  role: 'source' | 'target'
  key: string
  typeColumn: string
  keep: string[]
}

/** The step a diagnosis asks for: keep only the rows that carry a transaction's amount. */
export const keepPrincipal = ({ typeColumn, keep }: Diagnosis): Operation => ({
  kind: 'keepRows',
  column: typeColumn,
  text: keep.join(', '),
})

export function diagnose(source: Table, target: Table): Diagnosis | undefined {
  if (findKeys(source, target)) return undefined
  const keys = findKeys(source, target, true)
  if (!keys) return undefined

  const repeated = (table: Table, column: string) => {
    const counts = valueCounts(table, column)
    let values = 0
    for (const n of counts.values()) values += n
    return counts.size < values * 0.9
  }
  const [role, table, key] = repeated(target, keys.targetKey)
    ? (['target', target, keys.targetKey] as const)
    : repeated(source, keys.sourceKey)
      ? (['source', source, keys.sourceKey] as const)
      : []
  if (!role) return undefined

  let best: (Diagnosis & { rows: number }) | undefined
  for (const column of table.columns) {
    if (column === key) continue
    const counts = valueCounts(table, column)
    if (counts.size < 2 || counts.size > 25) continue
    const keep = [...counts.keys()].filter((value) => PRINCIPAL.test(value))
    const rows = keep.reduce((total, value) => total + counts.get(value)!, 0)
    if (keep.length > 0 && rows < (best?.rows ?? Infinity)) best = { role, key, typeColumn: column, keep, rows }
  }
  if (!best) return undefined
  const { rows: _rows, ...diagnosis } = best
  return diagnosis
}

/** Match the files. Undefined when no column identifies the same rows in both. */
export function reconcile(source: Table, target: Table): ReconOutcome | undefined {
  const keys = findKeys(source, target)
  if (!keys) return undefined

  const partners = partnerMap(target, keys.targetKey)
  const pairs: [Row, Row][] = []
  const paired = new Set<string>()
  const missingInTarget: Row[] = []
  for (const row of source.rows) {
    const key = cell(row, keys.sourceKey)
    const partner = key ? partners.get(key) : undefined
    if (partner) {
      pairs.push([row, partner])
      paired.add(key)
    } else {
      missingInTarget.push(row)
    }
  }
  const missingInSource = target.rows.filter((row) => !paired.has(cell(row, keys.targetKey)))

  const amounts = findAmounts(pairs, source, target, keys)
  const amountMismatch: Mismatch[] = []
  if (amounts) {
    for (const [mine, theirs] of pairs) {
      const value = amountOf(mine[amounts.sourceAmount])
      const other = amountOf(theirs[amounts.targetAmount])
      if (value !== undefined && other !== undefined && !sameAmount(value, other)) {
        amountMismatch.push({
          key: cell(mine, keys.sourceKey),
          source: mine[amounts.sourceAmount],
          target: theirs[amounts.targetAmount],
          difference: Math.round((other - value) * 100) / 100,
        })
      }
    }
  }

  return {
    ...keys,
    sourceAmount: amounts?.sourceAmount,
    targetAmount: amounts?.targetAmount,
    matched: pairs.length - amountMismatch.length,
    amountMismatch,
    missingInTarget,
    missingInSource,
  }
}

export const exceptionCount = (outcome: ReconOutcome) =>
  outcome.amountMismatch.length + outcome.missingInTarget.length + outcome.missingInSource.length
