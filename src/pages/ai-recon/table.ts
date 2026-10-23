/**
 * Reading an uploaded file into a table: decode the bytes, find the delimiter, split on it.
 * All of it runs in the browser on the file that was dropped — nothing is sent anywhere.
 */

export type Delimiter = ',' | ';' | '|' | '\t'
export type Encoding = 'utf-8' | 'utf-16le' | 'iso-8859-1' | 'windows-1252'
export type Quote = '"' | "'" | ''

export type ParseOptions = {
  delimiter: Delimiter
  encoding: Encoding
  quote: Quote
  /** Banner lines above the header row, and summary lines under the data. */
  skipTop: number
  skipBottom: number
}

export type Row = Record<string, string>
export type Table = { columns: string[]; rows: Row[] }

/** What a file must be to be read here. CSV only — nothing in the app reads a spreadsheet. */
export const ACCEPTED_TYPES = ['.csv']
export const MAX_FILE_BYTES = 25 * 1024 * 1024
/** The limits in words, for the upload box's error and the assistant's answers. */
export const LIMITS_TEXT = `CSV, up to ${MAX_FILE_BYTES / 1024 / 1024} MB`

type Choice<T> = { value: T; label: string }

export const DELIMITERS: Choice<Delimiter>[] = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '|', label: 'Pipe (|)' },
  { value: '\t', label: 'Tab' },
]

export const ENCODINGS: Choice<Encoding>[] = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'utf-16le', label: 'UTF-16' },
  { value: 'iso-8859-1', label: 'ISO-8859-1' },
  { value: 'windows-1252', label: 'Windows-1252' },
]

export const QUOTES: Choice<Quote>[] = [
  { value: '"', label: 'Double (")' },
  { value: "'", label: "Single (')" },
  { value: '', label: 'None' },
]

export const labelOf = <T>(choices: Choice<T>[], value: T) =>
  choices.find((choice) => choice.value === value)?.label ?? String(value)

export const formatCount = (n: number) => n.toLocaleString('en-IN')

/** "1,203 rows", "1 column". */
export const count = (n: number, noun: string) => `${formatCount(n)} ${noun}${n === 1 ? '' : 's'}`

/** `name`, or `name (2)`, `name (3)`… — the first not already taken. */
export function uniqueName(name: string, taken: string[]) {
  let candidate = name
  for (let n = 2; taken.includes(candidate); n++) candidate = `${name} (${n})`
  return candidate
}

/**
 * The few most recent results per file — the settings in use plus a draft being tried —
 * without holding every variant of a 25 MB file. Keyed weakly on the bytes, so removing a
 * file frees all of it.
 */
const CACHE_SIZE = 3
function cached<V>(store: WeakMap<ArrayBuffer, Map<string, V>>, bytes: ArrayBuffer, key: string, make: () => V) {
  let entries = store.get(bytes)
  if (!entries) store.set(bytes, (entries = new Map()))
  const hit = entries.get(key)
  if (hit !== undefined) {
    // Most recent last, so the oldest is the one that goes.
    entries.delete(key)
    entries.set(key, hit)
    return hit
  }
  const value = make()
  entries.set(key, value)
  if (entries.size > CACHE_SIZE) entries.delete(entries.keys().next().value!)
  return value
}

const texts = new WeakMap<ArrayBuffer, Map<string, string>>()
const splits = new WeakMap<ArrayBuffer, Map<string, string[][]>>()
const tables = new WeakMap<ArrayBuffer, Map<string, Table>>()

/** TextDecoder drops a byte-order mark itself, so the text starts at the first character. */
const decoded = (bytes: ArrayBuffer, encoding: Encoding) =>
  cached(texts, bytes, encoding, () => new TextDecoder(encoding).decode(bytes))

/** Split text into records, honouring quoted fields — a quoted delimiter or newline is data. */
function split(text: string, delimiter: Delimiter, quote: Quote) {
  const out: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === quote && text[i + 1] === quote) {
        field += quote
        i++
      } else if (char === quote) {
        quoted = false
      } else {
        field += char
      }
    } else if (quote && char === quote && field === '') {
      quoted = true
    } else if (char === delimiter) {
      record.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      record.push(field)
      out.push(record)
      record = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field)
    out.push(record)
  }
  // Blank lines are not rows.
  return out.filter((fields) => fields.some((value) => value.trim() !== ''))
}

/**
 * The file's records under one way of splitting it. Skipping lines does not change these,
 * so trying a different skip costs nothing.
 */
const recordsOf = (bytes: ArrayBuffer, { encoding, delimiter, quote }: ParseOptions) =>
  cached(splits, bytes, `${encoding}|${delimiter}|${quote}`, () =>
    split(decoded(bytes, encoding), delimiter, quote),
  )

/** The records the table is made of: banner and summary lines left out. */
const keptOf = (all: string[][], { skipTop, skipBottom }: ParseOptions) =>
  all.slice(skipTop, all.length - skipBottom)

/** Header names, made unique and never empty — a column needs a name to be picked by. */
function headerNames(header: string[]) {
  const names: string[] = []
  header.forEach((raw, index) => names.push(uniqueName(raw.trim() || `Column ${index + 1}`, names)))
  return names
}

export const readTable = (bytes: ArrayBuffer, options: ParseOptions) =>
  cached(tables, bytes, JSON.stringify(options), () => {
    const [header = [], ...data] = keptOf(recordsOf(bytes, options), options)
    const columns = headerNames(header)
    return {
      columns,
      rows: data.map((fields) => {
        const row: Row = {}
        columns.forEach((column, index) => (row[column] = fields[index] ?? ''))
        return row
      }),
    }
  })

const shape = (rows: number, columns: number) => `${count(rows, 'row')} · ${count(columns, 'column')}`

/** "1,203 rows · 3 columns" */
export const shapeOf = ({ rows, columns }: Table) => shape(rows.length, columns.length)

/** The shape a file would read as under these settings — counted, without building rows. */
export function shapeWith(bytes: ArrayBuffer, options: ParseOptions) {
  const kept = keptOf(recordsOf(bytes, options), options)
  return shape(Math.max(0, kept.length - 1), kept[0]?.length ?? 0)
}

/** How many times each value occurs. */
function tally(values: number[]) {
  const counts = new Map<number, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

/** Lines looked at to decide how a file reads. */
const SAMPLE_LINES = 25

/**
 * The delimiter that splits the most lines into the same, widest shape. Taking the most
 * common field count rather than the first line's keeps a banner line above the header
 * from deciding it.
 */
function delimiterScore(lines: string[], delimiter: Delimiter) {
  let best = 0
  tally(lines.map((line) => line.split(delimiter).length)).forEach((lineCount, fields) => {
    if (fields > 1) best = Math.max(best, lineCount * fields)
  })
  return best
}

/** Lines that are not the table, at most this many at either end. */
const MAX_SKIP = 5

/**
 * How the file most likely reads. A UTF-16 byte-order mark says so outright; else UTF-8.
 *
 * Exports often wrap the table in a banner ("Settlement Report", a date range) and a total
 * line. The header is the first record as wide as most of the file; a trailing record with
 * at most one value filled in is a summary, not data.
 *
 * It decodes and splits through the same caches the table is read from, so reading the
 * file afterwards repeats neither.
 */
export function detect(bytes: ArrayBuffer): ParseOptions {
  const [first, second] = new Uint8Array(bytes.slice(0, 2))
  const encoding: Encoding = first === 0xff && second === 0xfe ? 'utf-16le' : 'utf-8'
  const lines = decoded(bytes, encoding)
    .slice(0, 64 * 1024)
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, SAMPLE_LINES)
  const delimiter = DELIMITERS.map(({ value }) => value).reduce((best, candidate) =>
    delimiterScore(lines, candidate) > delimiterScore(lines, best) ? candidate : best,
  )

  const options: ParseOptions = { delimiter, encoding, quote: '"', skipTop: 0, skipBottom: 0 }
  const all = recordsOf(bytes, options)
  const head = all.slice(0, SAMPLE_LINES)
  const width = [...tally(head.map((row) => row.length))].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
  const skipTop = Math.min(MAX_SKIP, Math.max(0, head.findIndex((row) => row.length === width)))
  let skipBottom = 0
  while (skipBottom < MAX_SKIP && all.length - skipBottom > skipTop + 2) {
    const row = all[all.length - 1 - skipBottom]
    const filled = row.filter((value) => value.trim() !== '').length
    if (row.length === width && filled > 1) break
    skipBottom++
  }
  return { ...options, skipTop, skipBottom }
}
