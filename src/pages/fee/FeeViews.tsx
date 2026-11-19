/**
 * The rule's configuration, five ways that are not a tree.
 *
 * Each one exists because of a question a tree answers badly (fee-views.ts). They share one
 * row model, so nothing here can disagree with anything else here about what is configured —
 * which is the whole reason they are five readings of one list rather than five screens.
 *
 *   Table     — every charge at once, searchable and sortable.  *What does X cost?*
 *   Outline   — the configuration read top to bottom, no sideways. *What is all of it?*
 *   Coverage  — the product's methods against this merchant's.  *What is NOT mapped?*
 *   Compare   — two groups on one set of rows.                  *How do these two differ?*
 *   Summary   — the figures, then where they come from.         *What am I looking at?*
 *
 * blend-gap: `Outline`, `Coverage` and `Compare` are rows in a bordered panel, which Blend
 * has no component for — `CardV2`'s padding scale stops at 12px where this is 16, and it
 * strips `style` (FeeTicket.tsx). `DataTable`, `StatCardV2`, `SingleSelectV2` and the tags
 * are Blend's.
 */

import {
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  StatCardV2,
  StatCardV2Variant,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { Layers, Receipt, Wallet, Zap } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { font, PrimitiveText } from '../../primitives'
import { HAIRLINE, PANEL_STYLE } from '../pacb/helpers'
import type { FeeRule } from './data'
import {
  bandCount,
  branchOf,
  byBranch,
  coverage,
  groupNames,
  priceOf,
  qualifierOf,
  type Coverage,
  type FeeRow,
} from './fee-views'
import { ModeTag, NeutralTag, StatusTag } from './tags'

const { colors } = FOUNDATION_THEME

const { body, heading } = FOUNDATION_THEME.font.size

/** DataTable sizes its columns from this unless told otherwise (ledger/table.ts). */
const HUG = { minWidth: '0px', maxWidth: 'none' } as const


const STAT_ICON = 16

/** A row in one of the composed panels — the shared padding and divider. */
function Line({
  children,
  first = false,
}: {
  children: ReactNode
  first?: boolean
}) {
  return (
    <div
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5"
      style={first ? undefined : { borderTop: HAIRLINE }}
    >
      {children}
    </div>
  )
}

/** The tinted strip that names a group inside a panel. */
function GroupHead({ label, note }: { label: string; note?: string }) {
  return (
    <div
      className="flex items-baseline gap-2 px-4 py-2"
      style={{ backgroundColor: colors.gray[25] }}
    >
      <PrimitiveText {...font(body.xs)} color={colors.gray[500]}>
        {label}
      </PrimitiveText>
      {note && (
        <PrimitiveText {...font(body.xs)} color={colors.gray[500]}>
          {note}
        </PrimitiveText>
      )}
    </div>
  )
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <PrimitiveText
        as="h2"
        {...font(heading.sm)}
        color={colors.gray[800]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        {title}
      </PrimitiveText>
      <PrimitiveText {...font(body.sm)} color={colors.gray[500]}>
        {note}
      </PrimitiveText>
    </div>
  )
}

/** The price, which is one line on a flat charge and several on a slab. */
function Price({ row }: { row: FeeRow }) {
  return (
    <div className="flex flex-col">
      {(row.scopes[0]?.lines ?? ['—']).map((line, index) => (
        // Keyed by position: a slab may price two bands the same.
        <PrimitiveText
          key={index}
          {...font(body.sm)}
          color={colors.gray[700]}
          style={{ whiteSpace: 'nowrap' }}
        >
          {line}
        </PrimitiveText>
      ))}
    </div>
  )
}

// ─── 1. Table ────────────────────────────────────────────────────────────────────────────

/** DataTable types its rows as an index signature, so a row has to widen to one. */
type TableRow = FeeRow & { [key: string]: unknown }

const rowOf = (raw: Record<string, unknown>) => raw as unknown as FeeRow

/**
 * Every charge in one list you can search and sort.
 *
 * The answer to *what does X cost* should be one search, not a walk — and the answer to
 * *which of these is the expensive one* should be one click on a column header, which no
 * amount of tree is ever going to give you.
 *
 * `DataTable` is V1 and has no V2 pair, which rule 4 lists as a legitimate exception.
 */
export function FeeTable({ rows }: { rows: FeeRow[] }) {
  const data = useMemo<TableRow[]>(
    () =>
      rows.map((row) => ({
        ...row,
        branch: branchOf(row),
        price: priceOf(row),
        qualifier: qualifierOf(row),
        bands: bandCount(row),
      })),
    [rows],
  )

  // The rendered columns are `CUSTOM`, not the `REACT_ELEMENT` the name suggests:
  // REACT_ELEMENT's branch of `ColumnDefinition` pins `isSortable: false` — "React elements
  // cannot be sorted" (DataTable/types.ts:292). True of the element, false of the column —
  // these draw a node but sort on the row's own string, which is what a Price header should do.
  const columns = useMemo<ColumnDefinition<Record<string, unknown>>[]>(
    () => [
      {
        field: 'name',
        header: 'Charge',
        ...HUG,
        isSortable: true,
        type: ColumnType.CUSTOM,
        renderCell: (_value: unknown, raw: Record<string, unknown>) => {
          const row = rowOf(raw)
          return (
            <div className="flex flex-col gap-0.5 py-2">
              <PrimitiveText {...font(body.sm)} color={colors.gray[700]}>
                {row.name}
              </PrimitiveText>
              <PrimitiveText {...font(body.xs)} color={colors.gray[500]}>
                {row.group}
              </PrimitiveText>
            </div>
          )
        },
      },
      { field: 'branch', header: 'Where', ...HUG, isSortable: true, type: ColumnType.TEXT },
      {
        field: 'mode',
        header: 'Mode',
        ...HUG,
        isSortable: true,
        type: ColumnType.CUSTOM,
        renderCell: (_value: unknown, raw: Record<string, unknown>) => <ModeTag mode={rowOf(raw).mode} />,
      },
      {
        field: 'price',
        header: 'Price',
        ...HUG,
        isSortable: true,
        type: ColumnType.CUSTOM,
        renderCell: (_value: unknown, raw: Record<string, unknown>) => (
          <div className="py-2">
            <Price row={rowOf(raw)} />
          </div>
        ),
      },
      { field: 'qualifier', header: 'Terms', ...HUG, isSortable: false, type: ColumnType.TEXT },
    ],
    [],
  )

  return (
    <div className="overflow-hidden" style={PANEL_STYLE}>
      <DataTable
        data={data}
        columns={columns}
        idField="id"
        enableSearch
        searchPlaceholder="Search charges, methods, prices"
        enableColumnManager={false}
        enableFiltering={false}
      />
    </div>
  )
}

// ─── 2. Outline ──────────────────────────────────────────────────────────────────────────

/**
 * The whole configuration, in order, down one column.
 *
 * Nothing is hidden and nothing is sideways, which is the one thing both trees cost you: a
 * tree spends its width on structure, so finishing a sentence means scrolling. This is what
 * you would read to check a contract against, or paste into a ticket.
 */
export function FeeOutline({ rows }: { rows: FeeRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      {byBranch(rows).map((branch) => (
        <section key={branch.key} className="flex flex-col gap-3">
          <SectionHead
            title={branch.category}
            note={`${branch.kind} · ${branch.groups.reduce((n, g) => n + g.rows.length, 0)} charges`}
          />
          <div className="overflow-hidden" style={PANEL_STYLE}>
            {branch.groups.map((group, index) => (
              <div key={group.group} style={index ? { borderTop: HAIRLINE } : undefined}>
                <GroupHead
                  label={group.group}
                  note={`· ${group.rows.length} ${group.rows.length === 1 ? 'charge' : 'charges'}`}
                />
                {group.rows.map((row) => (
                  <Line key={row.id}>
                    <div
                      className="flex items-center gap-2"
                      style={{ flex: '1 0 220px', minWidth: 0 }}
                    >
                      <PrimitiveText {...font(body.sm)} color={colors.gray[700]} truncate>
                        {row.name}
                      </PrimitiveText>
                      <ModeTag mode={row.mode} />
                    </div>
                    <Price row={row} />
                    <PrimitiveText
                      {...font(body.xs)}
                      color={colors.gray[500]}
                      style={{ flex: '1 0 160px', minWidth: 0 }}
                    >
                      {qualifierOf(row)}
                    </PrimitiveText>
                  </Line>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ─── 3. Coverage ─────────────────────────────────────────────────────────────────────────

/**
 * Every payment method the product offers, sorted into what this rule prices, what another
 * rule prices, and what nothing prices.
 *
 * The only view here built from the *catalogue* rather than from the rules, and that is the
 * point: a tree can draw what exists, so it can never show you what is missing. A method with
 * no rule has no node — it is simply not there, which looks exactly like a method you forgot
 * to look for.
 *
 * Three groups rather than two because "priced" was true of everything, and a view whose
 * answer is always yes is not answering. Split against *this* rule it says something the page
 * cannot say anywhere else: how much of the catalogue this rule is responsible for, and who
 * holds the rest.
 */
function CoverageRow({
  method,
  children,
  first,
}: {
  method: Coverage
  children?: ReactNode
  first: boolean
}) {
  return (
    <Line first={first}>
      <PrimitiveText
        {...font(body.sm)}
        color={colors.gray[700]}
        style={{ flex: '1 0 180px', minWidth: 0 }}
        truncate
      >
        {method.name}
      </PrimitiveText>
      {children}
      <PrimitiveText
        {...font(body.sm)}
        color={colors.gray[700]}
        style={{ whiteSpace: 'nowrap' }}
      >
        {method.price ?? '—'}
      </PrimitiveText>
    </Line>
  )
}

export function FeeCoverage({ rule }: { rule: FeeRule }) {
  const methods = coverage()
  const mine = methods.filter((method) => method.rules.some((entry) => entry.id === rule.id))
  const others = methods.filter(
    (method) => method.rules.length > 0 && !method.rules.some((entry) => entry.id === rule.id),
  )
  const gaps = methods.filter((method) => method.rules.length === 0)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionHead
          title="Priced by this rule"
          note={`${mine.length} of ${methods.length} methods · ${rule.name}`}
        />
        <div className="overflow-hidden" style={PANEL_STYLE}>
          {mine.map((method, index) => (
            <CoverageRow key={method.id} method={method} first={index === 0}>
              <div className="flex items-center gap-2" style={{ flex: '1 0 160px', minWidth: 0 }}>
                <StatusTag status={rule.status} />
                {method.rules.length > 1 && (
                  // Two rules naming one method is a real configuration, and which one wins is
                  // resolution order — not something this page can tell you. So it says the
                  // overlap exists rather than implying the first is the answer.
                  <NeutralTag text={`+${method.rules.length - 1} other`} />
                )}
              </div>
            </CoverageRow>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <SectionHead
          title="Priced elsewhere"
          note={`${others.length} ${others.length === 1 ? 'method sits' : 'methods sit'} under another rule`}
        />
        <div className="overflow-hidden" style={PANEL_STYLE}>
          {others.map((method, index) => (
            <CoverageRow key={method.id} method={method} first={index === 0}>
              <div className="flex items-center gap-2" style={{ flex: '1 0 160px', minWidth: 0 }}>
                <PrimitiveText {...font(body.sm)} color={colors.gray[500]} truncate>
                  {method.rules[0]?.name}
                </PrimitiveText>
                {method.rules[0] && <StatusTag status={method.rules[0].status} />}
              </div>
            </CoverageRow>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <SectionHead
          title="Not priced"
          note={
            gaps.length === 0
              ? 'every method the product offers has a rule'
              : `${gaps.length} ${gaps.length === 1 ? 'method has' : 'methods have'} no rule at all`
          }
        />
        {gaps.length > 0 && (
          <div className="overflow-hidden" style={PANEL_STYLE}>
            {gaps.map((method, index) => (
              <Line key={method.id} first={index === 0}>
                <PrimitiveText
                  {...font(body.sm)}
                  color={colors.gray[700]}
                  style={{ flex: '1 0 180px', minWidth: 0 }}
                  truncate
                >
                  {method.name}
                </PrimitiveText>
                <PrimitiveText {...font(body.sm)} color={colors.gray[500]}>
                  No rule covers this method
                </PrimitiveText>
              </Line>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── 4. Compare ──────────────────────────────────────────────────────────────────────────

/**
 * Two groups, on one set of rows.
 *
 * Two branches of a tree are never beside each other — that is a property of drawing a tree,
 * not a shortcoming of this data — so the question *is UPI cheaper than cards* costs you two
 * trips and a memory. Here it costs a glance. The columns are padded to the same length so
 * the nth charge of one sits level with the nth of the other.
 */
export function FeeCompare({ rows }: { rows: FeeRow[] }) {
  const names = useMemo(() => groupNames(rows), [rows])
  const [left, setLeft] = useState(names[0] ?? '')
  const [right, setRight] = useState(names[1] ?? names[0] ?? '')
  const items = useMemo(
    () => [{ items: names.map((name) => ({ value: name, label: name })) }],
    [names],
  )

  const leftRows = rows.filter((row) => row.group === left)
  const rightRows = rows.filter((row) => row.group === right)
  const depth = Math.max(leftRows.length, rightRows.length)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SingleSelectV2
          placeholder="Pick a group"
          aria-label="Group on the left"
          size={SingleSelectV2Size.SM}
          variant={SingleSelectV2Variant.CONTAINER}
          triggerDimensions={{ width: '100%' }}
          items={items}
          selected={left}
          onSelect={setLeft}
        />
        <SingleSelectV2
          placeholder="Pick a group"
          aria-label="Group on the right"
          size={SingleSelectV2Size.SM}
          variant={SingleSelectV2Variant.CONTAINER}
          triggerDimensions={{ width: '100%' }}
          items={items}
          selected={right}
          onSelect={setRight}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[leftRows, rightRows].map((side, index) => (
          <div key={index} className="overflow-hidden" style={PANEL_STYLE}>
            <GroupHead
              label={index === 0 ? left : right}
              note={`· ${side.length} ${side.length === 1 ? 'charge' : 'charges'}`}
            />
            {Array.from({ length: depth }, (_, position) => {
              const row = side[position]
              return (
                <div
                  key={position}
                  className="flex flex-col gap-1 px-4 py-2.5"
                  style={{ borderTop: HAIRLINE, minHeight: 64 }}
                >
                  {row ? (
                    <>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <PrimitiveText
                          {...font(body.sm)}
                          color={colors.gray[700]}
                          style={{ flex: '1 0 0', minWidth: 0 }}
                          truncate
                        >
                          {row.name}
                        </PrimitiveText>
                        <ModeTag mode={row.mode} />
                      </div>
                      <Price row={row} />
                      <PrimitiveText {...font(body.xs)} color={colors.gray[500]}>
                        {qualifierOf(row)}
                      </PrimitiveText>
                    </>
                  ) : (
                    // The other side has a charge here and this one does not, which is itself
                    // the comparison — so the row stays and says so.
                    <PrimitiveText {...font(body.sm)} color={colors.gray[400]}>
                      Nothing here
                    </PrimitiveText>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 5. Summary ──────────────────────────────────────────────────────────────────────────

/**
 * The figures first, then where they come from.
 *
 * Every other view here assumes you know what you are looking for. This one is for arriving:
 * four numbers that say how big this configuration is and how much of it is this rule's, then
 * the branches underneath so the numbers have somewhere to go.
 */
export function FeeSummary({ rows, rule }: { rows: FeeRow[]; rule: FeeRule }) {
  const methods = coverage()
  // This rule's own share, the same split `FeeCoverage` makes — "how many methods have *a*
  // rule" was always every one of them, which is a headline figure that says nothing.
  const mine = methods.filter((method) =>
    method.rules.some((entry) => entry.id === rule.id),
  ).length
  const transactional = rows.filter((row) => row.kind.startsWith('Transactional')).length
  const banded = rows.filter((row) => bandCount(row) > 1).length

  const stats = [
    {
      title: 'Charges mapped',
      value: String(rows.length),
      subtitle: `across ${byBranch(rows).length} branches`,
      icon: <Receipt size={STAT_ICON} color={colors.gray[500]} />,
    },
    {
      title: 'Methods on this rule',
      value: `${mine} of ${methods.length}`,
      subtitle: `${methods.length - mine} under other rules`,
      icon: <Wallet size={STAT_ICON} color={colors.gray[500]} />,
    },
    {
      title: 'Per payment',
      value: String(transactional),
      subtitle: `${rows.length - transactional} billed by period`,
      icon: <Zap size={STAT_ICON} color={colors.gray[500]} />,
    },
    {
      title: 'Priced in bands',
      value: String(banded),
      subtitle: banded === 0 ? 'every charge is one rate' : 'the rest charge one rate',
      icon: <Layers size={STAT_ICON} color={colors.gray[500]} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCardV2
            key={stat.title}
            variant={StatCardV2Variant.NUMBER}
            title={stat.title}
            titleIcon={stat.icon}
            value={stat.value}
            subtitle={stat.subtitle}
            maxWidth="none"
          />
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <SectionHead title="Where they sit" note="every charge, by branch" />
        <div className="overflow-hidden" style={PANEL_STYLE}>
          {byBranch(rows).map((branch, index) => (
            <Line key={branch.key} first={index === 0}>
              <PrimitiveText
                {...font(body.sm)}
                color={colors.gray[700]}
                style={{ flex: '1 0 200px', minWidth: 0 }}
                truncate
              >
                {branch.key}
              </PrimitiveText>
              <PrimitiveText
                {...font(body.sm)}
                color={colors.gray[500]}
                style={{ flex: '2 0 200px', minWidth: 0 }}
                truncate
              >
                {branch.groups.map((group) => group.group).join(', ')}
              </PrimitiveText>
              <PrimitiveText
                {...font(body.sm)}
                color={colors.gray[700]}
                style={{ whiteSpace: 'nowrap' }}
              >
                {branch.groups.reduce((n, group) => n + group.rows.length, 0)} charges
              </PrimitiveText>
            </Line>
          ))}
        </div>
      </section>
    </div>
  )
}
