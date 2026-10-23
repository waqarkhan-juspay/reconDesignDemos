/**
 * The AI Recon assistant's script. There is no model behind it — every reply is picked
 * from what the workspace holds and a few patterns in what was typed, so the conversation
 * demos the flow without a backend.
 *
 * What it understands, it answers with a card already filled in (cards.tsx) rather than a
 * paragraph: the sentence chooses the step, the card shows exactly what will happen and
 * lets anything it got wrong be fixed by hand before it is applied.
 */
import { ALL_COLUMNS, type Operation } from './operations'
import type { Delimiter, Encoding, ParseOptions, Quote, Row } from './table'

export type ChatRole = 'assistant' | 'user'

export type CardState = 'open' | 'applied' | 'cancelled'

/** Interactive pieces the assistant puts in the conversation. `fileId` is the upload's id. */
export type Card =
  | { id: string; type: 'step'; fileId?: string; op: Operation; state: CardState }
  /** `summary` is the one-line "how I read it" shown on upload, which opens into the form. */
  | { id: string; type: 'parse'; fileId: string; options: ParseOptions; state: CardState | 'summary' }
  | { id: string; type: 'menu'; fileId?: string }

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  cards?: Card[]
}

export type FileRole = 'source' | 'target'

/** One uploaded file as the assistant sees it, cleanup steps applied. */
export type FileContext = {
  id: string
  role: FileRole
  name: string
  columns: string[]
  /** The first rows, for suggestions that depend on what the values look like. */
  sample?: Row[]
}

export type ReconResult = {
  matched: number
  amountMismatch: number
  missingInTarget: number
  missingInSource: number
}

/** A fixed outcome, so a demo run tells the same story every time. */
export const DEMO_RESULT: ReconResult = {
  matched: 1184,
  amountMismatch: 12,
  missingInTarget: 7,
  missingInSource: 3,
}

/** How long a run, and a reply, pretend to take. Long enough to read as work being done. */
export const RUN_MS = 1400
export const REPLY_MS = 700

let nextId = 0
export const messageId = () => `m${++nextId}`

export const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  text: 'Add two files and I’ll match them.',
}

const format = (count: number) => count.toLocaleString('en-IN')

const exceptionCount = ({ amountMismatch, missingInTarget, missingInSource }: ReconResult) =>
  amountMismatch + missingInTarget + missingInSource

/** What the assistant says as a run lands. The cards beside it carry the numbers. */
export const announce = (result: ReconResult) =>
  `Done — ${exceptionCount(result)} rows need a look. Ask me about any of them.`

export function summarise(result: ReconResult) {
  const { matched, amountMismatch, missingInTarget, missingInSource } = result
  return (
    `${format(matched)} rows matched and ${exceptionCount(result)} need a look: ` +
    `${amountMismatch} differ on amount, ${missingInTarget} are missing from the target and ` +
    `${missingInSource} are missing from the source.`
  )
}

/** What reading a file left out, said once so it is never a surprise. */
function skipped(name: string, { skipTop, skipBottom }: ParseOptions) {
  const lines = (count: number, what: string) => `${count} ${what}${count > 1 ? 's' : ''}`
  const parts = [
    ...(skipTop ? [`${lines(skipTop, 'line')} above the header`] : []),
    ...(skipBottom ? [`${lines(skipBottom, 'summary line')} at the end`] : []),
  ]
  return parts.length > 0 ? `In ${name} I skipped ${parts.join(' and ')}.` : undefined
}

/** The question asked the moment files are read — the point of the upload step. */
export function uploadPrompt(read: (FileContext & { parse: ParseOptions })[], all: FileContext[]) {
  const named = read.map((file) => `${file.name} as the ${file.role}`).join(' and ')
  const notes = read.map((file) => skipped(file.name, file.parse)).filter(Boolean)
  const ask =
    all.length < 2
      ? 'Anything to clean up in it while you add the other file?'
      : 'Anything to clean up before I match them?'
  return [`Read ${named}.`, ...notes, ask].join(' ')
}

export type Intent =
  | { type: 'step'; fileId?: string; op: Operation }
  | { type: 'parse'; fileId?: string; patch: Partial<ParseOptions> }
  | { type: 'menu'; fileId?: string }
  | { type: 'undo' }
  | { type: 'done' }
  | { type: 'run' }
  | { type: 'reply'; text: string }

/** Case, spaces, underscores and dashes don't make a column name different. */
const squash = (text: string) => text.toLowerCase().replace(/[\s_\-.]+/g, '')

type Mention = { fileId: string; column: string; at: number }

/**
 * The columns a sentence names, in the order it names them. Longer names win where two
 * overlap, so "settled amount" is not also read as "amount".
 */
function mentions(text: string, files: FileContext[]) {
  const said = squash(text)
  const hits: (Mention & { length: number })[] = []
  for (const file of files) {
    for (const column of file.columns) {
      const name = squash(column)
      if (name.length < 2) continue
      for (let at = said.indexOf(name); at !== -1; at = said.indexOf(name, at + 1)) {
        hits.push({ fileId: file.id, column, at, length: name.length })
      }
    }
  }
  const taken: Mention[] = []
  const used: [number, number][] = []
  for (const hit of hits.sort((a, b) => b.length - a.length)) {
    const end = hit.at + hit.length
    if (used.some(([start, stop]) => hit.at < stop && end > start)) continue
    used.push([hit.at, end])
    taken.push(hit)
  }
  return taken.sort((a, b) => a.at - b.at)
}

/** A phrase to the column it most likely means, in the given file or any. */
function resolveColumn(phrase: string, files: FileContext[], fileId?: string) {
  const wanted = squash(phrase)
  const pool = files.filter((file) => !fileId || file.id === fileId)
  for (const file of pool) {
    const exact = file.columns.find((column) => squash(column) === wanted)
    if (exact) return { fileId: file.id, column: exact }
  }
  for (const file of pool) {
    const partial = file.columns.find(
      (column) => squash(column).includes(wanted) || wanted.includes(squash(column)),
    )
    if (partial) return { fileId: file.id, column: partial }
  }
  return undefined
}

/** Which file a sentence is about: named outright, implied by its columns, or the only one. */
function pickFile(lower: string, files: FileContext[], found: Mention[]) {
  const byRole = (role: FileRole) => files.find((file) => file.role === role)
  if (/\bsource\b/.test(lower)) return byRole('source')
  if (/\btarget\b/.test(lower)) return byRole('target')
  // A name short enough to turn up inside ordinary words says nothing.
  const named = files.find((file) => {
    const stem = squash(file.name.replace(/\.\w+$/, ''))
    return stem.length >= 4 && squash(lower).includes(stem)
  })
  if (named) return named
  const owners = new Set(found.map((mention) => mention.fileId))
  if (owners.size === 1) {
    const [only] = owners
    const column = found[0].column
    // A column both files have says nothing about which one is meant.
    if (files.filter((file) => file.columns.includes(column)).length === 1) {
      return files.find((file) => file.id === only)
    }
  }
  return files.length === 1 ? files[0] : undefined
}

/** The first column in a file whose name looks like what a step usually wants. */
const guessColumn = (files: FileContext[], fileId: string | undefined, pattern: RegExp) =>
  files
    .filter((file) => !fileId || file.id === fileId)
    .flatMap((file) => file.columns)
    .find((column) => pattern.test(column))

const DATE_COLUMN = /date|time|_on\b|\son\b|day/i
const AMOUNT_COLUMN = /amount|amt|value|total|price|fee|settled/i

/** Something quoted in the sentence, if anything was. */
const quoted = (text: string) => text.match(/["'“‘]([^"'”’]+)["'”’]/)?.[1]

const SEPARATORS: Record<string, string> = {
  space: ' ',
  dash: '-',
  hyphen: '-',
  underscore: '_',
  slash: '/',
  comma: ',',
  pipe: '|',
}

const DELIMITER_WORDS: Record<string, Delimiter> = {
  comma: ',',
  semicolon: ';',
  'semi-colon': ';',
  pipe: '|',
  tab: '\t',
}

function dateFormatIn(lower: string) {
  if (/dd\s*\/\s*mm\s*\/\s*yyyy|day first/.test(lower)) return 'DD/MM/YYYY'
  if (/mm\s*\/\s*dd\s*\/\s*yyyy|month first|us format/.test(lower)) return 'MM/DD/YYYY'
  if (/dd\s*mmm|\d{1,2}\s+[a-z]{3}\s+\d{4}|month name/.test(lower)) return 'DD MMM YYYY'
  if (/yyyy-mm-dd|iso/.test(lower)) return 'YYYY-MM-DD'
  return undefined
}

/** Questions about the product, answered in words rather than with a card. */
function answer(lower: string, files: FileContext[], result?: ReconResult) {
  if (/\b(what|which)\b.*\b(formats?|file types?|files can)\b/.test(lower)) {
    return 'CSV files up to 25 MB each, with the column names in the first row. If yours has lines above the header, I can skip them.'
  }
  if (/\b(which|what) columns?\b.*\bmatch\b|\bmatch on\b/.test(lower)) {
    return (
      'By default I match on transaction ID, then confirm the amount and date agree. If your ' +
      'files name those columns differently, rename them here and I’ll pick them up.'
    )
  }
  if (/^how (does|do|will)\b/.test(lower) && !result) {
    return (
      'I line up each row in the source with its partner in the target by transaction ID, ' +
      'then check the amount and date. Anything without a partner, or with a different ' +
      'amount, is flagged as an exception.'
    )
  }
  if (result) {
    if (/mismatch|differ|amount/.test(lower)) {
      return (
        `${result.amountMismatch} rows differ on amount. Most gaps are under ₹1, which usually ` +
        'means rounding on one side — the rest are worth checking against the settlement report.'
      )
    }
    if (/missing|absent|not found/.test(lower)) {
      return (
        `${result.missingInTarget} source rows have no partner in the target, and ` +
        `${result.missingInSource} target rows have none in the source. Late settlements are ` +
        'the usual cause — try again after the next settlement cycle.'
      )
    }
  }
  if (/\?$/.test(lower) && files.length === 0) {
    return 'Start by adding both files — drop them in the box on the left, or use the paperclip here.'
  }
  return undefined
}

/**
 * Read a sentence into what to do. Order matters: specific shapes ("first 4 characters")
 * are tried before looser ones that would also match ("first 4 … rows").
 */
export function interpret(text: string, files: FileContext[], result?: ReconResult): Intent {
  const said = text.trim().replace(/[.!]+$/, '')
  const lower = said.toLowerCase()

  if (/^(no|nope|nothing|none|looks good|all good|good to go|all set|that'?s (it|all)|done|fine)\b/.test(lower)) {
    return { type: 'done' }
  }
  if (/\b(undo|revert|take (that|it) back)\b/.test(lower)) return { type: 'undo' }
  if (/^(run|start|go|match)\b|\brun (the )?recon\b/.test(lower)) return { type: 'run' }

  const answered = answer(lower, files, result)
  if (answered) return { type: 'reply', text: answered }

  if (files.length === 0) {
    return { type: 'reply', text: 'Add your files first — then tell me what to clean up.' }
  }

  const found = mentions(said, files)
  const file = pickFile(lower, files, found)
  const fileId = file?.id
  const columnsHere = found.filter((mention) => !fileId || mention.fileId === fileId)
  const column = columnsHere[0]?.column
  const step = (op: Operation, id = fileId): Intent => ({ type: 'step', fileId: id, op })

  // How the file is read.
  const delimiter = lower.match(/\b(semi-?colon|pipe|tab|comma)\b/)?.[1]
  if (delimiter && /separat|delimit|split|\bcsv\b|columns are/.test(lower)) {
    return { type: 'parse', fileId, patch: { delimiter: DELIMITER_WORDS[delimiter.replace('-', '')] } }
  }
  if (/encod|utf|latin|iso-?8859|windows|ansi|garbled|weird characters/.test(lower)) {
    const encoding: Encoding = /utf-?16/.test(lower)
      ? 'utf-16le'
      : /latin|iso/.test(lower)
        ? 'iso-8859-1'
        : /windows|1252|ansi/.test(lower)
          ? 'windows-1252'
          : 'utf-8'
    return { type: 'parse', fileId, patch: { encoding } }
  }
  if (/single quotes?|no quotes|without quotes|quote char/.test(lower)) {
    const quote: Quote = /single/.test(lower) ? "'" : /no quotes|without/.test(lower) ? '' : '"'
    return { type: 'parse', fileId, patch: { quote } }
  }

  const characters = lower.match(/\b(first|last)\s+(\d+)\s+(characters?|chars?|letters?|digits?)\b/)
  if (characters) {
    return step({ kind: characters[1] === 'first' ? 'left' : 'right', column, count: characters[2] })
  }

  const lines =
    lower.match(/\b(first|top|last|bottom)\s+(\d+)\s+(rows?|lines?)\b/) ??
    lower.match(/\b(\d+)\s+(rows?|lines?)\s+(?:from|at)\s+the\s+(top|bottom)\b/)
  if (lines && /skip|ignore|remove|drop|delete|cut|banner|summary/.test(lower)) {
    const [count, where] = /^\d+$/.test(lines[1]) ? [lines[1], lines[3]] : [lines[2], lines[1]]
    const fromTop = where === 'first' || where === 'top'
    return { type: 'parse', fileId, patch: fromTop ? { skipTop: Number(count) } : { skipBottom: Number(count) } }
  }
  if (/\b(banner|summary|header) (rows?|lines?)\b|\bskip\b/.test(lower)) {
    return { type: 'parse', fileId, patch: {} }
  }

  const rename = said.match(
    /\brename\s+(?:the\s+)?(?:column\s+)?["'“]?(.+?)["'”]?\s+(?:to|as|into)\s+["'“]?(.+?)["'”]?$/i,
  )
  if (rename) {
    const resolved = resolveColumn(rename[1], files, fileId)
    return step({ kind: 'rename', column: resolved?.column, text: rename[2] }, fileId ?? resolved?.fileId)
  }
  if (/\brename\b/.test(lower)) return step({ kind: 'rename', column })

  if (/\b(delete|drop|remove|hide)\b.*\bcolumns?\b/.test(lower)) {
    return step({ kind: 'deleteColumn', column })
  }

  if (/\b(join|combine|concat(enate)?|merge)\b/.test(lower)) {
    const separatorWord = lower.match(/\bwith an? (space|dash|hyphen|underscore|slash|comma|pipe)\b/)?.[1]
    const into = said.match(/\b(?:into|as|called|named)\s+["'“]?([\w ]+?)["'”]?$/i)?.[1]
    return step({
      kind: 'concat',
      column: columnsHere[0]?.column,
      second: columnsHere[1]?.column,
      with: separatorWord ? SEPARATORS[separatorWord] : quoted(said),
      into,
    })
  }

  if (/\b(drop|remove|delete|exclude|filter out|get rid of)\b.*\brows?\b|\brows? where\b/.test(lower)) {
    const empty = /\b(empty|blank|missing|null)\b/.test(lower)
    const value = empty
      ? ''
      : (quoted(said) ?? said.match(/\b(?:is|equals|=)\s+(\S+)$/i)?.[1] ?? '')
    return step({ kind: 'dropRows', column, text: value })
  }

  const replace = said.match(/\breplace\s+["'“]?(.+?)["'”]?\s+with\s+["'“]?(.*?)["'”]?(?:\s+in\s+.+)?$/i)
  if (replace) return step({ kind: 'replace', column, text: replace[1], with: replace[2] })
  if (/\breplace\b/.test(lower)) return step({ kind: 'replace', column })

  if (/\bfill\b|\bdefault\b|\bblanks?\b|\bempty (cells|values)\b/.test(lower)) {
    const value = said.match(/\bwith\s+["'“]?(.+?)["'”]?$/i)?.[1]
    return step({ kind: 'fill', column, text: value })
  }

  if (/\btrim|whitespace|extra spaces|\bspaces\b/.test(lower)) {
    return step({ kind: 'trim', column: column ?? ALL_COLUMNS })
  }
  if (/upper ?case|capitali[sz]e|all caps|\bcaps\b/.test(lower)) {
    return step({ kind: 'upper', column: column ?? ALL_COLUMNS })
  }
  if (/lower ?case/.test(lower)) return step({ kind: 'lower', column: column ?? ALL_COLUMNS })

  if (/\bprefix\b|\bin front\b|\bbefore\b|\bstart with\b/.test(lower)) {
    const value =
      quoted(said) ??
      said.match(/\bprefix\s+(?:of\s+)?(\S+)/i)?.[1] ??
      said.match(/\badd\s+(\S+)\s+(?:before|in front)/i)?.[1]
    return step({ kind: 'prefix', column, text: value })
  }
  if (/\bsuffix\b|\bafter\b|\bend with\b|\bto the end\b/.test(lower)) {
    const value =
      quoted(said) ??
      said.match(/\bsuffix\s+(?:of\s+)?(\S+)/i)?.[1] ??
      said.match(/\badd\s+(\S+)\s+(?:after|to the end)/i)?.[1]
    return step({ kind: 'suffix', column, text: value })
  }

  if (/\bdates?\b|yyyy|dd\s*[/-]\s*mm|mm\s*[/-]\s*dd|\biso\b/.test(lower)) {
    return step({
      kind: 'date',
      column: column ?? guessColumn(files, fileId, DATE_COLUMN),
      format: dateFormatIn(lower) ?? 'YYYY-MM-DD',
    })
  }
  if (/\b(numbers?|numeric|amounts?|commas?|currency|rupees?|decimals?)\b|₹/.test(lower)) {
    return step({ kind: 'number', column: column ?? guessColumn(files, fileId, AMOUNT_COLUMN) })
  }

  return { type: 'menu', fileId }
}

/** How a file writes its dates, read off its first date column. */
function dateStyle(file: FileContext) {
  const column = file.columns.find((name) => DATE_COLUMN.test(name))
  const value = column && file.sample?.find((row) => row[column]?.trim())?.[column]?.trim()
  if (!column || !value) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return { column, format: 'YYYY-MM-DD' }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return { column, format: 'DD/MM/YYYY' }
  return undefined
}

const hasEdgeSpaces = (file: FileContext) =>
  file.sample?.some((row) => Object.values(row).some((value) => value !== value.trim())) ?? false

/**
 * The chips over the input — what is worth saying next, given where things are. Built from
 * what the files really hold: trimming only when a value carries stray spaces, and a date
 * format only when the two files write dates differently, phrased to make the target match
 * the source.
 */
export function suggestionsFor(files: FileContext[], result: ReconResult | undefined, cleaned: boolean) {
  if (result) return ['Why do some rows differ on amount?', 'What about the missing ones?']
  if (files.length === 0) return ['How does AI Recon match rows?', 'What file formats can I use?']
  if (cleaned && files.length === 2) return ['Run the recon', 'Show me what else you can do']

  const [source, target] = files.map(dateStyle)
  const dates = source && target && source.format !== target.format ? target : undefined
  const spaced = files.find(hasEdgeSpaces)
  return [
    ...(spaced ? [files.length > 1 ? `Trim spaces in the ${spaced.role}` : 'Trim spaces in every column'] : []),
    ...(dates ? [`Format ${dates.column} as ${source!.format}`] : []),
    'Show me what else you can do',
    'Looks good',
  ]
}
