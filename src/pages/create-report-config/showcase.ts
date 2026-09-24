import {
  DAILY,
  EMPTY_DELIVERY,
  SLACK_CHANNEL,
  newFieldColumn,
  newSignRule,
  type DeliveryAnswers,
  type FieldColumn,
  type FieldsAnswers,
  type SetupAnswers,
  type SignRule,
} from './answers'

/**
 * A pre-filled flow that opens on the Fields step with every state a column row can be in —
 * a design review fixture, not a product default. Flip this to false and the flow opens on an
 * empty Setup again, as it ships.
 *
 * Temporary by intent ("the default view for now"): the flow still works end to end from
 * here — Back walks into answered Setup and Delivery steps, and every row can be edited — so
 * it doubles as a way to test the organiser without clicking through two steps first.
 */
export const OPEN_ON_SHOWCASE = true

/** A grouped reconciliation report — grouped, so rows carry aggregations and Grouped-by tags. */
export const SHOWCASE_SETUP: SetupAnswers = {
  category: 'Reconciliation',
  sourceType: 'Overall',
  format: 'Aggregated',
}

export const SHOWCASE_DELIVERY: DeliveryAnswers = {
  ...EMPTY_DELIVERY,
  frequency: DAILY,
  timing: 'Immediately',
  channels: [SLACK_CHANNEL],
  slackChannel: 'C0123456789',
}

/** A field's column under a title of the user's own — `source` keeps the field it came from. */
const renamed = (field: string, title: string, rest: Partial<FieldColumn> = {}): FieldColumn => ({
  ...newFieldColumn(field),
  title,
  ...rest,
})

const field = (name: string, rest: Partial<FieldColumn> = {}): FieldColumn => ({
  ...newFieldColumn(name),
  ...rest,
})

/** A Txn Type rule — `newSignRule` already starts every rule on that column. */
const rule = (condition: string, value: string[], sign: SignRule['sign']): SignRule => ({
  ...newSignRule(),
  condition,
  value,
  sign,
})

const REGION = { title: 'Region', defaultValue: 'APAC' }
const BATCH = { title: 'Internal reconciliation batch reference', defaultValue: 'RB-2026-Q3' }

/**
 * One row per case, in the order a reviewer would want to meet them — the grouping levels
 * first, as a report reads, then plain fields, then everything a transform or a rename does to
 * one, then custom columns last.
 */
export const SHOWCASE_FIELDS: FieldsAnswers = {
  // Three levels, so the Grouping order reads as an order. Gateway is grouped *and* renamed;
  // Txn Date is grouped *and* transformed; Payment Method is grouped and nothing else.
  groupBy: ['Gateway', 'Txn Date', 'Payment Method'],
  customFields: [REGION, BATCH],
  columns: [
    // Grouped + renamed: Grouped by follows the field, not the title; the info glyph sits beside it.
    renamed('Gateway', 'Acquiring Gateway'),
    // Grouped + date + transformed: the format tag reads the transform, not the source.
    field('Txn Date', { transform: { date: { order: 'YMD' } } }),
    // Grouped, and nothing else.
    field('Payment Method'),

    // Plain field, default aggregation (COUNT).
    field('Merchant Id'),
    // Plain date, untouched: the source's [DD-MM-YYYY], with a non-default aggregation.
    field('Reconciled At', { aggregate: 'MAX' }),
    // Long field name, untouched — the longest in the vocabulary.
    field('Payment Entity Txn Id'),
    // A rate, with an aggregation only rates and measures offer.
    field('Success Rate', { aggregate: 'AVERAGE' }),

    // Amount + transformed with a two-branch sign chain and an otherwise.
    field('Txn Amount', {
      aggregate: 'SUM',
      transform: {
        signs: {
          rules: [
            rule('in', ['Refund', 'Chargeback'], 'NEGATIVE'),
            rule('equal to', ['Order'], 'POSITIVE'),
          ],
          otherwise: 'POSITIVE',
        },
      },
    }),
    // Duplicate of the same field, renamed, untransformed — two treatments of one field.
    renamed('Txn Amount', 'Gross Txn Amount', { aggregate: 'AVERAGE' }),
    // Renamed measure, short name.
    renamed('Fee', 'Processing Fee', { aggregate: 'SUM' }),
    // Amount transformed by a single rule and no otherwise.
    field('Refund Amount', {
      aggregate: 'MIN',
      transform: { signs: { rules: [rule('equal to', ['Refund'], 'NEGATIVE')] } },
    }),

    // Date + renamed + transformed + too long for the row: the name ellipses (hover for the
    // whole of it), the format moves into the info glyph's tooltip, and the glyph and tags stay whole.
    renamed('Settlement Date', 'Date the settlement was credited to the merchant bank account', {
      aggregate: 'MIN',
      transform: { date: { order: 'MDY' } },
    }),
    // Date + renamed, untransformed: the info tooltip carries the source's [DD-MM-YYYY].
    renamed('Settlement Date', 'Settled On'),

    // Custom column, short name.
    field(REGION.title, { defaultValue: REGION.defaultValue }),
    // Custom column with a name too long for the row — custom columns offer no rename, so
    // there is no info glyph, only Custom holding its place beside the ellipsis.
    field(BATCH.title, { defaultValue: BATCH.defaultValue }),
  ],
}
