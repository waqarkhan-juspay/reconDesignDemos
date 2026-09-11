import { Mail, Server, type LucideIcon } from 'lucide-react'
import type { ReportCategory, ReportFormat } from '../../report-config'
import type { Option } from './options'

/**
 * The flow's answers and the data its questions offer — kept out of the step components so
 * those export only components, which is what React Fast Refresh needs.
 */

export type SetupAnswers = {
  category: ReportCategory | null
  sourceType: string | null
  format: ReportFormat | null
}

export const EMPTY_SETUP: SetupAnswers = { category: null, sourceType: null, format: null }

/** The last question gates the step: nothing below it can be answered without the two above. */
export const isSetupComplete = ({ format }: SetupAnswers) => format !== null

/** Cadence — node 4410:29816. */
export const FREQUENCIES: Option[] = [
  { id: 'Daily', description: 'Sent every day' },
  { id: 'Weekly', description: 'Sent on a chosen day each week' },
  { id: 'Monthly', description: 'Sent on a chosen date each month' },
]

/** When within that cadence — node 4410:29801, nested inside the same question. */
export const SPECIFIED_TIME = 'Specified Time'
export const TIMINGS: Option[] = [
  { id: SPECIFIED_TIME, description: 'Sent everyday at the time you choose' },
  { id: 'Immediately', description: 'Sent as soon as recon completes.' },
]

/**
 * The design draws this as a "datePicker" instance but renders a plain value dropdown, and
 * the published 0.0.37 ships no TimePicker (it exists on GitHub — rule 3), so it is a
 * SingleSelectV2 over the hours. 9:00 AM is the value the design shows.
 */
export const DEFAULT_TIME = '9:00 AM'
export const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const label = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
  return { label, value: label }
})

/**
 * Where the report goes — node 4418:6398. Checkboxes rather than the single-choice cards
 * above: a config can go out on more than one channel. Email carries a field of its own,
 * revealed by ticking it.
 */
export const EMAIL_CHANNEL = 'Email'
export const DELIVERY_CHANNELS: { id: string; icon: LucideIcon }[] = [
  { id: EMAIL_CHANNEL, icon: Mail },
  { id: 'SFTP', icon: Server },
]

export type DeliveryAnswers = {
  name: string
  frequency: string | null
  timing: string | null
  time: string
  channels: string[]
  emailTo: string
}

export const EMPTY_DELIVERY: DeliveryAnswers = {
  name: '',
  frequency: null,
  timing: null,
  time: DEFAULT_TIME,
  channels: [],
  emailTo: '',
}

export const isDeliveryComplete = ({
  name,
  frequency,
  timing,
  time,
  channels,
  emailTo,
}: DeliveryAnswers) =>
  name.trim() !== '' &&
  frequency !== null &&
  timing !== null &&
  (timing !== SPECIFIED_TIME || time !== '') &&
  channels.length > 0 &&
  // The To field is marked required in the design, so a ticked Email with nowhere to send
  // it does not count as answered.
  (!channels.includes(EMAIL_CHANNEL) || emailTo.trim() !== '')

/**
 * Step 3 — the columns the report will carry (node 4418:6965).
 *
 * Each column keeps an id of its own because the title is editable and duplicable: keying
 * React off the title would make two columns called "<Title>" the same column.
 */
export type FieldColumn = { id: string; title: string }

/** The default title a freshly inserted column carries until it is renamed. */
export const NEW_COLUMN_TITLE = '<Title>'

let nextColumnId = 0
export const newFieldColumn = (title = NEW_COLUMN_TITLE): FieldColumn => ({
  id: `field-${(nextColumnId += 1)}`,
  title,
})

export type FieldsAnswers = { columns: FieldColumn[] }

export const EMPTY_FIELDS: FieldsAnswers = {
  columns: [
    'Payment Entity Txn ID',
    'Merchant ID',
    'Gateway',
    'Txn Amount',
    'Txn Type',
  ].map((title) => newFieldColumn(title)),
}

/**
 * The field vocabulary offered under the table — node 4457:15485, in the design's own order.
 *
 * Transcribed verbatim, spelling included: "Merchant Id" and "Payment Entity Txn Id" differ
 * in case from the default column titles above, which is why selection is matched
 * case-insensitively rather than by string equality (see `isFieldSelected`).
 */
export const FIELD_TAGS = [
  'Credit',
  'Debit',
  'Fee',
  'Gateway',
  'ID',
  'Label',
  'Merchant Id',
  'Payment Entity Txn Id',
  'Recon Id',
  'Recon Secondary Status',
  'Recon Secondary Sub Status',
  'Recon Status',
  'Recon Sub Status',
  'Reconciled At',
  'Settlement Amount',
  'Settlement Currency',
  'Settlement Date',
  'Tax',
  'Txn Amount',
  'Txn Currency',
  'Txn Date',
  'Txn Type',
]

/**
 * A tag is lit when a column carries its name — derived, never stored.
 *
 * Two states that could disagree is the whole failure mode here: a tag remembering it was
 * clicked after its column was deleted from the table, or renamed out from under it. There
 * is one source of truth, `columns`, and the tags are a view of it.
 *
 * Case- and space-insensitive because column titles are free text the user can edit: having
 * renamed a column to "merchant id", they mean the Merchant Id field, and a tag that stays
 * dark is just wrong.
 */
const normalise = (value: string) => value.trim().toLowerCase()

export const isFieldSelected = (columns: FieldColumn[], tag: string) =>
  columns.some(({ title }) => normalise(title) === normalise(tag))

/**
 * Whether a column's title names a field in the vocabulary — i.e. whether a tag already
 * stands for it. The columns that fail this are custom ones, and they get a tag of their own.
 * Same case- and space-insensitive match as `isFieldSelected`, so the two can never disagree
 * about whether a column is covered.
 */
export const isVocabularyField = (title: string) =>
  FIELD_TAGS.some((tag) => normalise(tag) === normalise(title))

/**
 * Step 4 — the rows the report keeps (nodes 4521:12504 / 4520:12023).
 *
 * A rule is a column, a condition and a set of values. Column and condition are nullable
 * because a row is added empty and filled left to right — they stay disabled until the
 * column is chosen, so a half-filled rule is the normal state rather than an error.
 *
 * `value` is a list rather than one string: "Gateway equal to Razorpay or PayU" is one rule
 * a user means, and forcing it into two rows joined by AND says the opposite. Empty is the
 * unanswered state, so there is no `null` here — one absence, not two.
 */
export type FilterRule = {
  /** Stable identity, not the index: deleting row 2 must not renumber row 3's React key. */
  id: string
  column: string | null
  condition: string | null
  value: string[]
}

let nextRuleId = 0
export const newFilterRule = (): FilterRule => ({
  id: `rule-${(nextRuleId += 1)}`,
  column: null,
  condition: null,
  value: [],
})

export type FiltersAnswers = { rules: FilterRule[] }

export const EMPTY_FILTERS: FiltersAnswers = { rules: [] }

/**
 * Not an `isComplete`, unlike its three siblings — filters are optional, so this step is
 * never incomplete and never holds the flow up. What this decides is what the primary
 * action *says*: with nothing chosen, the honest label for it is a skip.
 *
 * A row that exists counts, even part-filled. Adding one is a deliberate act, and once the
 * empty state is gone "Skip filters" is no longer what the button does.
 */
export const hasAnyFilter = ({ rules }: FiltersAnswers) => rules.length > 0

/**
 * The conditions, in the design's own order (node 4520:12023 lays out all six).
 *
 * `icon` is the name of the glyph in the design's icon library, and it is carried here
 * rather than looked up from the label. The two moved independently once already — `is in`
 * became `contains` while keeping `brackets-check` — and a glyph keyed on copy is a glyph
 * that disappears the next time someone rewords a condition.
 */
export const FILTER_CONDITIONS = [
  { id: 'equal to', icon: 'equal', takesValue: true },
  { id: 'not equal to', icon: 'equal-not', takesValue: true },
  { id: 'is null', icon: 'brackets', takesValue: false },
  { id: 'is not null', icon: 'brackets-ellipses', takesValue: false },
  { id: 'contains', icon: 'brackets-check', takesValue: true },
  { id: 'does not contain', icon: 'brackets-x', takesValue: true },
] as const

/**
 * Whether a condition has a value to go with it. The two null tests ask about the absence
 * of any value at all, so pairing one with a value is not a filter anyone can mean.
 *
 * An unanswered condition counts as taking one: the field is locked at that point anyway
 * (there is no column yet), and answering "no" here would make an empty rule look finished
 * the control is disabled at that point anyway, there being no column yet.
 */
export const conditionTakesValue = (condition: string | null) =>
  condition === null ||
  (FILTER_CONDITIONS.find(({ id }) => id === condition)?.takesValue ?? true)

/**
 * Values offered for a column, where the column has an obvious closed set. Everything else
 * gets an empty list and relies on the select's own custom-value entry — which is the honest
 * shape here: no dataset stands behind these answers, so the only values that can be offered
 * are the ones the vocabulary already names.
 */
const VALUE_SUGGESTIONS: Record<string, string[]> = {
  Gateway: ['Razorpay', 'PayU', 'Cashfree', 'Stripe'],
  'Txn Type': ['Capture', 'Refund', 'Chargeback', 'Void'],
  'Recon Status': ['Reconciled', 'Unreconciled', 'Partially reconciled'],
  'Recon Sub Status': ['Amount mismatch', 'Missing in bank', 'Missing in ledger'],
  'Txn Currency': ['INR', 'USD', 'EUR', 'GBP'],
  'Settlement Currency': ['INR', 'USD', 'EUR', 'GBP'],
  Credit: ['Yes', 'No'],
  Debit: ['Yes', 'No'],
}

export const valuesFor = (column: string | null) =>
  column === null ? [] : (VALUE_SUGGESTIONS[column] ?? [])

/** A column with a blank name would produce a nameless header in the report. */
export const isFieldsComplete = ({ columns }: FieldsAnswers) =>
  columns.length > 0 && columns.every(({ title }) => title.trim() !== '')
