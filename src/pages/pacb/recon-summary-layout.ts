/**
 * Eight arrangements of the same four things — the two totals, the range, and Generate Payment
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
 *            two edges.
 * `open`   — **Range beside the title, no container.** Layout 7's contents with the
 *            container's border and padding gone, and the range and Generate side by side at
 *            the title's right. Like layout 2, but the cards and table keep layout 7's own
 *            spacing (cardsToTable) and stay one named section. Neither selection bar: the
 *            ticked rows' Mark Ready and Revert to Hold sit on a row of their own between the
 *            cards and the table, at its right. The default since 2026-10-21.
 */
export type ReconLayout =
  'table' | 'header' | 'strip' | 'inline' | 'rail' | 'scoped' | 'aligned' | 'open'

const DEFAULT: ReconLayout = 'open'

/**
 * `lean` — without AD UTR No, Merchant UTR No and Settlement ID, which are empty until
 *          payment. The default.
 * `full` — every column, as the original screen had them.
 */
export type ReconColumnSet = 'lean' | 'full'

const DEFAULT_COLUMNS: ReconColumnSet = 'lean'

/**
 * `label-first` — Blend's order: "Pending Amount" over the figure.
 * `value-first` — the figure over its label, each keeping its own type and colour. The default
 *                 since 2026-10-08.
 */
export type ReconCardOrder = 'label-first' | 'value-first'

const DEFAULT_CARD_ORDER: ReconCardOrder = 'value-first'

/**
 * `minimal` — value 18/24, label 12/18, tighter padding: figures that report beside the page
 *             title rather than outweigh it.
 * `regular` — the value at 24/32, label 14/20. The default since 2026-10-08.
 */
export type ReconCardSize = 'minimal' | 'regular'

const DEFAULT_CARD_SIZE: ReconCardSize = 'regular'

/**
 * Where the actions for the ticked rows — Mark Ready, Revert to Hold, Deselect all — appear.
 * Layout 8 ignores this dial: it has a row of its own for them (see `open` above).
 *
 * `above`  — our SelectionBar (kit.tsx), a bar of its own above the table that pushes the
 *            rows down while anything is ticked.
 * `inside` — DataTable's own BulkActionBar, floating over the rows inside the table's box,
 *            with the same actions handed in as its `customActions`. The default since
 *            2026-10-08.
 */
export type ReconSelectionBar = 'above' | 'inside'

const DEFAULT_SELECTION_BAR: ReconSelectionBar = 'inside'

/** The figure cards' StatTile props for a card order and size. */
export const statCardProps = (order: ReconCardOrder, size: ReconCardSize) => ({
  compact: true,
  tone: 'gray' as const,
  valueFirst: order === 'value-first',
  minimal: size === 'minimal',
})

/**
 * The figure cards as the defaults draw them, for pages without these dials — Escrow to OCA
 * uses it, so its cards stay the Payment Info Generator's as the defaults move.
 */
export const DEFAULT_STAT_CARD = statCardProps(DEFAULT_CARD_ORDER, DEFAULT_CARD_SIZE)

/**
 * The Payment Info Generator's choices. The design workbench tunes these on DialKit; this
 * build has no dials, so each is fixed at the one the design settled on.
 */
const RECON_DIALS: {
  layout: ReconLayout
  columns: ReconColumnSet
  cards: ReconCardOrder
  cardSize: ReconCardSize
  selectionBar: ReconSelectionBar
} = {
  layout: DEFAULT,
  columns: DEFAULT_COLUMNS,
  cards: DEFAULT_CARD_ORDER,
  cardSize: DEFAULT_CARD_SIZE,
  selectionBar: DEFAULT_SELECTION_BAR,
}

export function useReconSummaryDials() {
  return RECON_DIALS
}

/**
 * Every gap between the page's main pieces, in px, top to bottom. They were tuned on the
 * workbench's dials on 2026-10-05, titleToContent and cardsToTable again on
 * 2026-10-09. contentPadding and cardsToTable are the container in layouts
 * 6 and 7; barPadding and barToCards are layout 6's header band (contentPadding is then its
 * sides and bottom, barToCards its top). Layout 7 has no band — contentPadding is all four
 * sides. Elsewhere the cards and table are the page's own
 * blocks, spaced by titleToContent. The rest apply to every layout.
 *
 * barToContainer is layout 7's range row to the container under it — tighter than
 * titleToContent, because the range scopes that container: the row reads as its header,
 * not as a third block level with the title.
 */
const SPACING = {
  pageTop: 24,
  titleToContent: 32,
  barToContainer: 16,
  barPaddingX: 24,
  barPaddingY: 24,
  barToCards: 32,
  contentPadding: 24,
  cardGap: 12,
  cardsToTable: 16,
  selectionToTable: 12,
  pageBottom: 24,
}

export function useReconSummarySpacing() {
  return SPACING
}
