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
    description:
      'Match your internal records against gateway & bank settlement files to catch any mismatches or missing entries.',
    sourceTypes: [
      { id: 'Overall', description: 'Every record whether matched or not' },
      { id: 'Matched', description: 'Only records that reconciled' },
      { id: 'Mismatched', description: 'Only mismatched or unreconciled rows' },
    ],
  },
  {
    id: 'File Summary',
    description:
      'Summarise or export raw data from transaction, settlement, or chargeback files without cross-referencing.',
    sourceTypes: [
      // The design only draws the Reconciliation branch of this question, so these two
      // descriptions are written here rather than transcribed. Replace them when the
      // File Summary frames land.
      { id: 'Settlement', description: 'Settlement files as received from the gateway or bank' },
      { id: 'Transaction', description: 'Transaction-level records as captured by the payment stack' },
    ],
  },
] as const

/** The third question of the create flow. No table column reads it yet. */
export const REPORT_FORMATS = [
  {
    id: 'Raw',
    description: 'One row per record, ideal for audit trails and custom analysis',
  },
  {
    id: 'Aggregated',
    description: 'Grouped and totalled by the fields you pick in the next step.',
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
export type SourceTypeOption = { id: string; description: string }

export const sourceTypesFor = (category: ReportCategory): readonly SourceTypeOption[] =>
  REPORT_CATEGORIES.find(({ id }) => id === category)?.sourceTypes ?? []
