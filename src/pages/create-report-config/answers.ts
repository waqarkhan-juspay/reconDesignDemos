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
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th'
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
    const when =
      dayOfMonth === LAST_DAY_OF_MONTH
        ? 'the last day of every month'
        : `the ${dayOfMonth} of every month`
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
export type FieldColumn = {
  id: string
  title: string
  /** Set only on custom columns — the value every row carries in it. */
  defaultValue?: string
  /**
   * The name this column was created under, kept so a rename does not erase where the column
   * came from. It is what the organiser's info glyph reads back as `represents "…"`, and — more
   * importantly — what decides which field chip is lit (`isFieldSelected`).
   *
   * Without it, renaming a column to the name of another field moved the column onto that
   * field: the chip you picked went dark and a chip you never touched lit up. A title is a
   * label, not an identity.
   *
   * Absent on a column made before a title was chosen (see `newFieldColumn`), which is why
   * every read of it falls back to the title.
   */
  source?: string
  /**
   * How this column is rolled up once the report groups (see `groupBy`). Absent means COUNT
   * — stored only once changed, so an answers object carries the user's decisions rather
   * than a default written 26 times. Read it through `aggregationOf`.
   */
  aggregate?: Aggregation
  /**
   * How this column's values are rewritten on the way into the file — the row menu's "Data
   * Transform". Absent means as received, and so does each half of it: stored only once the user
   * changes something, like `aggregate` above.
   */
  transform?: DataTransform
}

/**
 * The order a date's three parts are written in — every permutation of day, month and year.
 * Named by initials rather than by a format string, so the separator stays out of the stored
 * answer.
 */
export const DATE_ORDERS = ['DMY', 'MDY', 'YMD', 'YDM', 'DYM', 'MYD'] as const
export type DateOrder = (typeof DATE_ORDERS)[number]

/**
 * What goes between the parts — always a hyphen, the one the source files use. Only the order
 * is a choice; slash, dot, space and no separator were offered once and dropped.
 */
const DATE_SEPARATOR = '-'

export type DateFormat = { order: DateOrder }

/** How dates arrive from the source files — DD-MM-YYYY. The format "as received" means. */
export const SOURCE_DATE_FORMAT: DateFormat = { order: 'DMY' }

/** The sign a number is forced to. */
export type ValueSign = 'POSITIVE' | 'NEGATIVE'

/**
 * One branch of an amount column's sign logic: "if Txn Type in Refund, Chargeback, write the
 * amount negative". The condition half is a FilterRule's shape and vocabulary on purpose — the
 * same column, condition and value controls the Filters step draws, asking the same question
 * of a row.
 *
 * The column can be any field in the vocabulary, whether or not the report includes it: the
 * sign is decided on the source row, which carries every field. Txn Type is where a new rule
 * starts, because what kind of transaction it is — an order, a refund, a chargeback — is
 * what decides which way money moved.
 */
export type SignRule = {
  id: string
  column: string | null
  condition: string | null
  value: string[]
  sign: ValueSign | null
}

/**
 * An if / else-if chain read top to bottom — the first rule a row matches decides its sign —
 * and `otherwise` for a row that matches none. Absent `otherwise` keeps the sign the value
 * arrived with.
 */
export type SignRules = { rules: SignRule[]; otherwise?: ValueSign }

export type DataTransform = {
  /** Absent means as received — SOURCE_DATE_FORMAT. */
  date?: DateFormat
  /** Absent means every value keeps the sign it arrived with. */
  signs?: SignRules
}

/** The rule the column is asked about first — see SignRule. */
export const SIGN_RULE_COLUMN = 'Txn Type'

let nextSignRuleId = 0
export const newSignRule = (): SignRule => ({
  id: `sign-rule-${(nextSignRuleId += 1)}`,
  column: SIGN_RULE_COLUMN,
  condition: null,
  value: [],
  sign: null,
})

/** Untouched since it was added — dropped on Apply rather than blocking it. */
export const isSignRuleBlank = (rule: SignRule) =>
  rule.column === SIGN_RULE_COLUMN &&
  rule.condition === null &&
  rule.value.length === 0 &&
  rule.sign === null

/**
 * Values a sign rule offers for a column. Txn Type gets the three kinds that decide which way
 * money moved — Order, Refund, Chargeback, the source file's ORDER and REFUND among them —
 * rather than the Filters step's list (VALUE_SUGGESTIONS), which filters on Capture and Void.
 * Every other column is the Filters step's, and custom values are allowed either way.
 */
export const signRuleValuesFor = (column: string | null) =>
  column !== null && sameField(column, SIGN_RULE_COLUMN)
    ? ['Order', 'Refund', 'Chargeback']
    : valuesFor(column)

/** Every control in the row answered — a null test needs no value, everything else does. */
export const isSignRuleComplete = (rule: SignRule) =>
  rule.column !== null &&
  rule.condition !== null &&
  (!conditionTakesValue(rule.condition) || rule.value.length > 0) &&
  rule.sign !== null

const DATE_PART_TOKEN = { D: 'DD', M: 'MM', Y: 'YYYY' } as const

/** `{ order: 'YMD' }` → `YYYY-MM-DD`. */
export const dateFormatLabel = ({ order }: DateFormat) =>
  [...order]
    .map((part) => DATE_PART_TOKEN[part as keyof typeof DATE_PART_TOKEN])
    .join(DATE_SEPARATOR)

/**
 * A DD-MM-YYYY value rewritten into `format` — what the modal's preview shows, and what a
 * delivered file would carry. Returns the input untouched if it is not DD-MM-YYYY.
 */
export function reformatDate(value: string, format: DateFormat) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
  if (!match) return value
  const parts = { D: match[1], M: match[2], Y: match[3] }
  return [...format.order].map((part) => parts[part as keyof typeof parts]).join(DATE_SEPARATOR)
}

/**
 * The transform to store — with each half dropped when it says "as received", and `undefined`
 * when nothing is left, so a column the user opened and applied unchanged is not marked
 * Transformed.
 */
export function normaliseTransform(transform: DataTransform): DataTransform | undefined {
  const date =
    transform.date && transform.date.order !== SOURCE_DATE_FORMAT.order ? transform.date : undefined
  // Sign logic with no rule and no fallback says "as received" as surely as no logic at all.
  const signs =
    transform.signs && (transform.signs.rules.length > 0 || transform.signs.otherwise)
      ? transform.signs
      : undefined
  const next: DataTransform = { ...(date ? { date } : {}), ...(signs ? { signs } : {}) }
  return next.date || next.signs ? next : undefined
}

/** One line for what a transform does — the row's "Transformed" tag carries it as its tooltip. */
export function describeTransform(transform: DataTransform) {
  return [
    transform.date && `Dates as ${dateFormatLabel(transform.date)}`,
    transform.signs && describeSigns(transform.signs),
  ]
    .filter(Boolean)
    .join(' · ')
}

const SIGN_WORD: Record<ValueSign, string> = { POSITIVE: 'positive', NEGATIVE: 'negative' }

/** "Txn Type in Refund, Chargeback → negative; otherwise positive". */
function describeSigns({ rules, otherwise }: SignRules) {
  const branches = rules.map(
    ({ column, condition, value, sign }) =>
      [column, condition && conditionLabel(condition), value.join(', ')].filter(Boolean).join(' ') +
      (sign ? ` → ${SIGN_WORD[sign]}` : ''),
  )
  if (otherwise) branches.push(`otherwise ${SIGN_WORD[otherwise]}`)
  return branches.join('; ')
}

/** The default title a freshly inserted column carries until it is renamed. */
export const NEW_COLUMN_TITLE = '<Title>'

let nextColumnId = 0
export const newFieldColumn = (title = NEW_COLUMN_TITLE, defaultValue?: string): FieldColumn => ({
  id: `field-${(nextColumnId += 1)}`,
  title,
  ...(defaultValue ? { defaultValue } : {}),
  // Not set for the placeholder title: a column inserted blank has no field behind it yet,
  // and `<Title> represents "<Title>"` is not a sentence about anything.
  ...(title === NEW_COLUMN_TITLE ? {} : { source: title }),
})

/**
 * Spreadsheet labels — A…Z, then AA, AB, so a 27th column still reads sensibly.
 *
 * Derived from position, never stored: the letters are the slots, not the columns. Moving a
 * column moves it between letters; A stays leftmost whatever ends up in it.
 */
export function columnLetter(index: number) {
  let remaining = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label
    remaining = Math.floor(remaining / 26) - 1
  } while (remaining >= 0)
  return label
}

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
   * The fields the report groups by, outermost first — see GroupingStep.
   * Order is the whole point: "Gateway, then Txn Type" is a different report from "Txn Type,
   * then Gateway", so this is a list and not a set.
   *
   * **Fields, not column ids.** Ids were the first answer, chosen so that renaming a column
   * could not orphan its grouping — but they broke on the move a user actually makes: take a
   * grouped field's chip off in the organiser and put it back, and the column that returns is
   * a new column with a new id, so the grouping stayed pointing at the one that left and the
   * field came back ungrouped. A field name survives that, and survives the rename too, since
   * `fieldOf` reads a column's `source` rather than its editable title.
   *
   * Optional because it arrived after the other two; absent means no grouping.
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
 * Transactions are report-level aggregates rather than columns off a transaction row, and lead
 * what "Add important columns" selects (IMPORTANT_FIELDS below). They sit in the list in the
 * same alphabetical order as the rest so the vocabulary reads as one set, and they carry
 * samples of their own in field-samples.ts so a preview of them is not a row of dashes.
 *
 * Three more are ours as well, and each fills a kind the node's list leaves unrepresented:
 *
 * - **Bank Reference Number** — the bank's own reference for the credit, which is the thing
 *   a reconciliation is matched *on*. Every other identifier here is from the payment side.
 * - **Payment Method** — how the money was taken. The vocabulary could say which gateway
 *   carried a transaction but not which instrument, which is the cut most recon questions
 *   actually start from.
 * - **Refund Amount** — a vocabulary whose Txn Type has a REFUND value but no column saying
 *   how much came back is missing a column its own data implies.
 *
 * Same treatment as the four above: alphabetical, with samples in field-samples.ts. Between
 * them they land in three different classifications below — an identifier, a dimension
 * (GROUPABLE_FIELDS) and a measure (MEASURE_FIELDS) — so each one is wired, not just listed.
 */
export const FIELD_TAGS = [
  'Bank Reference Number',
  'Credit',
  'Debit',
  'Failure Count',
  'Fee',
  'Gateway',
  'ID',
  'Label',
  'Merchant Id',
  'Payment Entity Txn Id',
  'Payment Method',
  'Recon Id',
  'Recon Secondary Status',
  'Recon Secondary Sub Status',
  'Recon Status',
  'Recon Sub Status',
  'Reconciled At',
  'Refund Amount',
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
 * After those four come every date and every money field in the vocabulary: dates first,
 * transaction to settlement to recon, then the amounts in the same order, then the ledger
 * pieces (Credit, Debit, Fee, Tax). These are the columns a report is read and reconciled by,
 * and the ones the row menu's Data Transform has something to say about.
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
  'Txn Date',
  'Settlement Date',
  'Reconciled At',
  'Txn Amount',
  'Settlement Amount',
  'Refund Amount',
  'Credit',
  'Debit',
  'Fee',
  'Tax',
] as const satisfies readonly (typeof FIELD_TAGS)[number][]

/**
 * The fields the Grouping step offers, out of the whole vocabulary above.
 *
 * A subset because grouping is not the same question as "which columns do you want". A
 * GROUP BY needs a *dimension* — something a row can be bucketed by — and most of FIELD_TAGS
 * is not one:
 *
 * - Measures are what you aggregate, not what you group by. Grouping by Txn Amount asks for
 *   one row per distinct rupee value. That rules out Credit, Debit, Fee, Refund Amount, Tax,
 *   Txn Amount, Settlement Amount and the four report-level aggregates.
 * - Identifiers are unique per record, so grouping by one returns the ungrouped report with
 *   extra steps. That rules out ID, Recon Id, Payment Entity Txn Id, Bank Reference Number
 *   and the free-text Label.
 *
 * What survives is the nine below: two entities, the recon status pair, two dates and the
 * three categorical facts about a transaction — its currency, its type, and the instrument it
 * was taken with. Custom fields are still offered alongside these — GroupingStep appends them
 * — because nothing here can know a custom column's cardinality.
 *
 * Same `satisfies` guard as IMPORTANT_FIELDS: renaming a tag without renaming it here would
 * otherwise drop a field out of the step silently.
 */
export const GROUPABLE_FIELDS = [
  'Gateway',
  'Merchant Id',
  'Payment Method',
  'Recon Status',
  'Recon Sub Status',
  'Settlement Date',
  'Txn Currency',
  'Txn Date',
  'Txn Type',
] as const satisfies readonly (typeof FIELD_TAGS)[number][]

/**
 * How a column is rolled up once the report groups by something else.
 *
 * The words are Blend's own — `PivotAggregationType` (DataTable/types.d.ts:34-42) spells them
 * SUM / COUNT / AVERAGE / MIN / MAX — so a column organiser and a pivot table would not offer
 * the same idea under two names. MEAN and MEDIAN are left out: MEAN is AVERAGE again, and
 * MEDIAN is not a thing any of these fields is asked for.
 */
export const AGGREGATIONS = ['COUNT', 'SUM', 'AVERAGE', 'MIN', 'MAX'] as const
export type Aggregation = (typeof AGGREGATIONS)[number]

/**
 * COUNT, for everything. It is the one aggregation that is defined for every field — a count
 * of rows in the bucket asks nothing of what is in them — so it is the only honest default,
 * and it is what an unset `FieldColumn.aggregate` means.
 */
export const DEFAULT_AGGREGATION: Aggregation = 'COUNT'

export const aggregationOf = ({ aggregate }: FieldColumn) => aggregate ?? DEFAULT_AGGREGATION

/**
 * The first classification of the vocabulary by *type* rather than by role.
 *
 * `GROUPABLE_FIELDS` above is close but answers a different question — it says which fields
 * are dimensions, lumping measures and identifiers together in its complement. Deciding what
 * a field can be aggregated by needs the two apart: SUM over Txn Amount is the point of the
 * control, SUM over Recon Id is nonsense.
 *
 * Three kinds, and everything not named here is categorical:
 *
 * - **measures** — quantities. Everything applies.
 * - **rates** — Success Rate, alone. A percentage can be averaged and bounded but not summed:
 *   adding two success rates gives a number that is not a rate. One field is worth its own
 *   kind precisely because the wrong answer here (offering SUM) is the kind of thing a report
 *   would quietly ship with.
 * - **dates** — earliest and latest are real questions; a total of dates is not.
 *
 * Same `satisfies` guard the lists above carry: renaming a tag without renaming it here would
 * silently drop a field back to COUNT-only.
 */
const MEASURE_FIELDS = [
  'Credit',
  'Debit',
  'Failure Count',
  'Fee',
  'Refund Amount',
  'Settlement Amount',
  'Tax',
  'Total Amount',
  'Total Transactions',
  'Txn Amount',
] as const satisfies readonly (typeof FIELD_TAGS)[number][]

const RATE_FIELDS = ['Success Rate'] as const satisfies readonly (typeof FIELD_TAGS)[number][]

const DATE_FIELDS = [
  'Reconciled At',
  'Settlement Date',
  'Txn Date',
] as const satisfies readonly (typeof FIELD_TAGS)[number][]

/**
 * The measures that are money — MEASURE_FIELDS without its two counts. A sign means something
 * on an amount; forcing Total Transactions negative does not.
 */
const AMOUNT_FIELDS = [
  'Credit',
  'Debit',
  'Fee',
  'Refund Amount',
  'Settlement Amount',
  'Tax',
  'Total Amount',
  'Txn Amount',
] as const satisfies readonly (typeof FIELD_TAGS)[number][]

/**
 * Which half of the Data Transform a field gets: dates are reformatted, amounts are signed, and
 * nothing else is transformed at all — the row menu leaves the option out. A custom column is
 * undefined here too: nothing knows what a user's own field holds.
 */
export type TransformKind = 'DATE' | 'AMOUNT'

export function transformKindOf(field: string): TransformKind | undefined {
  const named = (fields: readonly string[]) => fields.some((name) => sameField(name, field))
  if (named(DATE_FIELDS)) return 'DATE'
  if (named(AMOUNT_FIELDS)) return 'AMOUNT'
  return undefined
}

/**
 * What the aggregation control offers for a field, in the order it lists them.
 *
 * COUNT leads every list because it is the default and the one that always applies. A custom
 * column falls through to COUNT alone — nothing here knows what a user's own field holds, and
 * offering SUM over something that turns out to be text is worse than offering less.
 */
export function aggregationsFor(field: string): readonly Aggregation[] {
  const named = (fields: readonly string[]) => fields.some((name) => sameField(name, field))
  if (named(MEASURE_FIELDS)) return AGGREGATIONS
  if (named(RATE_FIELDS)) return ['COUNT', 'AVERAGE', 'MIN', 'MAX']
  if (named(DATE_FIELDS)) return ['COUNT', 'MIN', 'MAX']
  return ['COUNT']
}

/**
 * A tag is lit when a column came from it — derived, never stored.
 *
 * Two states that could disagree is the whole failure mode here: a tag remembering it was
 * clicked after its column was deleted from the table. There is one source of truth,
 * `columns`, and the tags are a view of it.
 *
 * Matched on `source` — the name the column was created under — and not on its title, which
 * the user can edit. Renaming a column to "merchant id" used to *move* it onto the Merchant
 * Id field: the chip you actually picked went dark and one you never touched lit up, and the
 * column's origin was gone. A title is a label; `source` is the identity.
 *
 * Still case- and space-insensitive, because `source` starts life as a title and custom
 * columns reach here through the title fallback.
 */
const normalise = (value: string) => value.trim().toLowerCase()

/**
 * Whether two column titles name the same field. Exported because the Grouping step asks the
 * same question of the same free-text titles, and two copies of this rule drifting apart is
 * exactly how a chip ends up lit for a column that is not there.
 */
export const sameField = (a: string, b: string) => normalise(a) === normalise(b)

/** The field a column stands for: where it came from, or its title if it came from nowhere. */
export const fieldOf = ({ source, title }: FieldColumn) => source ?? title

export const isFieldSelected = (columns: FieldColumn[], tag: string) =>
  columns.some((column) => sameField(fieldOf(column), tag))

/**
 * Every column standing for a field — plural, because a column can be duplicated. Unpicking
 * a chip has to take all of them, or the chip would go dark with copies still in the report.
 */
export const withoutField = (columns: FieldColumn[], tag: string) =>
  columns.filter((column) => !sameField(fieldOf(column), tag))

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
  condition === null || (FILTER_CONDITIONS.find(({ id }) => id === condition)?.takesValue ?? true)

/** The two conditions that test against a set — their value control is a multi-select. */
export const isSetCondition = (condition: string | null) =>
  condition === 'in' || condition === 'not in'

/**
 * A condition as the Data Transform's sign rules word it. "in" reads as "is in" there, beside
 * "is null" and "is not null"; the id stays `in`, which is what the Filters step shows and
 * what its icon is keyed on.
 */
export const conditionLabel = (condition: string) => (condition === 'in' ? 'is in' : condition)

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
 * The groupings the report can actually perform: the user's list, minus any field the table
 * no longer carries a column for.
 *
 * Derived on every read rather than pruned on write. A column can leave the table from five
 * places (its chip, its ✕, Clear all, a rename, "Transaction level records" on Setup), and a
 * stored list kept in sync from all five is a list that eventually is not.
 *
 * Pruned for *output* only, and the distinction matters: a field with no column is still the
 * user's answer on the Grouping step and comes back the moment its column does. So anything
 * describing what the delivered file will look like reads this, and anything describing what
 * the user chose reads `groupBy` — see `isGroupedField` and `hasAnyGrouping`.
 */
export const activeGroupBy = ({ columns, groupBy }: FieldsAnswers) =>
  (groupBy ?? []).filter((field) => columns.some((column) => sameField(fieldOf(column), field)))

/** Whether the user has grouped by anything — their answer, column or no column. */
export const hasAnyGrouping = ({ groupBy }: FieldsAnswers) => (groupBy ?? []).length > 0

/** Whether the report groups by this field. Case-insensitive, like every other field match. */
export const isGroupedField = ({ groupBy }: FieldsAnswers, field: string) =>
  (groupBy ?? []).some((other) => sameField(other, field))

/** A column with a blank name would produce a nameless header in the report. */
export const isFieldsComplete = ({ columns }: FieldsAnswers) =>
  columns.length > 0 && columns.every(({ title }) => title.trim() !== '')
