import { Mail, Server, type LucideIcon } from 'lucide-react'
import slackLogo from '../../assets/slack-logo.jpg'
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

/** The two cadences that also ask which day they go out on — a weekday, or a date. */
export const WEEKLY = 'Weekly'
export const MONTHLY = 'Monthly'

/** The one cadence that can also be answered with "whenever recon finishes". */
export const DAILY = 'Daily'

/** Cadence — node 4410:29816. */
export const FREQUENCIES: Option[] = [
  { id: DAILY, description: 'Sent every day' },
  { id: 'Weekly', description: 'Sent on a chosen day each week' },
  { id: 'Monthly', description: 'Sent on a chosen date each month' },
]

/**
 * When within that cadence — node 4410:29801, nested inside the same question.
 *
 * Only Daily is asked. A weekly or monthly report has nothing to fire off the back of: recon
 * completes every day, so "as soon as recon completes" on a Monday cadence is either a daily
 * report or a sentence with no meaning. Those two cadences take SPECIFIED_TIME as given (see
 * DeliveryStep) and go straight to which day and what time.
 */
export const SPECIFIED_TIME = 'Specified Time'
export const TIMINGS: Option[] = [
  { id: SPECIFIED_TIME, description: 'Sent everyday at the time you choose' },
  { id: 'Immediately', description: 'Sent as soon as recon completes.' },
]

/**
 * The design draws this as a "datePicker" instance but renders a plain value dropdown, and
 * the published 0.0.37 ships no TimePicker (it exists on GitHub — rule 3), so it is a
 * SingleSelectV2 over the day in 30-minute steps, 12:00 AM to 11:30 PM. Nothing is
 * preselected: a send time is the user's choice, not a default to overlook.
 */
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, step) => {
  const hour = Math.floor(step / 2)
  const label = `${hour % 12 === 0 ? 12 : hour % 12}:${step % 2 === 0 ? '00' : '30'} ${hour < 12 ? 'AM' : 'PM'}`
  return { label, value: label }
})

/** Which day a Weekly report goes out on — one day, so a single select. Week starts Monday. */
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
].map((day) => ({ label: day, value: day }))

/**
 * Which day a Monthly report goes out on. The 1st to the 30th, then "Last day of the month"
 * in place of a 31st — a 31st would silently skip every shorter month, while the last day
 * always exists.
 */
export const LAST_DAY_OF_MONTH = 'Last day of the month'
const ordinal = (day: number) => {
  const suffix =
    day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'
  return `${day}${suffix}`
}
export const DAYS_OF_MONTH = [
  ...Array.from({ length: 30 }, (_, index) => ordinal(index + 1)),
  LAST_DAY_OF_MONTH,
].map((day) => ({ label: day, value: day }))

/**
 * Where the report goes — node 4418:6398. Checkboxes rather than the single-choice cards
 * above: a config can go out on more than one channel. Email carries a field of its own,
 * revealed by ticking it.
 */
export const EMAIL_CHANNEL = 'Email'
/** Carries a field of its own too — the channel to post to — revealed by ticking it. */
export const SLACK_CHANNEL = 'Slack'
/** Ticking it reveals a notice that no SFTP configuration exists yet. */
export const SFTP_CHANNEL = 'SFTP'
/**
 * In display order: Email alone on the first row, the rest on the second (DeliveryStep).
 *
 * `icon` is a lucide glyph, or an image src for a brand mark lucide has no glyph for — Slack's
 * logo is the asset exported from the design (node 4850:101706).
 */
export const DELIVERY_CHANNELS: { id: string; icon: LucideIcon | string }[] = [
  { id: EMAIL_CHANNEL, icon: Mail },
  { id: SLACK_CHANNEL, icon: slackLogo },
  { id: SFTP_CHANNEL, icon: Server },
]

export type DeliveryAnswers = {
  frequency: string | null
  timing: string | null
  /** Only asked, and only kept, while the cadence is Weekly. */
  dayOfWeek: string | null
  /** Only asked, and only kept, while the cadence is Monthly. */
  dayOfMonth: string | null
  time: string
  channels: string[]
  /** Confirmed recipients — each one a tag in the field. */
  emailTo: string[]
  /** `null` until the "Cc" / "Bcc" link is pressed — the field only exists once asked for. */
  emailCc: string[] | null
  emailBcc: string[] | null
  /** The Slack channel to post to, without its leading `#` — the field draws that. */
  slackChannel: string
}

/**
 * Deliberately loose: something, an @, a domain with a dot. It catches a half-typed address
 * before it becomes a tag; the real check is whether mail arrives.
 */
export const isEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const EMPTY_DELIVERY: DeliveryAnswers = {
  frequency: null,
  timing: null,
  dayOfWeek: null,
  dayOfMonth: null,
  // Unselected until the user picks one; isDeliveryComplete holds the step until then.
  time: '',
  channels: [],
  emailTo: [],
  emailCc: null,
  emailBcc: null,
  slackChannel: '',
}

export const isDeliveryComplete = ({
  frequency,
  timing,
  dayOfWeek,
  dayOfMonth,
  time,
  channels,
  emailTo,
  slackChannel,
}: DeliveryAnswers) =>
  frequency !== null &&
  timing !== null &&
  (timing !== SPECIFIED_TIME || time !== '') &&
  // A weekly or monthly send at a set time has to know which day; "Immediately" never asks.
  (frequency !== WEEKLY || timing !== SPECIFIED_TIME || dayOfWeek !== null) &&
  (frequency !== MONTHLY || timing !== SPECIFIED_TIME || dayOfMonth !== null) &&
  channels.length > 0 &&
  // The To field is marked required in the design, so a ticked Email with nowhere to send
  // it does not count as answered.
  (!channels.includes(EMAIL_CHANNEL) || emailTo.length > 0) &&
  // Channel ID is required in the design (node 4850:101705) for the same reason.
  (!channels.includes(SLACK_CHANNEL) || slackChannel.trim() !== '')

/**
 * The schedule read back as a sentence — what the blue alert under the cadence says.
 *
 * Every permutation gets one, and each says the same two things: when the file goes out, and
 * which stretch of data it covers. The second half is the part that cannot be worked out from
 * the controls above it — "Monthly, on the 1st, at 4:30 PM" does not tell you whether the 1st
 * is the start of the window or the end of it — which is the whole reason the alert exists
 * rather than being a restatement of three selects.
 *
 * `null` until the permutation is actually answered: a sentence with a blank where its time
 * should be is worse than no sentence.
 */
export type ScheduleNote = string | null

/** "4:30 PM" → "16:30". The coverage window is stated in 24-hour time, as the design has it. */
const to24Hour = (time: string) => {
  const parts = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(time)
  if (!parts) return time
  const [, hour, minute, meridiem] = parts
  const hours = (Number(hour) % 12) + (meridiem === 'PM' ? 12 : 0)
  return `${String(hours).padStart(2, '0')}:${minute}`
}

/** The day a weekly window closes on — the one before it opens, so the week is whole. */
const dayBefore = (day: string) => {
  const days = DAYS_OF_WEEK.map(({ value }) => value)
  const index = days.indexOf(day)
  return index === -1 ? day : days[(index + days.length - 1) % days.length]
}

export const scheduleNoteFor = ({
  frequency,
  timing,
  dayOfWeek,
  dayOfMonth,
  time,
}: DeliveryAnswers): ScheduleNote => {
  if (frequency === null || timing === null) return null

  if (timing !== SPECIFIED_TIME) {
    return (
      'Reports are generated and sent once reconciliation processing is complete — no fixed ' +
      'time. Delivery is typically within 15 minutes.'
    )
  }
  if (time === '') return null

  if (frequency === WEEKLY) {
    if (dayOfWeek === null) return null
    return `Your weekly report will be sent every ${dayOfWeek} at ${time}, covering ${dayOfWeek} to ${dayBefore(dayOfWeek)}.`
  }

  if (frequency === MONTHLY) {
    if (dayOfMonth === null) return null
    // Sent on the 1st, or on the last day, and the window is the month either way — which is
    // the design's own wording. Any other date covers the month *ending* the day before it
    // comes round again, and saying so is the only way that date means anything.
    const when = dayOfMonth === LAST_DAY_OF_MONTH ? 'the last day of every month' : `the ${dayOfMonth} of every month`
    const covers =
      dayOfMonth === '1st' || dayOfMonth === LAST_DAY_OF_MONTH
        ? '1st to last day of the month'
        : `the ${dayOfMonth} of the previous month to the day before the ${dayOfMonth} of this one`
    return `Your monthly report will be sent on ${when} at ${time}, covering ${covers}.`
  }

  return `Your daily report will be sent every day at ${time}, covering 00:00 to ${to24Hour(time)} (IST).`
}

/**
 * Step 3 — the columns the report will carry (node 4418:6965).
 *
 * Each column keeps an id of its own because the title is editable and duplicable: keying
 * React off the title would make two columns called "<Title>" the same column.
 */
/** `defaultValue` is set only on custom columns — the value every row carries in it. */
export type FieldColumn = { id: string; title: string; defaultValue?: string }

/** The default title a freshly inserted column carries until it is renamed. */
export const NEW_COLUMN_TITLE = '<Title>'

let nextColumnId = 0
export const newFieldColumn = (title = NEW_COLUMN_TITLE, defaultValue?: string): FieldColumn => ({
  id: `field-${(nextColumnId += 1)}`,
  title,
  ...(defaultValue ? { defaultValue } : {}),
})

/** A field made with "Add custom column" — kept after its column leaves the table. */
export type CustomField = { title: string; defaultValue?: string }

/**
 * `customFields` is the user's own vocabulary, beside FIELD_TAGS. It is stored rather than
 * derived from `columns` because a custom tag has to survive being deselected: once its
 * column is gone, nothing in `columns` remembers it existed.
 */
export type FieldsAnswers = {
  columns: FieldColumn[]
  customFields: CustomField[]
  /**
   * Column ids the report groups by, outermost first — see GroupByBar. Order is the whole
   * point: "Gateway, then Txn Type" is a different report from "Txn Type, then Gateway", so
   * this is a list and not a set.
   *
   * Optional because it arrived after the other two and every version but 7 ignores it. Ids
   * rather than titles, so renaming a column in the table header does not orphan its grouping.
   */
  groupBy?: string[]
}

/**
 * Nothing selected. The step opens on its own empty state ("No columns yet — pick a field
 * below…") and the table is built up from there.
 *
 * It used to open with five columns already in it, which answered the question the step is
 * asking before anyone had read it, and left "Clear all" as the only route to a selection of
 * your own. `isFieldsComplete` already required a non-empty list, so Next is correctly
 * disabled until something is chosen — no extra guard was needed for this.
 */
export const EMPTY_FIELDS: FieldsAnswers = {
  customFields: [],
  groupBy: [],
  columns: [],
}

/**
 * The field vocabulary offered under the table — node 4457:15485, in the design's own order.
 *
 * Transcribed verbatim, spelling included: "Merchant Id" and "Payment Entity Txn Id" differ
 * in case from the default column titles above, which is why selection is matched
 * case-insensitively rather than by string equality (see `isFieldSelected`).
 *
 * Four of these are not from that node — Failure Count, Success Rate, Total Amount and Total
 * Transactions are report-level aggregates rather than columns off a transaction row, and are
 * what "Add important columns" selects (IMPORTANT_FIELDS below). They sit in the list in the
 * same alphabetical order as the rest so the vocabulary reads as one set, and they carry
 * samples of their own in field-samples.ts so a preview of them is not a row of dashes.
 */
export const FIELD_TAGS = [
  'Credit',
  'Debit',
  'Failure Count',
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
  'Success Rate',
  'Tax',
  'Total Amount',
  'Total Transactions',
  'Txn Amount',
  'Txn Currency',
  'Txn Date',
  'Txn Type',
]

/**
 * What "Add important columns" puts in the table, in the order it adds them.
 *
 * Deliberately a list of its own rather than a flag on FIELD_TAGS: this is an opinion about
 * where a report should start, and this is the only place it is written down. The order is
 * the reading order of the result — the headline rate, the volume behind it, the money,
 * then the operational detail.
 *
 * Every entry has to be a FIELD_TAGS name, and `satisfies` fails the build if one stops
 * being one — renaming a tag without renaming it here would otherwise leave the button
 * quietly adding a custom column instead of lighting the chip.
 */
export const IMPORTANT_FIELDS = [
  'Success Rate',
  'Total Transactions',
  'Total Amount',
  'Failure Count',
] as const satisfies readonly (typeof FIELD_TAGS)[number][]

/**
 * The fields the Grouping step offers, out of the whole vocabulary above.
 *
 * A subset because grouping is not the same question as "which columns do you want". A
 * GROUP BY needs a *dimension* — something a row can be bucketed by — and most of FIELD_TAGS
 * is not one:
 *
 * - Measures are what you aggregate, not what you group by. Grouping by Txn Amount asks for
 *   one row per distinct rupee value. That rules out Credit, Debit, Fee, Tax, Txn Amount,
 *   Settlement Amount and the four report-level aggregates (IMPORTANT_FIELDS).
 * - Identifiers are unique per record, so grouping by one returns the ungrouped report with
 *   extra steps. That rules out ID, Recon Id, Payment Entity Txn Id and the free-text Label.
 *
 * What survives is the eight below: two entities, the recon status pair, two dates and the
 * two categorical facts about a transaction. Custom fields are still offered alongside these
 * — GroupingStep appends them — because nothing here can know a custom column's cardinality.
 *
 * Same `satisfies` guard as IMPORTANT_FIELDS: renaming a tag without renaming it here would
 * otherwise drop a field out of the step silently.
 */
export const GROUPABLE_FIELDS = [
  'Gateway',
  'Merchant Id',
  'Recon Status',
  'Recon Sub Status',
  'Settlement Date',
  'Txn Currency',
  'Txn Date',
  'Txn Type',
] as const satisfies readonly (typeof FIELD_TAGS)[number][]

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

/**
 * Whether two column titles name the same field. Exported because the Grouping step asks the
 * same question of the same free-text titles, and two copies of this rule drifting apart is
 * exactly how a chip ends up lit for a column that is not there.
 */
export const sameField = (a: string, b: string) => normalise(a) === normalise(b)

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
 * rather than looked up from the label. The two have moved independently twice now — `is in`
 * became `contains` and then `in`, keeping `brackets-check` throughout — and a glyph keyed on
 * copy is a glyph that disappears the next time someone rewords a condition.
 */
export const FILTER_CONDITIONS = [
  { id: 'equal to', icon: 'equal', takesValue: true },
  { id: 'not equal to', icon: 'equal-not', takesValue: true },
  { id: 'is null', icon: 'brackets', takesValue: false },
  { id: 'is not null', icon: 'brackets-ellipses', takesValue: false },
  // `in` and `not in`, because the value beside them is a *set* — the Value control is a
  // multi-select, so "Gateway contains Razorpay, PayU" reads as a substring test on a list it
  // is not. Read as a sentence, "Gateway in Razorpay, PayU" is the rule these rows apply.
  { id: 'in', icon: 'brackets-check', takesValue: true },
  { id: 'not in', icon: 'brackets-x', takesValue: true },
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

/**
 * The groupings that still stand, in order — derived on every read rather than pruned on
 * write. A column can leave the table from four places (its chip, its ✕, Clear all, a
 * rename), and a stored list kept in sync from all four is a list that eventually is not.
 */
export const activeGroupBy = ({ columns, groupBy }: FieldsAnswers) =>
  (groupBy ?? []).filter((id) => columns.some((column) => column.id === id))

/** Whether any grouping level is set — the Grouping step's equivalent of `hasAnyFilter`. */
export const hasAnyGrouping = (answers: FieldsAnswers) => activeGroupBy(answers).length > 0

/** A column with a blank name would produce a nameless header in the report. */
export const isFieldsComplete = ({ columns }: FieldsAnswers) =>
  columns.length > 0 && columns.every(({ title }) => title.trim() !== '')
