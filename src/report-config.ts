/**
 * The report-config vocabulary, in one place.
 *
 * Category/Source and Source/Type are one two-level list, read from both ends: the
 * Configurator table filters and renders it, and the create flow walks it as a question.
 * Held apart, a rename on one side quietly produces a value the other side cannot hold —
 * and nothing would fail until someone noticed a row missing from a filter.
 *
 * Card copy is transcribed from the create flow at node 4410:28488.
 */

export const REPORT_CATEGORIES = [
  {
    id: 'Reconciliation',
    // `title` is what the create flow shows; `id` stays the value the Configurator table
    // filters on, so renaming a card in the design never moves a row out of its filter.
    // Titles and copy are node 4542:17104's.
    title: 'Reconciliation Report',
    description:
      'Match your internal records against gateway & bank settlement files to catch any mismatches or missing entries',
    sourceTypes: [
      { id: 'Overall', title: 'All records', description: 'Every record whether reconciled or not' },
      { id: 'Matched', title: 'Reconciled', description: 'Only records that are reconciled' },
      { id: 'Mismatched', title: 'Unreconciled', description: 'Only records that are not reconciled' },
    ],
  },
  {
    id: 'File Summary',
    title: 'Source File Report',
    description:
      'Generate a simplified or full report containing only the information you need from a single source file',
    sourceTypes: [
      // The design only draws the Reconciliation branch of this question, so these
      // descriptions are written here rather than transcribed. Replace them when the
      // File Summary frames land.
      { id: 'Settlement', description: 'Settlement files as received from the gateway or bank' },
      { id: 'Transaction', description: 'Transaction-level records as captured by the payment stack' },
      // The third file the category description already names. Adding it here rather than
      // as a loose string on the row is what keeps `Categorised` honest — the union is the
      // only thing stopping a File Summary row being paired with a Reconciliation source.
      { id: 'Chargeback', description: 'Chargeback and dispute files raised against settled transactions' },
    ],
  },
] as const

/** The third question of the create flow. No table column reads it yet. */
export const REPORT_FORMATS = [
  {
    id: 'Raw',
    title: 'Transaction level records',
    description:
      'Each record gets its own row, with no grouping or totals. Best for audits, looking up specific records, or your own analysis.',
  },
  {
    id: 'Aggregated',
    title: 'Grouped records',
    description:
      "One row for each group, such as gateway or payment method, with totals. You'll choose the fields to group by in the Fields step.",
  },
] as const

type CategoryDefinition = (typeof REPORT_CATEGORIES)[number]

export type ReportCategory = CategoryDefinition['id']
export type ReportFormat = (typeof REPORT_FORMATS)[number]['id']

/** `C extends unknown` is what makes this distribute over the union rather than collapse it. */
type PairOf<C> = C extends CategoryDefinition
  ? { categorySource: C['id']; sourceType: C['sourceTypes'][number]['id'] }
  : never

/**
 * Source / Type scoped by Category/Source. Modelling it as a union rather than two loose
 * strings makes an invalid pairing (say File Summary + Matched) a compile error instead of
 * something to catch by eye later.
 */
export type Categorised = PairOf<CategoryDefinition>

export const REPORT_CATEGORY_IDS = REPORT_CATEGORIES.map(({ id }) => id) as ReportCategory[]

/**
 * Widened to a plain array on purpose: the literal type is a union of two readonly tuples,
 * which callers cannot `.map` over without narrowing the category first.
 */
export type SourceTypeOption = { id: string; title?: string; description: string }

export const sourceTypesFor = (category: ReportCategory): readonly SourceTypeOption[] =>
  REPORT_CATEGORIES.find(({ id }) => id === category)?.sourceTypes ?? []
