/**
 * The rule's configuration as something other than a tree.
 *
 * A tree answers one question very well — *what is the shape of this?* — and is bad at the
 * other four people actually arrive with:
 *
 *   - *what does X cost?*            — one lookup in a list of everything. A tree makes you
 *                                      navigate to a fact you could have searched for.
 *   - *what is the whole of it?*     — read it in order. A tree spends its width on structure
 *                                      and makes you scroll sideways to finish a sentence.
 *   - *what is not priced?*          — a tree can only draw what exists; absence has no node.
 *   - *how do two of them differ?*   — two branches of a tree are never next to each other.
 *
 * So the views in FeeViews.tsx are not five layouts of one thing. They are five questions, and
 * this module is the one shape they all read: the tree flattened to one row per charge, with
 * the path that led to it carried on the row.
 *
 * The flattening is lossless and the tree is not — a tree view draws `BRANCHES` of each level
 * (fee-tree.ts), these see every row.
 */

import { METHODS, type MethodId } from './brands'
import { FEE_RULES, type FeeMode, type FeeRule } from './data'
import { mdrLines, type FeeTree, type TreeScope } from './fee-tree'

/** One charge, with the path that led to it flattened onto it. */
export type FeeRow = {
  id: string
  /** `PA Fee` or `Feature Fee`. */
  category: string
  /** `Transactional Fee` or `Fixed Fee`. */
  kind: string
  /** The payment method, or the group of charges, it sits under. */
  group: string
  name: string
  mode: FeeMode
  scopes: TreeScope[]
}

/** The pair of coordinates a charge sits at, as one string. */
export const branchOf = (row: FeeRow) => `${row.category} · ${row.kind}`

/**
 * What it costs.
 *
 * The first scope is always the charge itself — `Mdr` on a payment, `Fee` on everything else —
 * and the rest qualify it. That is a property of how the tree is built (fee-tree.ts), and
 * holding it here rather than re-deciding it per view is what keeps five screens agreeing on
 * which number is the headline.
 */
export const priceOf = (row: FeeRow) => row.scopes[0]?.lines.join('  ·  ') ?? '—'

/** Everything after the price: what it is charged per, or when it is billed. */
export const qualifierOf = (row: FeeRow) =>
  row.scopes
    .slice(1)
    .map((scope) => `${scope.label}: ${scope.lines.join(' ')}`)
    .join('  ·  ')

/** How many separate lines the price has — 1 for a flat rate, more for a slab. */
export const bandCount = (row: FeeRow) => row.scopes[0]?.lines.length ?? 0

export function feeRows(tree: FeeTree): FeeRow[] {
  const rows: FeeRow[] = []
  for (const category of tree.categories) {
    for (const kind of category.kinds) {
      for (const group of kind.methods) {
        for (const leaf of group.leaves) {
          rows.push({
            id: `${kind.id}-${leaf.id}`,
            category: category.label,
            kind: kind.label,
            group: group.label,
            name: leaf.name,
            mode: leaf.mode,
            scopes: leaf.scopes,
          })
        }
      }
    }
  }
  return rows
}

/** A group of charges under one branch, in the order the tree would have drawn them. */
export type RowGroup = { group: string; rows: FeeRow[] }

/** One branch of the configuration — a category and a kind — and what hangs under it. */
export type RowBranch = { key: string; category: string; kind: string; groups: RowGroup[] }

/** The rows re-nested one level, for the views that read in order rather than look up. */
export function byBranch(rows: FeeRow[]): RowBranch[] {
  const branches: RowBranch[] = []
  for (const row of rows) {
    const key = branchOf(row)
    let branch = branches.find((entry) => entry.key === key)
    if (!branch) {
      branch = { key, category: row.category, kind: row.kind, groups: [] }
      branches.push(branch)
    }
    let group = branch.groups.find((entry) => entry.group === row.group)
    if (!group) {
      group = { group: row.group, rows: [] }
      branch.groups.push(group)
    }
    group.rows.push(row)
  }
  return branches
}

/** Every group in the configuration, once, in tree order — what `Compare` picks between. */
export const groupNames = (rows: FeeRow[]): string[] => [
  ...new Set(rows.map((row) => row.group)),
]

/**
 * One payment method the product offers, and whether this merchant is priced for it.
 *
 * Built from `METHODS` rather than from the rules, which is the entire point: a view built
 * from the rules can only ever show you what exists. The question "what is *not* mapped" has
 * to be asked of the catalogue.
 */
export type Coverage = {
  id: MethodId
  name: string
  /**
   * Every rule that prices it, in the order the rules are defined.
   *
   * A list rather than the first match, because a method can be in several rules and the one
   * question this view exists to answer — *is this one mine?* — is wrong as soon as it reads
   * the first.
   */
  rules: FeeRule[]
  /** What the first of them charges, ready to read. */
  price?: string
}

export function coverage(): Coverage[] {
  return (
    (Object.keys(METHODS) as MethodId[])
      // `all` is a wildcard in a rule, not a method a merchant can be charged for.
      .filter((id) => id !== 'all')
      .map((id) => {
        const rules = FEE_RULES.filter((entry) => entry.methods.includes(id))
        return {
          id,
          name: METHODS[id].name,
          rules,
          price: rules[0] ? mdrLines(rules[0], id).join('  ·  ') : undefined,
        }
      })
  )
}
