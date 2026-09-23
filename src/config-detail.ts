/**
 * What a saved report config looks like when you open it up.
 *
 * The Configurator's table carries eight facts about a row; the detail sheet shows eleven,
 * plus a preview of the file the config would produce. The missing three — the format, the
 * data window, the fields — are *derived here* rather than stored on the row, for one
 * reason: a row and its detail that are two pieces of data can disagree, and a sheet that
 * disagrees with the row you clicked is worse than a sheet with less in it.
 *
 * So everything below is a pure function of the row. Open the same row twice and you get the
 * same sheet; rename a config and its file-name template follows; change its channel and the
 * detail changes with it. Nothing to keep in step.
 *
 * The vocabulary is the create flow's own (REPORT_FORMATS, FIELD_TAGS), so a field named
 * here is a field the flow can actually produce.
 */

import { FIELD_TAGS } from './pages/create-report-config/answers'
import { REPORT_FORMATS, type ReportFormat } from './report-config'

/**
 * The columns of the row this module needs. Declared structurally rather than imported from
 * the Configurator, which is what stops the two files importing each other — the page owns
 * its row type, and this module states its requirements of it.
 */
export type ConfigRowFacts = {
  id: string
  configurationName: string
  categorySource: string
  sourceType: string
  paymentEntity: string
  frequency: string
  channel: string
  createdDate: string
}

/**
 * A small deterministic number from the row's id, used wherever the sheet needs to vary
 * between rows and the row itself does not say how.
 *
 * Deterministic is the whole point — `Math.random` here would mean the sheet said something
 * different every time you opened it, which reads as a bug long before anyone works out it
 * was decoration.
 */
const seedOf = ({ id }: ConfigRowFacts) => {
  let seed = 0
  for (const character of id) seed = (seed * 31 + character.charCodeAt(0)) % 9973
  return seed
}

/**
 * The five fields every report carries, in the order the design's preview draws them
 * (the sample output at node 4410:25166 is Merchant Id → Payment Entity Txn Id → Gateway →
 * Txn Amount → Txn Type).
 */
const CORE_FIELDS = [
  'Merchant Id',
  'Payment Entity Txn Id',
  'Gateway',
  'Txn Amount',
  'Txn Type',
] as const

/**
 * What a category adds on top of the core five. A Reconciliation report is about whether two
 * records agree, so it carries the recon columns; a File Summary is about what a file said,
 * so it carries the settlement ones. Both are drawn from FIELD_TAGS, so the sheet can never
 * name a field the Fields step does not offer.
 */
const CATEGORY_FIELDS: Record<string, readonly string[]> = {
  Reconciliation: ['Recon Status', 'Recon Id', 'Reconciled At'],
  'File Summary': ['Settlement Amount', 'Settlement Date', 'Settlement Currency'],
}

/**
 * The one custom column a saved config may carry — the kind "Add custom column" makes on the
 * Fields step. Named for what a team would actually add by hand: their own reference for the
 * record, which no field in the vocabulary holds.
 */
const CUSTOM_FIELD = 'Internal Ref'

/**
 * The custom columns a config carries: about one in three, by seed, so the sheet shows the
 * orange "[Custom]" chip on some configs and not as decoration on all of them.
 */
export const customFieldsFor = (row: ConfigRowFacts): string[] =>
  seedOf(row) % 3 === 0 ? [CUSTOM_FIELD] : []

/**
 * The report's fields: the core five, plus up to two of its category's, chosen by seed, then
 * any custom column last — where the Fields step puts a column it has just added.
 *
 * A range rather than a fixed count so the sheet's "Columns · N" is not the same number on
 * every row — with ten rows all reading 5 the count stops being read at all. Never more than
 * eight, because past that the preview table stops being a preview.
 */
export const fieldsFor = (row: ConfigRowFacts): string[] => {
  const extra = CATEGORY_FIELDS[row.categorySource] ?? []
  const count = seedOf(row) % 3 // 0, 1 or 2 extra columns
  const chosen = [...CORE_FIELDS, ...extra.slice(0, count)]
  // Belt and braces: if a category list is ever edited to hold a name FIELD_TAGS does not,
  // the field is dropped rather than shown as a column the Fields step cannot produce.
  return [...chosen.filter((field) => FIELD_TAGS.includes(field)), ...customFieldsFor(row)]
}

/**
 * Raw or Aggregated — the create flow's third question (REPORT_FORMATS).
 *
 * Tied to the source type rather than the seed, because it is not arbitrary: an Overall or a
 * Chargeback report is read as a summary, where Matched/Mismatched and the transaction-level
 * files are read row by row. So the format follows from what the report is *of*.
 */
const AGGREGATED_SOURCES = ['Overall', 'Chargeback']

export const formatFor = (row: ConfigRowFacts): ReportFormat =>
  AGGREGATED_SOURCES.includes(row.sourceType) ? 'Aggregated' : 'Raw'

/**
 * The fields a config groups by, in level order — empty unless it is a grouped report.
 *
 * Gateway first, because it is in every config's core fields and is how a settlement team
 * reads a summary; Txn Type as a second level on about half, by seed. Both are core fields,
 * so a grouped field is always one of the config's own columns.
 */
export const groupByFor = (row: ConfigRowFacts): string[] =>
  formatFor(row) !== 'Aggregated' ? [] : seedOf(row) % 2 ? ['Gateway', 'Txn Type'] : ['Gateway']

/**
 * The same answer in the words the user chose it by.
 *
 * `formatFor` returns the id — 'Raw' / 'Aggregated' — which is what the rest of the app
 * switches on, and which meant the sheet used to show a row reading "Report Format:
 * Aggregated". Nobody picked "Aggregated": the create flow's third question offers
 * "Transaction level records" and "Grouped records" (REPORT_FORMATS), so that is what the
 * detail says back. Read off REPORT_FORMATS rather than copied, so the two cannot drift.
 */
export const detailLevelFor = (row: ConfigRowFacts) => {
  const format = formatFor(row)
  return REPORT_FORMATS.find((option) => option.id === format)?.title ?? format
}

/**
 * The window of data the run covers, read out of the schedule.
 *
 * "Daily · 09:00 IST" runs at 09:00 and covers the day up to then, so the window is
 * 00:00–09:00. A real-time config has no window — it is a stream — and says so rather than
 * inventing one.
 */
export const coverageFor = ({ frequency }: ConfigRowFacts) => {
  if (frequency.startsWith('Real-time')) return 'Continuous'
  const time = /(\d{2}:\d{2})/.exec(frequency)?.[1]
  return time ? `00:00 to ${time} (IST)` : '—'
}

/**
 * The filename the delivered file carries.
 *
 * `{date:%d-%m-%Y}` is the create flow's own placeholder syntax, left unexpanded on purpose:
 * this is the template, not a filename, and showing it resolved would say the config always
 * produces the same file.
 */
export const fileNameFor = ({ configurationName }: ConfigRowFacts) => {
  const slug = configurationName
    .replace(/\.[a-z0-9]+$/i, '') // a name that is already a filename keeps its stem only
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${slug}_{date:%d-%m-%Y}`
}

/**
 * The filters the config applies, as one line.
 *
 * Most configs have none — that is what the design's "-" says — so an empty string is the
 * common answer and the sheet renders it as a dash. The ones that do have a filter get one
 * that follows from the row, so it reads as this config's rule rather than as sample text.
 */
export const filtersFor = (row: ConfigRowFacts) => {
  if (row.sourceType === 'Mismatched') return 'Recon Status is Mismatched'
  if (row.sourceType === 'Matched') return 'Recon Status is Matched'
  if (row.sourceType === 'Chargeback') return 'Txn Type is CHARGEBACK'
  return ''
}

/**
 * Three rows of plausible output, one per field.
 *
 * Three because the design draws three, and because it is the smallest number that shows a
 * column *varying* — two rows of 1100.00 could be a rendering bug, three reads as data.
 */
const SAMPLE_ROW_COUNT = 3

/** Per-field sample values. Anything not named here falls through to a neutral placeholder. */
const sampleValue = (field: string, row: ConfigRowFacts, index: number): string => {
  const seed = seedOf(row)
  switch (field) {
    case 'Merchant Id':
      // Constant down the column on purpose: one config belongs to one merchant, so a
      // varying merchant id here would misrepresent what the file contains.
      return 'DemoMerchant'
    case 'Payment Entity Txn Id':
      return String(19933239749 + seed * 1000 + index * 327)
    case 'Gateway':
      return row.paymentEntity.toUpperCase()
    case 'Txn Amount':
      return (1100 + seed % 400 + index * 50).toFixed(6)
    case 'Txn Type':
      return ['ORDER', 'ORDER', 'REFUND'][index] ?? 'ORDER'
    case 'Recon Status':
      return row.sourceType === 'Mismatched' ? 'MISMATCHED' : 'MATCHED'
    case 'Recon Id':
      return `RCN${String(seed + index).padStart(7, '0')}`
    case 'Reconciled At':
      return `2026-09-0${(index % 9) + 1} 11:0${index}:00`
    case 'Settlement Amount':
      return (1080 + seed % 400 + index * 50).toFixed(6)
    case 'Settlement Date':
      return `2026-09-0${(index % 9) + 1}`
    case 'Settlement Currency':
      return 'INR'
    case CUSTOM_FIELD:
      return `OPS-${String(4100 + (seed % 800) + index * 7)}`
    default:
      return '—'
  }
}

export type SampleRow = { id: string } & Record<string, string>

export const sampleRowsFor = (row: ConfigRowFacts): SampleRow[] => {
  const fields = fieldsFor(row)
  return Array.from({ length: SAMPLE_ROW_COUNT }, (_, index) => ({
    id: `${row.id}-sample-${index}`,
    ...Object.fromEntries(fields.map((field) => [field, sampleValue(field, row, index)])),
  }))
}

/**
 * The single-line facts the sheet shows, in the order it shows it.
 *
 * A flat list rather than an object with named keys, because the sheet's job is to render
 * label/value rows in order — and a list is the thing that says "in order".
 *
 * The list-valued facts are deliberately not here. Metrics, Filters and the column order are
 * sets, and every way of flattening a set into one string loses something the sheet then has
 * to guess back: you cannot count a comma-joined sentence, and you cannot see where one
 * column name ends and the next begins. The sheet reads those from `fieldsFor`, `filtersFor`
 * and `fileNameFor` directly and draws them as chips.
 */
export type DetailRow = { key: string; value: string }

export const detailRowsFor = (row: ConfigRowFacts): DetailRow[] => [
  { key: 'Configuration Name', value: row.configurationName },
  { key: 'Category', value: row.categorySource },
  { key: 'Report Type', value: row.sourceType },
  // Named for the question rather than for the field: this is the create flow's "How much
  // detail do you need?", and its two answers are the ones the flow offers by name.
  { key: 'Detail Level', value: detailLevelFor(row) },
  { key: 'Payment Entity', value: row.paymentEntity },
  { key: 'Schedule', value: row.frequency },
  { key: 'Data Coverage', value: coverageFor(row) },
  { key: 'Channel', value: row.channel },
  // Last rather than up in the header where the design puts it. It is a fact about the
  // record, not about what the report does, so it reads as the footnote to the list — and
  // putting it here keeps the header to one thing, the name.
  { key: 'Created On', value: row.createdDate },
]

/**
 * The config's last runs — what the History action opens.
 *
 * Derived like everything else here, so a row's history is stable across opens and follows
 * its schedule: a Daily config's runs are a day apart, a Weekly one's a week. The newest run
 * leads, which is the order a history is read in.
 *
 * Five, because that is enough to show a pattern (and one failure) without turning a
 * reference sheet into a log viewer. The failure lands on a fixed offset from the seed rather
 * than at random, so a given config always has the same run go wrong.
 */
const RUN_COUNT = 5

/**
 * The day this demo is "today".
 *
 * Fixed rather than `new Date()`, because everything derived from it — a run history, a
 * download's default date range — would otherwise shift every day the demo is opened, and a
 * screenshot taken on Tuesday would stop matching the app on Wednesday.
 */
export const DEMO_TODAY = new Date('2026-09-17T00:00:00Z')

export type RunRow = {
  id: string
  /** The file that run produced — the config's own template, resolved against its date. */
  fileName: string
  /** "17 Sep 2026". */
  generatedOn: string
  /** "03:36 PM IST" — when the file landed, not when the window closed. */
  at: string
  status: string
  records: string
}

/** Days between runs, read out of the same schedule string the Schedule row shows. */
const intervalDaysFor = ({ frequency }: ConfigRowFacts) => {
  if (frequency.startsWith('Monthly')) return 30
  if (frequency.startsWith('Weekly')) return 7
  if (frequency.startsWith('Quarterly')) return 90
  return 1 // Daily and Real-time both produce a file a day
}

/**
 * The clock time a run's file landed, as "03:36 PM IST".
 *
 * Read off the config's own schedule — "Daily at 15:00 (IST)" — so a delivery is stamped at
 * the hour the row above it promises, plus a few minutes: a run *starts* on the schedule and
 * the file exists when it finishes. The lag is seeded rather than random, for the same reason
 * everything else here is.
 */
const MAX_RUN_MINUTES = 14

const deliveredAt = (row: ConfigRowFacts, index: number) => {
  // A Real-time config names no hour, so one is picked for it — a continuous stream still
  // drops a file at some point in the day, and "—" in a list of timestamps reads as missing
  // data rather than as "not applicable".
  const [hours, minutes] = (/(\d{2}):(\d{2})/.exec(row.frequency) ?? ['', '09', '00']).slice(1)
  const at = new Date(DEMO_TODAY)
  at.setUTCHours(Number(hours), Number(minutes) + ((seedOf(row) + index * 7) % MAX_RUN_MINUTES))
  return `${at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })} IST`
    .toUpperCase()
}

export const runsFor = (row: ConfigRowFacts): RunRow[] => {
  const seed = seedOf(row)
  const step = intervalDaysFor(row)
  // Anchored on DEMO_TODAY rather than on `new Date()`: a demo whose history silently shifts
  // every day it is opened is a demo nobody can screenshot.
  const anchor = new Date(DEMO_TODAY)
  const failedAt = seed % RUN_COUNT

  return Array.from({ length: RUN_COUNT }, (_, index) => {
    const at = new Date(anchor)
    at.setUTCDate(at.getUTCDate() - index * step)
    const failed = index === failedAt && index !== 0
    const stamp = at
      .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, '-')
    return {
      id: `${row.id}-run-${index}`,
      // The template the detail shows, resolved — which is the one way to check that the
      // "File name template" row above is telling the truth about what gets delivered.
      fileName: `${fileNameFor(row).replace('{date:%d-%m-%Y}', stamp)}.csv`,
      generatedOn: at.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      at: deliveredAt(row, index),
      status: failed ? 'Failed' : 'Delivered',
      // A failed run delivered nothing, and saying "0" is the honest version of that.
      records: failed ? '0' : String(1200 + ((seed + index * 137) % 8800)),
    }
  })
}
