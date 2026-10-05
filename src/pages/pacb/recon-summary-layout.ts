import { useDialKitController } from 'dialkit'
import { SHOW_DIALKIT } from '../../dev-tools'

/**
 * Six arrangements of the same four things — the two totals, the range, and Generate Payment
 * Info — around the one table. Nothing else on the page moves between them.
 *
 * `table`  — **Generate on the table.** The range sits with the title; the cards follow;
 *            Generate is in the table's own header beside a "Settlements" title, since the
 *            rows it acts on are the rows right under it.
 * `header` — **Everything in the header.** Range and Generate side by side at the title's
 *            right, the cards below on their own. The conventional page-level CTA spot.
 * `strip`  — **Summary strip.** Range with the title; one bordered strip holding both totals
 *            and, at its right end, Generate — the totals and the thing that settles them read
 *            as one statement.
 * `inline` — **Minimal.** No card borders: the totals as plain figures on the left, range and
 *            Generate on the right, all in one row under the title. Most room for the table.
 * `rail`   — **Summary rail.** A narrow column left of the table with the totals stacked and
 *            Generate full-width beneath them; the table takes the rest.
 * `scoped` — **Date range scopes the page.** The range is the header of one container that
 *            holds both totals and the table, with Generate — which takes every READY row in the
 *            range — at the bar's far end. The picker reads as the
 *            control over everything inside it, not one more control beside them.
 */
export type ReconLayout = 'table' | 'header' | 'strip' | 'inline' | 'rail' | 'scoped'

const LAYOUTS: { value: ReconLayout; label: string }[] = [
  // The default: picked on review on 2026-10-01 — Generate sits beside the rows it acts on.
  { value: 'table', label: '1 — Generate on the table' },
  { value: 'header', label: '2 — Everything in the header' },
  { value: 'strip', label: '3 — Summary strip' },
  { value: 'inline', label: '4 — Minimal, no cards' },
  { value: 'rail', label: '5 — Summary rail' },
  { value: 'scoped', label: '6 — Date range scopes the page' },
]

const DEFAULT: ReconLayout = 'table'

/**
 * `lean` — without AD UTR No, Merchant UTR No and Settlement ID, which are empty until
 *          payment. The default.
 * `full` — every column, as the original screen had them.
 */
export type ReconColumnSet = 'lean' | 'full'

const COLUMN_SETS: { value: ReconColumnSet; label: string }[] = [
  { value: 'lean', label: 'Version 2 — Without payout references' },
  { value: 'full', label: 'Version 1 — All columns' },
]

const DEFAULT_COLUMNS: ReconColumnSet = 'lean'

/**
 * `label-first` — Blend's order: "Pending Amount" over the figure. The default.
 * `value-first` — the figure over its label, each keeping its own type and colour.
 */
export type ReconCardOrder = 'label-first' | 'value-first'

const CARD_ORDERS: { value: ReconCardOrder; label: string }[] = [
  { value: 'label-first', label: 'Version 1 — Label above value' },
  { value: 'value-first', label: 'Version 2 — Value above label' },
]

const DEFAULT_CARD_ORDER: ReconCardOrder = 'label-first'

/**
 * `minimal` — value 18/24, label 12/18, tighter padding: figures that report beside the page
 *             title rather than outweigh it. The default since 2026-10-01.
 * `regular` — the value at 24/32, label 14/20, as the cards were before.
 */
export type ReconCardSize = 'minimal' | 'regular'

const CARD_SIZES: { value: ReconCardSize; label: string }[] = [
  { value: 'regular', label: 'Version 1 — Regular (24px value)' },
  { value: 'minimal', label: 'Version 2 — Minimal (18px value)' },
]

const DEFAULT_CARD_SIZE: ReconCardSize = 'minimal'

/**
 * `sheet` — filter and sort by any field in the row detail sheet.
 * `table` — only by the columns the table is showing, under its header names. The default
 *           since 2026-10-01: the panel never offers a field you cannot see in the rows.
 */
export type ReconFilterScope = 'sheet' | 'table'

const FILTER_SCOPES: { value: ReconFilterScope; label: string }[] = [
  { value: 'sheet', label: 'Version 1 — Every field in the detail sheet' },
  { value: 'table', label: 'Version 2 — Only the table’s columns' },
]

const DEFAULT_FILTER_SCOPE: ReconFilterScope = 'table'

/** Stable, so every visit shares one saved value — see flow-layout.tsx. */
const PANEL_ID = 'recon-summary-layout'
const PERSIST_KEY = 'dialkit:recon-summary-layout'

export function useReconSummaryDials(): {
  layout: ReconLayout
  columns: ReconColumnSet
  cards: ReconCardOrder
  cardSize: ReconCardSize
  filters: ReconFilterScope
} {
  const { values } = useDialKitController(
    'Payment Info Generator',
    {
      layout: {
        type: 'select',
        options: LAYOUTS,
        default: DEFAULT,
      },
      columns: {
        type: 'select',
        options: COLUMN_SETS,
        default: DEFAULT_COLUMNS,
      },
      cards: {
        type: 'select',
        options: CARD_ORDERS,
        default: DEFAULT_CARD_ORDER,
      },
      cardSize: {
        type: 'select',
        options: CARD_SIZES,
        default: DEFAULT_CARD_SIZE,
      },
      filters: {
        type: 'select',
        options: FILTER_SCOPES,
        default: DEFAULT_FILTER_SCOPE,
      },
    },
    { id: PANEL_ID, persist: { key: PERSIST_KEY } },
  )

  // DialKit types a select as a plain string; a stored value that is no longer an option
  // falls back to the default. With the dials hidden the stored value is ignored outright.
  if (!SHOW_DIALKIT) {
    return {
      layout: DEFAULT,
      columns: DEFAULT_COLUMNS,
      cards: DEFAULT_CARD_ORDER,
      cardSize: DEFAULT_CARD_SIZE,
      filters: DEFAULT_FILTER_SCOPE,
    }
  }
  return {
    layout: LAYOUTS.find((option) => option.value === values.layout)?.value ?? DEFAULT,
    columns:
      COLUMN_SETS.find((option) => option.value === values.columns)?.value ?? DEFAULT_COLUMNS,
    cards: CARD_ORDERS.find((option) => option.value === values.cards)?.value ?? DEFAULT_CARD_ORDER,
    cardSize:
      CARD_SIZES.find((option) => option.value === values.cardSize)?.value ?? DEFAULT_CARD_SIZE,
    filters:
      FILTER_SCOPES.find((option) => option.value === values.filters)?.value ??
      DEFAULT_FILTER_SCOPE,
  }
}
