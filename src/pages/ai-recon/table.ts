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

export const decode = (bytes: ArrayBuffer, encoding: Encoding) =>
  new TextDecoder(encoding).decode(bytes)

/**
 * The delimiter that splits the most lines into the same, widest shape. Taking the most
 * common field count rather than the first line's keeps a banner line above the header
 * from deciding it.
 */
function delimiterScore(lines: string[], delimiter: Delimiter) {
  const counts = new Map<number, number>()
  for (const line of lines) {
    const fields = line.split(delimiter).length
    counts.set(fields, (counts.get(fields) ?? 0) + 1)
  }
  let best = 0
  counts.forEach((lineCount, fields) => {
    if (fields > 1) best = Math.max(best, lineCount * fields)
  })
  return best
}

/** The field count most of these records share — the table's real width. */
function modalWidth(rows: string[][]) {
  const counts = new Map<number, number>()
  for (const row of rows) counts.set(row.length, (counts.get(row.length) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
}

/** Lines that are not the table, at most this many at either end. */
const MAX_SKIP = 5

/**
 * How the file most likely reads. A UTF-16 byte-order mark says so outright; else UTF-8.
 *
 * Exports often wrap the table in a banner ("Settlement Report", a date range) and a total
 * line. The header is the first record as wide as most of the file; a trailing record with
 * at most one value filled in is a summary, not data.
 */
export function detect(bytes: ArrayBuffer): ParseOptions {
  const [first, second] = new Uint8Array(bytes.slice(0, 2))
  const encoding: Encoding = first === 0xff && second === 0xfe ? 'utf-16le' : 'utf-8'
  const text = decode(bytes, encoding)
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 25)
  const delimiter = DELIMITERS.map(({ value }) => value).reduce((best, candidate) =>
    delimiterScore(lines, candidate) > delimiterScore(lines, best) ? candidate : best,
  )

  const all = records(text, delimiter, '"')
  const width = modalWidth(all.slice(0, 25))
  const skipTop = Math.min(MAX_SKIP, Math.max(0, all.slice(0, 25).findIndex((row) => row.length === width)))
  let skipBottom = 0
  while (skipBottom < MAX_SKIP && all.length - skipBottom > skipTop + 2) {
    const row = all[all.length - 1 - skipBottom]
    const filled = row.filter((value) => value.trim() !== '').length
    if (row.length === width && filled > 1) break
    skipBottom++
  }
  return { delimiter, encoding, quote: '"', skipTop, skipBottom }
}

/** Split text into records, honouring quoted fields — a quoted delimiter or newline is data. */
function records(text: string, delimiter: Delimiter, quote: Quote) {
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

/** Header names, made unique and never empty — a column needs a name to be picked by. */
function headerNames(header: string[]) {
  const seen = new Map<string, number>()
  return header.map((raw, index) => {
    const name = raw.trim() || `Column ${index + 1}`
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    return count === 1 ? name : `${name} (${count})`
  })
}

export function parse(text: string, options: ParseOptions): Table {
  const all = records(text.replace(/^﻿/, ''), options.delimiter, options.quote)
  const kept = all.slice(options.skipTop, all.length - options.skipBottom)
  const [header = [], ...data] = kept
  const columns = headerNames(header)
  return {
    columns,
    rows: data.map((fields) =>
      Object.fromEntries(columns.map((column, index) => [column, fields[index] ?? ''])),
    ),
  }
}

export const readTable = (bytes: ArrayBuffer, options: ParseOptions) =>
  parse(decode(bytes, options.encoding), options)

const count = (n: number, noun: string) =>
  `${n.toLocaleString('en-IN')} ${noun}${n === 1 ? '' : 's'}`

/** "1,203 rows · 3 columns" */
export const shapeOf = ({ rows, columns }: Table) =>
  `${count(rows.length, 'row')} · ${count(columns.length, 'column')}`
