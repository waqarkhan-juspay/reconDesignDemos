/**
 * The cleanup steps a file can carry, what each one asks for, and what it does to a table.
 *
 * One flat shape for every step — a kind plus a few named string fields — so the chat can
 * fill in whichever fields it understood from a sentence and the card can ask for the rest,
 * without a form per operation.
 */
import type { Row, Table } from './table'

export type OperationKind =
  | 'rename'
  | 'deleteColumn'
  | 'trim'
  | 'fill'
  | 'replace'
  | 'upper'
  | 'lower'
  | 'prefix'
  | 'suffix'
  | 'left'
  | 'right'
  | 'dropRows'
  | 'number'
  | 'date'
  | 'concat'

export type FieldKey = 'column' | 'second' | 'text' | 'with' | 'into' | 'count' | 'format'

export type Operation = { kind: OperationKind } & Partial<Record<FieldKey, string>>

/** Every column at once — offered only where doing the same thing everywhere makes sense. */
export const ALL_COLUMNS = '*'

export const DATE_FORMATS = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD MMM YYYY'] as const

type Field =
  | { key: 'column' | 'second'; label: string; type: 'column'; allowAll?: boolean }
  | { key: 'text' | 'with' | 'into'; label: string; type: 'text'; placeholder?: string; optional?: boolean }
  | { key: 'count'; label: string; type: 'number' }
  | { key: 'format'; label: string; type: 'choice'; options: readonly string[] }

export type OperationGroup = 'Columns' | 'Clean' | 'Text' | 'Format'

type Spec = {
  label: string
  group: OperationGroup
  fields: Field[]
  describe: (op: Operation) => string
}

const COLUMN: Field = { key: 'column', label: 'Column', type: 'column' }
const ANY_COLUMN: Field = { ...COLUMN, allowAll: true }

const target = (column?: string) => (column === ALL_COLUMNS ? 'every column' : column)

export const SPECS: Record<OperationKind, Spec> = {
  rename: {
    label: 'Rename column',
    group: 'Columns',
    fields: [COLUMN, { key: 'text', label: 'New name', type: 'text' }],
    describe: (op) => `Rename ${op.column} → ${op.text}`,
  },
  deleteColumn: {
    label: 'Remove column',
    group: 'Columns',
    fields: [COLUMN],
    describe: (op) => `Remove ${op.column}`,
  },
  trim: {
    label: 'Trim spaces',
    group: 'Clean',
    fields: [ANY_COLUMN],
    describe: (op) => `Trim spaces in ${target(op.column)}`,
  },
  fill: {
    label: 'Fill blanks',
    group: 'Clean',
    fields: [COLUMN, { key: 'text', label: 'Fill with', type: 'text' }],
    describe: (op) => `Fill blanks in ${op.column} with “${op.text}”`,
  },
  replace: {
    label: 'Replace value',
    group: 'Clean',
    fields: [
      COLUMN,
      { key: 'text', label: 'Find', type: 'text' },
      { key: 'with', label: 'Replace with', type: 'text', optional: true },
    ],
    describe: (op) => `Replace “${op.text}” with “${op.with ?? ''}” in ${op.column}`,
  },
  upper: {
    label: 'Uppercase',
    group: 'Text',
    fields: [ANY_COLUMN],
    describe: (op) => `Uppercase ${target(op.column)}`,
  },
  lower: {
    label: 'Lowercase',
    group: 'Text',
    fields: [ANY_COLUMN],
    describe: (op) => `Lowercase ${target(op.column)}`,
  },
  prefix: {
    label: 'Add prefix',
    group: 'Text',
    fields: [COLUMN, { key: 'text', label: 'Prefix', type: 'text' }],
    describe: (op) => `Add “${op.text}” before ${op.column}`,
  },
  suffix: {
    label: 'Add suffix',
    group: 'Text',
    fields: [COLUMN, { key: 'text', label: 'Suffix', type: 'text' }],
    describe: (op) => `Add “${op.text}” after ${op.column}`,
  },
  left: {
    label: 'First N characters',
    group: 'Text',
    fields: [COLUMN, { key: 'count', label: 'Characters', type: 'number' }],
    describe: (op) => `Keep the first ${op.count} of ${op.column}`,
  },
  right: {
    label: 'Last N characters',
    group: 'Text',
    fields: [COLUMN, { key: 'count', label: 'Characters', type: 'number' }],
    describe: (op) => `Keep the last ${op.count} of ${op.column}`,
  },
  dropRows: {
    label: 'Drop rows',
    group: 'Clean',
    fields: [
      COLUMN,
      { key: 'text', label: 'Where it is', type: 'text', placeholder: 'Empty', optional: true },
    ],
    describe: (op) =>
      op.text ? `Drop rows where ${op.column} is “${op.text}”` : `Drop rows where ${op.column} is empty`,
  },
  number: {
    label: 'Parse numbers',
    group: 'Format',
    fields: [COLUMN],
    describe: (op) => `Parse ${op.column} as a number`,
  },
  date: {
    label: 'Format dates',
    group: 'Format',
    fields: [COLUMN, { key: 'format', label: 'Format', type: 'choice', options: DATE_FORMATS }],
    describe: (op) => `Format ${op.column} as ${op.format}`,
  },
  concat: {
    label: 'Join columns',
    group: 'Columns',
    fields: [
      { key: 'column', label: 'First column', type: 'column' },
      { key: 'second', label: 'Second column', type: 'column' },
      { key: 'with', label: 'Separator', type: 'text', placeholder: 'None', optional: true },
      { key: 'into', label: 'New column', type: 'text' },
    ],
    describe: (op) => `Join ${op.column} and ${op.second} into ${op.into}`,
  },
}

export const GROUPS: OperationGroup[] = ['Columns', 'Clean', 'Text', 'Format']

export const describe = (op: Operation) => SPECS[op.kind].describe(op)

/** Whether every field the step needs is filled, and filled with something usable. */
export function isComplete(op: Operation, columns: string[]) {
  return SPECS[op.kind].fields.every((field) => {
    const value = op[field.key]?.trim() ?? ''
    if (field.type === 'column') {
      return (field.allowAll && value === ALL_COLUMNS) || columns.includes(value)
    }
    if (field.type === 'number') return Number(value) > 0
    if (field.type === 'text' && field.optional) return true
    return value !== ''
  })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Read a date in the shapes settlement and order exports use. Slashed and dashed dates are
 * read day-first — the convention of the files this tool sees — unless the first part
 * cannot be a day.
 */
function readDate(value: string): [number, number, number] | undefined {
  const text = value.trim()
  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])]
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (match) {
    const [a, b] = [Number(match[1]), Number(match[2])]
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3])
    return b > 12 ? [year, a, b] : [year, b, a]
  }
  match = text.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-,]+(\d{4})/)
  if (match) {
    const month = MONTHS.findIndex((name) => name.toLowerCase() === match![2].toLowerCase())
    if (month >= 0) return [Number(match[3]), month + 1, Number(match[1])]
  }
  return undefined
}

function formatDate(value: string, format: string) {
  const parts = readDate(value)
  if (!parts) return value
  const [year, month, day] = parts
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  switch (format) {
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${year}`
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${year}`
    case 'DD MMM YYYY':
      return `${dd} ${MONTHS[month - 1]} ${year}`
    default:
      return `${year}-${mm}-${dd}`
  }
}

/** "₹ 1,23,456.70" → "123456.70"; "(450.00)" → "-450.00". Leaves anything else alone. */
function parseNumber(value: string) {
  const text = value.trim()
  if (text === '') return text
  const negative = /^\(.*\)$/.test(text) || text.startsWith('-')
  const digits = text.replace(/[^\d.]/g, '')
  if (digits === '' || Number.isNaN(Number(digits))) return value
  return `${negative ? '-' : ''}${digits}`
}

/** What a value-level step does to one value. Undefined for steps that are not value-level. */
function mapValue(op: Operation): ((value: string) => string) | undefined {
  const text = op.text ?? ''
  const count = Number(op.count)
  switch (op.kind) {
    case 'trim':
      return (value) => value.trim().replace(/\s{2,}/g, ' ')
    case 'fill':
      return (value) => (value.trim() === '' ? text : value)
    case 'replace':
      return (value) => (text ? value.split(text).join(op.with ?? '') : value)
    case 'upper':
      return (value) => value.toUpperCase()
    case 'lower':
      return (value) => value.toLowerCase()
    case 'prefix':
      return (value) => (value === '' ? value : `${text}${value}`)
    case 'suffix':
      return (value) => (value === '' ? value : `${value}${text}`)
    case 'left':
      return (value) => value.slice(0, count)
    case 'right':
      return (value) => (count > 0 ? value.slice(-count) : value)
    case 'number':
      return parseNumber
    case 'date':
      return (value) => formatDate(value, op.format ?? DATE_FORMATS[0])
    default:
      return undefined
  }
}

const uniqueName = (name: string, taken: string[]) => {
  let candidate = name
  for (let n = 2; taken.includes(candidate); n++) candidate = `${name} (${n})`
  return candidate
}

/** Apply one step. A step whose column has since gone (renamed, removed) does nothing. */
export function apply(table: Table, op: Operation): Table {
  const { columns, rows } = table
  const column = op.column ?? ''
  const applies = column === ALL_COLUMNS || columns.includes(column)
  if (!applies) return table

  const mapper = mapValue(op)
  if (mapper) {
    const targets = column === ALL_COLUMNS ? columns : [column]
    return {
      columns,
      rows: rows.map((row) => {
        const next: Row = { ...row }
        for (const name of targets) next[name] = mapper(row[name] ?? '')
        return next
      }),
    }
  }

  switch (op.kind) {
    case 'rename': {
      const to = uniqueName(op.text?.trim() || column, columns.filter((name) => name !== column))
      return {
        columns: columns.map((name) => (name === column ? to : name)),
        rows: rows.map((row) => {
          const next: Row = {}
          for (const name of columns) next[name === column ? to : name] = row[name]
          return next
        }),
      }
    }
    case 'deleteColumn':
      return {
        columns: columns.filter((name) => name !== column),
        rows: rows.map(({ [column]: _removed, ...rest }) => rest),
      }
    case 'dropRows': {
      const match = op.text?.trim() ?? ''
      return {
        columns,
        rows: rows.filter((row) =>
          match === '' ? (row[column] ?? '').trim() !== '' : (row[column] ?? '').trim() !== match,
        ),
      }
    }
    case 'concat': {
      const second = op.second ?? ''
      if (!columns.includes(second)) return table
      const into = uniqueName(op.into?.trim() || `${column}_${second}`, columns)
      return {
        columns: [...columns, into],
        rows: rows.map((row) => ({
          ...row,
          [into]: [row[column], row[second]].filter((value) => value !== '').join(op.with ?? ''),
        })),
      }
    }
    default:
      return table
  }
}

export const applyAll = (table: Table, steps: Operation[]) => steps.reduce(apply, table)

export type Preview =
  | { kind: 'values'; pairs: [string, string][] }
  | { kind: 'note'; text: string }

/**
 * What a step would do, shown on its card before it is applied: a few values before and
 * after, or one line for steps that change shape rather than values.
 */
export function preview(table: Table, op: Operation): Preview | undefined {
  if (!isComplete(op, table.columns)) return undefined
  const after = apply(table, op)

  switch (op.kind) {
    case 'rename':
    case 'deleteColumn':
      return undefined
    case 'dropRows': {
      const dropped = table.rows.length - after.rows.length
      return {
        kind: 'note',
        text:
          dropped === 0
            ? 'No rows match — nothing would be dropped.'
            : `${dropped.toLocaleString('en-IN')} of ${table.rows.length.toLocaleString('en-IN')} rows would be dropped.`,
      }
    }
    case 'concat': {
      const into = after.columns[after.columns.length - 1]
      return {
        kind: 'values',
        pairs: after.rows
          .slice(0, 3)
          .map((row) => [`${row[op.column!]} + ${row[op.second!]}`, row[into]]),
      }
    }
  }

  const column = op.column === ALL_COLUMNS ? undefined : op.column
  const pairs: [string, string][] = []
  for (let i = 0; i < table.rows.length && pairs.length < 3; i++) {
    const names = column ? [column] : table.columns
    for (const name of names) {
      const before = table.rows[i][name] ?? ''
      const next = after.rows[i][name] ?? ''
      if (before !== next) {
        pairs.push([before, next])
        break
      }
    }
  }
  return pairs.length > 0
    ? { kind: 'values', pairs }
    : { kind: 'note', text: 'Nothing in the file would change.' }
}
