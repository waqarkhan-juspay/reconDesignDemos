import { useDialKit, useDialKitController } from 'dialkit'
import { SHOW_DIALKIT, spacingDial } from '../../dev-tools'

/**
 * Seven arrangements of the same four things — the two totals, the range, and Generate Payment
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
 * `aligned` — **Range above the container.** Layout 6's container without its header band:
 *            the range and Generate sit on their own row above it, flush with the container's
 *            two edges. The default.
 */
export type ReconLayout = 'table' | 'header' | 'strip' | 'inline' | 'rail' | 'scoped' | 'aligned'

const LAYOUTS: { value: ReconLayout; label: string }[] = [
  { value: 'table', label: '1 — Generate on the table' },
  { value: 'header', label: '2 — Everything in the header' },
  { value: 'strip', label: '3 — Summary strip' },
  { value: 'inline', label: '4 — Minimal, no cards' },
  { value: 'rail', label: '5 — Summary rail' },
  { value: 'scoped', label: '6 — Date range scopes the page' },
  // The default since 2026-10-05.
  { value: 'aligned', label: '7 — Range above the container' },
]

const DEFAULT: ReconLayout = 'aligned'

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
 * Where the actions for the ticked rows — Mark Ready, Revert to Hold, Deselect all — appear.
 *
 * `above`  — our SelectionBar (kit.tsx), a bar of its own above the table that pushes the
 *            rows down while anything is ticked. The default.
 * `inside` — DataTable's own BulkActionBar, floating over the rows inside the table's box,
 *            with the same actions handed in as its `customActions`.
 */
export type ReconSelectionBar = 'above' | 'inside'

const SELECTION_BARS: { value: ReconSelectionBar; label: string }[] = [
  { value: 'above', label: 'Version 1 — Above the table' },
  { value: 'inside', label: 'Version 2 — Inside the table (Blend)' },
]

const DEFAULT_SELECTION_BAR: ReconSelectionBar = 'above'

/** Stable, so every visit shares one saved value — see flow-layout.tsx. */
const PANEL_ID = 'recon-summary-layout'
const PERSIST_KEY = 'dialkit:recon-summary-layout'

/** One select dial: its options, and the value it starts on. */
const select = <V extends string>(options: { value: V; label: string }[], fallback: V) => ({
  type: 'select' as const,
  options,
  default: fallback,
})

/** Every select on the panel — the one place a dial is declared. */
const SELECTS = {
  layout: select(LAYOUTS, DEFAULT),
  columns: select(COLUMN_SETS, DEFAULT_COLUMNS),
  cards: select(CARD_ORDERS, DEFAULT_CARD_ORDER),
  cardSize: select(CARD_SIZES, DEFAULT_CARD_SIZE),
  selectionBar: select(SELECTION_BARS, DEFAULT_SELECTION_BAR),
}

type ReconDials = { [K in keyof typeof SELECTS]: (typeof SELECTS)[K]['default'] }

export function useReconSummaryDials(): ReconDials {
  const { values } = useDialKitController('Payment Info Generator', SELECTS, {
    id: PANEL_ID,
    persist: { key: PERSIST_KEY },
  })

  // DialKit types a select as a plain string; a stored value that is no longer an option
  // falls back to the default. With the dials hidden the stored value is ignored outright.
  const pick = <K extends keyof ReconDials>(key: K): ReconDials[K] => {
    const { options, default: fallback } = SELECTS[key]
    const stored = values[key]
    const known = (options as { value: string }[]).some((option) => option.value === stored)
    return (SHOW_DIALKIT && known ? stored : fallback) as ReconDials[K]
  }
  return {
    layout: pick('layout'),
    columns: pick('columns'),
    cards: pick('cards'),
    cardSize: pick('cardSize'),
    selectionBar: pick('selectionBar'),
  }
}

const dial = spacingDial

/**
 * Every gap between the page's main pieces, in px, top to bottom. The defaults were tuned
 * on these dials on 2026-10-05. contentPadding and cardsToTable are the container in layouts
 * 6 and 7; barPadding and barToCards are layout 6's header band (contentPadding is then its
 * sides and bottom, barToCards its top). Layout 7 has no band — contentPadding is all four
 * sides. Elsewhere the cards and table are the page's own
 * blocks, spaced by titleToContent. The rest apply to every layout.
 *
 * barToContainer is layout 7's range row to the container under it — tighter than
 * titleToContent, because the range scopes that container: the row reads as its header,
 * not as a third block level with the title.
 */
const SPACING_DIALS = {
  pageTop: dial(24),
  titleToContent: dial(24),
  barToContainer: dial(16),
  barPaddingX: dial(24),
  barPaddingY: dial(24),
  barToCards: dial(32),
  contentPadding: dial(24),
  cardGap: dial(12),
  cardsToTable: dial(32),
  selectionToTable: dial(12),
  pageBottom: dial(24),
}

type ReconSpacing = { [K in keyof typeof SPACING_DIALS]: number }

const DEFAULT_SPACING = Object.fromEntries(
  Object.entries(SPACING_DIALS).map(([key, [value]]) => [key, value]),
) as ReconSpacing

export function useReconSummarySpacing(): ReconSpacing {
  const spacing = useDialKit('Payment Info Generator spacing', SPACING_DIALS)
  return SHOW_DIALKIT ? spacing : DEFAULT_SPACING
}
