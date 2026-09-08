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

/** A column with a blank name would produce a nameless header in the report. */
export const isFieldsComplete = ({ columns }: FieldsAnswers) =>
  columns.length > 0 && columns.every(({ title }) => title.trim() !== '')
