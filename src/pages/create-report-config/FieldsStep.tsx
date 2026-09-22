import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { Asterisk, ChevronLeft, ChevronRight, Hash, Plus, X } from 'lucide-react'
import {
  useCallback,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { SAMPLE_ROW_COUNT, sampleFor } from '../../field-samples'
import { SLOT_ICON } from '../../icons'
import { LinkAction } from '../../link-action'
import { PrimitiveText, font } from '../../primitives'
import { fieldTagTokens } from '../../theme'
import { AddCustomColumnModal } from './AddCustomColumnModal'
import { ColumnOrganiser } from './ColumnOrganiser'
import { GroupByBar } from './GroupByBar'
import type { FieldsLayoutVersion } from './fields-layout'
import { activeGroupBy, FIELD_TAGS, IMPORTANT_FIELDS, fieldOf, isFieldSelected,
  isVocabularyField, newFieldColumn, sameField, withoutField, type FieldColumn,
  type FieldsAnswers } from './answers'

const { colors } = FOUNDATION_THEME

/**
 * The remove glyph on a lit tag — the same 12px `X` Blend draws on its own dismissible tags
 * (Tags/accessibility/TagAccessibility.tsx:381), so it reads as Blend's close affordance.
 *
 * gray[0], not inherited: ATTENTIVE/NEUTRAL paints its label gray[0] on a gray[950] chip
 * (tagV2.light.tokens.ts), so a currentColor glyph would be near-black on near-black.
 */
const REMOVE_TAG_SLOT = { slot: <X {...SLOT_ICON} color={colors.gray[0]} /> }

/**
 * Version 6's chips — node 4861:105311, which draws two states and nothing between them.
 *
 * Off: SUBTLE, a gray[50] fill inside a hairline, and no slots at all. On: ATTENTIVE, the
 * near-black chip, with a leading # and the same trailing ✕. Both SQUARICAL/MD, where the
 * shipped chips are ROUNDED/SM — so this is a different shape and a different size, not a
 * recolour, which is why it is a version rather than an edit.
 *
 * The # only exists on a selected chip. That is the design's call and it is a defensible
 * one — the hash reads as "this is now a column", so it arrives with the column it names —
 * but it does mean the two states differ by more than fill, and a chip changes width when
 * you click it. Worth a look on screen before v6 becomes the default.
 *
 * Both glyphs are gray[0] for the reason REMOVE_TAG_SLOT already gives: they sit on gray[950].
 * `tag/slot/size/md` is 12, which is the size Blend's own md slot expects.
 */
const FIELD_HASH_SLOT = { slot: <Hash {...SLOT_ICON} color={colors.gray[0]} /> }

/**
 * Off for now. The paragraph above already flags the cost — a chip that changes width when
 * you click it — and on screen that is what it does, so the # is switched off while the two
 * states are looked at side by side.
 *
 * A flag rather than deleting the slot: the design does call for it (node 4861:105311), so
 * this is a decision being held open, not a mistake being corrected. One value to flip.
 */
const SHOW_FIELD_HASH = false

/**
 * Off for now. The footer's scroll arrows (see `tableFooter`) are hidden while the step is
 * looked at without them.
 *
 * A flag rather than deleting the control, for the same reason as SHOW_FIELD_HASH above: the
 * gap it fills is real — Blend's DataTable scrolls sideways and ships nothing to drive it,
 * so with this off the only ways across a wide table are a trackpad swipe, a shift-wheel or
 * tabbing through the headers, none of them visible. That is a decision being held open, not
 * a mistake being corrected. One value to flip.
 *
 * The edge fades are deliberately NOT tied to this: they say there is more table, which stays
 * true whether or not anything is offered to press.
 */
const SHOW_TABLE_SCROLL_FOOTER = false

/**
 * The mark that says "this field is yours, not ours" — on every custom chip, lit or pale, so a
 * field made with "Add custom column" is identifiable before you click it rather than only
 * after.
 *
 * blend-gap: the design names `asterisk-02`, which is Untitled UI's icon set. lucide (rule 11)
 * ships one asterisk, `Asterisk`, and it is the same glyph — six strokes through a centre — so
 * this is the nearest real icon rather than a substitute for a missing one.
 *
 * Tinted by state for the reason REMOVE_TAG_SLOT gives: a lit chip is gray[950], so the glyph
 * has to be gray[0] to be seen at all. A pale chip keeps it at gray[400], one step under the
 * label, so the mark reads as an annotation rather than as part of the name.
 */
const customFieldSlot = (selected: boolean) => ({
  slot: <Asterisk {...SLOT_ICON} color={selected ? colors.gray[0] : colors.gray[400]} />,
})

/** The chip props that differ between the shipped chips and version 6's. */
const TAG_SHAPE = {
  current: { size: TagV2Size.SM, subType: TagV2SubType.ROUNDED, offType: TagV2Type.NO_FILL },
  v6: { size: TagV2Size.MD, subType: TagV2SubType.SQUARICAL, offType: TagV2Type.SUBTLE },
} as const

/**
 * Fixed tracks: 224px per column. Handed to DataTable as both `minWidth` and `maxWidth` —
 * its column styles set `width: auto` between the two (utils.ts getColumnStyles), so pinning
 * both ends is what holds a column at one width.
 *
 * 224, not the design's own 222, to land on the 4px grid (rule 10). Everything downstream
 * derives from this constant — the column def, the scroll-step arithmetic, the letter-row
 * fallback — and the letter row measures real `<th>` widths at runtime rather than assuming
 * the number, so the change propagates without desynchronising. It does not tile against
 * TABLE_MAX_WIDTH either way (1200 / 222 and 1200 / 224 are both fractional), so no
 * alignment is lost. The only cost is 2px per column of drift from Figma.
 */
const COLUMN_WIDTH = 224

/**
 * How wide the table's viewport is allowed to get, and how narrow it settles at.
 *
 * A range rather than a single measure: between these two the table tracks the window, so a
 * wide screen shows more columns before anything scrolls and a laptop still gets a table
 * that reads as one. Columns stay a fixed COLUMN_WIDTH each — this sizes the window onto
 * them, not the columns themselves, so past MAX the table scrolls rather than squeezing.
 *
 * The floor is the flow's own content measure (`--flow-content`, index.css) rather than a
 * number of its own: a table that breaks out of the column must never end up narrower than
 * the column it broke out of, and a second copy of the width is how that drifts.
 */
const TABLE_MAX_WIDTH = 1200

/**
 * The empty state's frame. Dashed, not solid: it stands in for a table that does not exist
 * yet, and a dashed stroke reads as a temporary placeholder where a solid one reads as a
 * finished container — the same stroke as FiltersStep's empty state. gray[300] rather than
 * the table's gray[150], because the gaps in a dash make the same colour read lighter.
 */
const EMPTY_FRAME = `1px dashed ${colors.gray[300]}`

/** How far the clipped edge fades out to signal there is more table past it. */
const EDGE_FADE = 40

/** The letter row's height, per the design (node 4418:13411). */
const LETTER_ROW_HEIGHT = 56

/**
 * The whole DataTable at rest: its 2px outer inset, 1px frame, 46px header and the three
 * empty rows with their dividers — measured, since none of it is a prop. The empty state
 * matches it, plus the letter row, so clearing the last column does not yank the tags up.
 *
 * Deliberately left off the 4px grid. This is not a gap anyone chose; it is the sum of
 * Blend's own internals (a 46px header, a 1px frame) and its whole job is to *equal* what
 * the real table renders. Rounding it to 212 would buy a grid-compliant number and pay for
 * it with a visible 2px jump every time the last column leaves — the exact thing the
 * constant exists to prevent. Contrast MENU_MAX_HEIGHT in DeliveryStep, which is a cap
 * rather than a match, so rounding it up costs nothing but slack.
 */
const TABLE_HEIGHT = 210

/**
 * Spreadsheet labels — A…Z, then AA, AB, so a 27th column still reads sensibly.
 *
 * Derived from position, never stored: the letters are the slots, not the columns. Dragging
 * a column moves it between letters; A stays leftmost whatever ends up in it.
 */
function columnLetter(index: number) {
  let remaining = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label
    remaining = Math.floor(remaining / 26) - 1
  } while (remaining >= 0)
  return label
}

type FieldRow = Record<string, unknown>

/** One shared empty list, so the ungrouped case does not mint a new array every render. */
const NO_GROUPS: readonly string[] = []

/**
 * The columns in the order the table draws them: grouped ones first, in grouping order, then
 * everything else as it stands. That is what grouping does to the output, and the preview is
 * the only place it can be seen.
 *
 * `columns` itself is never reordered by this — it is the answer, and the grouping is a
 * second fact about it.
 */
function orderColumns(columns: FieldColumn[], groupedFields: readonly string[]) {
  if (groupedFields.length === 0) return columns
  const isGrouped = (column: FieldColumn) =>
    groupedFields.some((field) => sameField(field, fieldOf(column)))
  return [
    // By field, in grouping order — `groupBy` holds fields now (answers.ts). `flatMap` over
    // the grouping rather than a filter over the columns, because the order that matters
    // here is the grouping's, not the table's.
    ...groupedFields.flatMap((field) =>
      columns.filter((column) => sameField(fieldOf(column), field)),
    ),
    ...columns.filter((column) => !isGrouped(column)),
  ]
}

/**
 * Step 3 — the report's columns, drawn as the table they will become.
 *
 * Blend's DataTable, so scrolling, reordering, renaming and deleting are all the table's own:
 * it scrolls sideways inside its own container, drags columns by the grip it draws on each
 * header, and puts Rename and Delete in the header's ⋮ menu. It keeps the column order in
 * state of its own and reports changes back, so the answers here stay the one source of truth
 * and the table is re-fed from them.
 */
export function FieldsStep({
  answers,
  onChange,
  aggregated = false,
  version = 'v1',
  addingColumn,
  onAddingColumnChange,
}: {
  answers: FieldsAnswers
  onChange: (next: FieldsAnswers) => void
  /**
   * Whether the report groups its records — Setup's "Grouped records" (index.tsx). Only the
   * column organiser reads it, and only to decide whether a column can be given an
   * aggregation at all; see ColumnOrganiser.
   */
  aggregated?: boolean
  /** Which arrangement to draw — see FieldsLayoutDials. Defaults to the original. */
  version?: FieldsLayoutVersion
  /**
   * Whether the "Add custom column" modal is open. Owned by the page, because the button
   * that opens it sits in the step heading, which the page draws.
   */
  addingColumn: boolean
  onAddingColumnChange: (open: boolean) => void
}) {
  const { columns } = answers
  const setColumns = (next: typeof columns) => onChange({ ...answers, columns: next })

  /** Versions 6 and 7 redraw the field chips; every other version keeps the shipped ones. */
  const newChips = version === 'v6' || version === 'v7'
  const shape = newChips ? TAG_SHAPE.v6 : TAG_SHAPE.current

  /** Version 7 adds the grouping rule above the table — see GroupByBar. */
  const grouping = version === 'v7'
  /**
   * Derived, so a column leaving the table takes its grouping with it — and memoised, because
   * everything below keys off this array's identity. `answers` only changes when an answer
   * does, which is exactly when the grouping can have moved.
   */
  const groupBy = useMemo(
    () => (grouping ? activeGroupBy(answers) : NO_GROUPS),
    [grouping, answers],
  )

  /**
   * What the table draws, and in what order. Grouped columns lead: that is what grouping does
   * to the output, and showing it here is the only feedback that the rule above the table is
   * about *these* columns. Everything else keeps the order the user dragged it into.
   *
   * `columns` itself is untouched — this is the preview's order, not the answer's.
   */
  /** The grouping as one string, for the DataTable key below. */
  const groupKey = groupBy.join()
  const displayColumns = useMemo(() => orderColumns(columns, groupBy), [columns, groupBy])

  /**
   * Keyed on the column's `id` rather than its title: titles are free text, and two columns
   * can legitimately carry the same one.
   *
   * Memoised on `columns` because DataTable re-syncs its internal column state in an effect
   * on this array's identity (DataTable.tsx:215-274) — a fresh array every render would run
   * that merge on every keystroke elsewhere on the page.
   */
  const tableColumns = useMemo<ColumnDefinition<FieldRow>[]>(
    () =>
      // Memoised because DataTable re-syncs its column state off this array's identity in an
      // effect (DataTable.tsx:215-274) — a fresh array every render would run that merge on
      // every keystroke elsewhere on the page.
      displayColumns.map(({ id, title }) => ({
        field: id,
        header: title,
        type: ColumnType.TEXT,
        // Left sortable on purpose: DataTable only draws a header's ⋮ menu for a column that
        // can sort or filter (TableHeader/index.tsx:1114-1117), and that menu is where Rename
        // lives. The Sort rows it brings along are hidden in index.css, leaving Rename alone.
        isSortable: true,
        minWidth: `${COLUMN_WIDTH}px`,
        maxWidth: `${COLUMN_WIDTH}px`,
      })),
    [displayColumns],
  )

  /**
   * Three rows of plausible output, one cell per configured column.
   *
   * The table used to draw three empty rows — it previewed the columns and nothing else,
   * which showed you the shape of the file but never what would be in it. Filling them costs
   * nothing and answers the question the step is actually about: is this the report I want?
   *
   * Values come from the shared vocabulary in field-samples.ts, so a column shows the same
   * example here and in the Review step's preview. Keyed on the column's *title* because
   * that is what names the field; a custom column has no entry there and falls back to the
   * default value its author gave it (`customFields`), which is genuinely what every row of
   * that column will contain.
   */
  const tableData = useMemo<FieldRow[]>(
    () =>
      Array.from({ length: SAMPLE_ROW_COUNT }, (_, index) => ({
        id: `row-${index}`,
        ...Object.fromEntries(
          displayColumns.map(({ id, title }) => [
            id,
            sampleFor(
              title,
              index,
              answers.customFields.find((field) => field.title === title)?.defaultValue,
            ),
          ]),
        ),
      })),
    [displayColumns, answers.customFields],
  )

  /**
   * DataTable's own scroll container. It exposes no ref, so it is found the way DataTable
   * finds it itself — the `<table>`'s parent (TableHeader/index.tsx:1185-1186).
   */
  const wrapperRef = useRef<HTMLDivElement>(null)
  const getScroller = () =>
    wrapperRef.current?.querySelector('table')?.parentElement ?? null

  /**
   * Which edges are currently cutting content off. Only those fade — a fade on an edge with
   * nothing past it would promise a column that is not there.
   */
  const [clipped, setClipped] = useState({ left: false, right: false })

  /**
   * The letter row, drawn above DataTable rather than inside it: the header row is Blend's,
   * with no slot above the titles. So it has to track the table by hand — each letter takes
   * its header cell's measured width and offset, and the row slides with the table's scroll.
   *
   * Measured rather than assumed 222px: DataTable lays the table out itself, and a letter that
   * drifts off its column is worse than no letter.
   */
  const railRef = useRef<HTMLDivElement>(null)
  const [letterTracks, setLetterTracks] = useState<{ offset: number; widths: number[] }>({
    offset: 0,
    widths: [],
  })

  const syncTable = useCallback(() => {
    const wrapper = wrapperRef.current
    const table = wrapper?.querySelector('table')
    const el = table?.parentElement
    if (!wrapper || !table || !el) return

    const furthest = el.scrollWidth - el.clientWidth
    // A pixel of slack: fractional scroll offsets otherwise leave the end fade on forever.
    const left = el.scrollLeft > 1
    const right = el.scrollLeft < furthest - 1
    setClipped((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))

    // Written straight to the row's style rather than through state: this runs on every
    // scroll event, and a re-render per frame of scrolling buys nothing.
    if (railRef.current) railRef.current.style.transform = `translateX(${-el.scrollLeft}px)`

    // Offsets are measured at scroll 0 — the table's own left edge inside the wrapper, which
    // is DataTable's inset plus its frame — so they hold whatever the scroll position.
    const origin = wrapper.getBoundingClientRect().left
    const cells = [...table.querySelectorAll('th')]
    const offset = Math.round(table.getBoundingClientRect().left + el.scrollLeft - origin)
    const widths = cells.map((cell) => cell.getBoundingClientRect().width)
    setLetterTracks((prev) =>
      prev.offset === offset && prev.widths.join() === widths.join() ? prev : { offset, widths },
    )
  }, [])

  // Re-measured on resize as well as on scroll, since the container narrowing can clip an
  // edge without the scroll position moving at all — and the table is observed too, because
  // it grows when DataTable adds a column in its own effect, after this one has run.
  useEffect(() => {
    const table = wrapperRef.current?.querySelector('table')
    const el = table?.parentElement
    if (!table || !el) return
    syncTable()
    el.addEventListener('scroll', syncTable, { passive: true })
    const observer = new ResizeObserver(syncTable)
    observer.observe(el)
    observer.observe(table)
    return () => {
      el.removeEventListener('scroll', syncTable)
      observer.disconnect()
    }
    // columns.length: going to and from zero columns mounts and unmounts the table.
    // version: so does switching to v8, which draws no card — without this the listener and
    // the observer would stay bound to a detached scroller.
  }, [syncTable, columns.length, version])

  /**
   * Set when a column is appended, read once the new column has actually rendered.
   *
   * A flag rather than scrolling inside the click handler: the column does not exist yet at
   * that point — `scrollWidth` is still the old width, so scrolling there lands one column
   * short of the thing you just added. And a flag rather than watching `columns.length`,
   * which would also fire on a delete and yank the table sideways for no reason.
   */
  const scrollToEnd = useRef(false)

  useEffect(() => {
    if (!scrollToEnd.current) return
    scrollToEnd.current = false
    // One frame on: DataTable adds the column in its own effect, after this one has run.
    const frame = requestAnimationFrame(() => {
      const el = getScroller()
      if (!el) return
      el.scrollTo({
        left: el.scrollWidth,
        // The scroll is the whole point — it is what shows you where the column landed — so
        // reduced motion gets the jump rather than nothing.
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [columns])

  /** New columns always land on the right, so appending is always worth scrolling to. */
  const appendColumn = (title?: string, defaultValue?: string) => {
    scrollToEnd.current = true
    setColumns([...columns, newFieldColumn(title, defaultValue)])
  }

  /**
   * The same, for several at once. Not a loop over `appendColumn`: that reads `columns` from
   * this render, so every call in the loop would build its next array from the same stale
   * list and only the last one would survive.
   */
  const appendColumns = (titles: readonly string[]) => {
    scrollToEnd.current = true
    setColumns([...columns, ...titles.map((title) => newFieldColumn(title))])
  }

  /**
   * The important fields still missing from the table, in IMPORTANT_FIELDS order rather than
   * the table's — the order they are added in is the order that list argues for.
   *
   * Only the empty state reads it, where by definition every one of them is missing, so today
   * this is always the whole list. It stays a filter rather than IMPORTANT_FIELDS itself so
   * that a second caller somewhere the table is not empty cannot quietly add a duplicate
   * column.
   */
  const missingImportant = IMPORTANT_FIELDS.filter((tag) => !isFieldSelected(columns, tag))

  /**
   * Ties the footer's arrows to the table they move, for assistive tech.
   */
  const scrollerId = useId()

  /**
   * Steps by whole columns — one fewer than fit, so the column at the leading edge stays in
   * view as context — and lands on a column boundary, so the table never rests with a header
   * cut in half. The browser clamps the far ends. Smooth unless the user prefers reduced
   * motion.
   */
  const scrollColumns = (direction: -1 | 1) => {
    const el = getScroller()
    if (!el) return
    const page = Math.max(1, Math.floor(el.clientWidth / COLUMN_WIDTH) - 1) * COLUMN_WIDTH
    const from = Math.round(el.scrollLeft / COLUMN_WIDTH) * COLUMN_WIDTH
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: from + direction * page, behavior: reduce ? 'auto' : 'smooth' })
  }

  /**
   * blend-gap: a horizontal scroll control for DataTable. Blend ships none — `TableFooter`
   * renders `DataTablePagination` and nothing else, its chevrons are Previous/Next *page*, and
   * `DataTable/types.ts` has no scroll prop at all. The only scrollLeft writes in the component
   * are internal (restoring position when a filter popover opens; jumping to the end when a
   * column is appended while already at the end). So this is composed here.
   *
   * Beneath the table rather than above it, where Blend's own pagination arrows sit, so it
   * reads as the table's footer. It cannot go *inside* DataTable's frame: the footer slot is
   * pagination-only and Blend components take no className or style, so the bar is a sibling
   * and gets the card's horizontal padding by hand to line its arrows up with the frame edge.
   *
   * Drawn only when the table actually overflows. The previous version of this control lived
   * above the table and stayed put with both arrows disabled, on the reasoning that a pair
   * that never moves is easier to live with than one that appears and disappears. As a footer
   * that inverts: a permanent bar under a table that fits is a strip of dead chrome under
   * every short table, and `clipped` already distinguishes the two cases exactly — it is the
   * same state the edge fades read, so the footer appears precisely when a fade does.
   */
  const tableFooter = SHOW_TABLE_SCROLL_FOOTER && (clipped.left || clipped.right) && (
    <div className="flex items-center justify-end gap-2 px-1">
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        subType={ButtonV2SubType.ICON_ONLY}
        aria-label="Scroll table left"
        aria-controls={scrollerId}
        leftSlot={{ slot: <ChevronLeft size={14} /> }}
        disabled={!clipped.left}
        onClick={() => scrollColumns(-1)}
      />
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        subType={ButtonV2SubType.ICON_ONLY}
        aria-label="Scroll table right"
        aria-controls={scrollerId}
        leftSlot={{ slot: <ChevronRight size={14} /> }}
        disabled={!clipped.right}
        onClick={() => scrollColumns(1)}
      />
    </div>
  )

  const table = (
    // Keyed so a version switch reorders the block rather than remounting the table — it
    // keeps its scroll position and any column mid-rename.
    <div key="table" className="flex w-full flex-col gap-2">
      <div
        id={scrollerId}
        ref={wrapperRef}
        // The fade is on this wrapper, not on DataTable's scroller: it has to cover the letter
        // row and the table's frame together, and the wrapper is the one element that holds
        // both without reaching into Blend's markup. Widths come from `clipped` — index.css.
        className="fields-table w-full min-w-0"
        style={
          {
            '--fade-left': clipped.left ? `${EDGE_FADE}px` : '0px',
            '--fade-right': clipped.right ? `${EDGE_FADE}px` : '0px',
            // Column titles at gray[700] rather than DataTable's muted default — index.css.
            '--header-color': colors.gray[700],
            // …and at body.md rather than DataTable's hardcoded 12px, so a column title
            // matches the letter above it and the field names below. Both halves of the
            // token travel together — see rule 6 on why the leading cannot be dropped.
            '--header-size': `${FOUNDATION_THEME.font.size.body.md.fontSize}px`,
            '--header-leading': `${FOUNDATION_THEME.font.size.body.md.lineHeight}px`,
          } as CSSProperties
        }
      >
        {columns.length > 0 && (
          <div className="overflow-hidden" aria-hidden="true">
            <div
              ref={railRef}
              className="flex w-max"
              style={{ paddingLeft: letterTracks.offset }}
            >
              {displayColumns.map((column, index) => (
                <div
                  key={column.id}
                  className="flex items-center justify-center"
                  style={{
                    width: letterTracks.widths[index] ?? COLUMN_WIDTH,
                    height: LETTER_ROW_HEIGHT,
                  }}
                >
                  <PrimitiveText
                    {...font(FOUNDATION_THEME.font.size.body.md)}
                    // A grouped column's letter is tinted to match its chip in the bar above,
                    // so the rule and the columns it moved read as one thing.
                    color={
                      groupBy.some((field) => sameField(field, fieldOf(column)))
                        ? colors.primary[600]
                        : colors.gray[400]
                    }
                  >
                    {columnLetter(index)}
                  </PrimitiveText>
                </div>
              ))}
            </div>
          </div>
        )}
        {columns.length === 0 ? (
          // DataTable with no columns still draws its frame around nothing, so the empty
          // state is this step's own. Same height as the table plus its letter row.
          <div
            className="flex w-full flex-col items-center justify-center gap-4"
            style={{ height: LETTER_ROW_HEIGHT + TABLE_HEIGHT, border: EMPTY_FRAME, borderRadius: FOUNDATION_THEME.border.radius[12] }}
          >
            {/* Title and subtitle as their own stack, so the 4px between them is not the 16px
                that separates the whole message from the button. */}
            <div className="flex flex-col items-center gap-1">
              <PrimitiveText
                as="p"
                {...font(FOUNDATION_THEME.font.size.body.lg)}
                color={colors.gray[700]}
                fontWeight={FOUNDATION_THEME.font.weight[600]}
              >
                No columns selected
              </PrimitiveText>
              {/* gray[500], not the gray[400] the single line used to be: that was placeholder
                  colour, which DESIGN.md reserves for placeholders and disabled text. As the
                  supporting half of a titled empty state this is body copy. */}
              <PrimitiveText
                as="p"
                {...font(FOUNDATION_THEME.font.size.body.md)}
                color={colors.gray[500]}
              >
                Pick your fields from below, or add a custom column.
              </PrimitiveText>
            </div>
            {/* The one shortcut out of the empty state, so the step offers a way forward
                rather than only describing one. MEDIUM rather than the SMALL used by "Add
                custom column" in the heading: this sits alone in a 266px frame with nothing
                to size against, where that one sits in a row of step chrome.

                No `missingImportant.length` guard — an empty table means every important
                field is missing, so here the button always has something to do. The chip
                row's link carries the guard instead, for the partly-filled case. */}
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.MEDIUM}
              text="Add important columns"
              leftSlot={{ slot: <Plus size={14} /> }}
              onClick={() => appendColumns(missingImportant)}
            />
          </div>
        ) : (
          <DataTable
            // Remounted when the grouping changes, and only then. DataTable keeps a column
            // order of its own and merges a new `columns` array into it by field, walking its
            // own list first (DataTable.tsx:215-274) — so it adopts a renamed header but never
            // a new order. Left alone, the letter row would move a grouped column to A while
            // the header under it still said something else. Nothing is lost: the scroll
            // resets to the left edge, which is where the newly grouped column now is.
            key={`columns-${groupKey}`}
            data={tableData}
            columns={tableColumns}
            idField="id"
            // The step heading already says what this is.
            showHeader={false}
            // One placeholder row paginates nothing.
            showFooter={false}
            // Columns are chosen by the tags below, not by the table's own column picker —
            // which would also add a sticky settings column on the right.
            enableColumnManager={false}
            enableFiltering={false}
            // Off while a grouping stands: grouped columns own the left edge, so a drag would
            // either be undone on the next render or quietly rewrite the grouping order.
            enableColumnReordering={groupBy.length === 0}
            onColumnReorder={(reordered) => {
              const byId = new Map(columns.map((column) => [column.id, column]))
              setColumns(
                reordered.flatMap(({ field }) => byId.get(String(field)) ?? []),
              )
            }}
            // Turns on the ⋮ menu's Rename, which edits the header in place. It also asks for a
            // row-actions column, which `showActionsColumn` turns back off — the placeholder
            // row has nothing to edit. No `onDeleteColumn`, so Delete stays out of the menu:
            // the tags below are how a column leaves.
            enableInlineEdit
            showActionsColumn={false}
            onHeaderChange={(field, next) =>
              setColumns(
                columns.map((column) =>
                  column.id === String(field)
                    ? // An all-whitespace name would leave a nameless header, so it reverts.
                      // Either way a new array goes back, which re-feeds the table and puts
                      // the kept title back over the blank DataTable already drew.
                      { ...column, title: next.trim() === '' ? column.title : next.trim() }
                    : column,
                ),
              )
            }
          />
        )}
      </div>
      {tableFooter}
    </div>
  )

  /**
   * The custom vocabulary: every field made with "Add custom column", plus any column standing
   * for a field no tag covers (it has no stored field, so it is picked up from `columns`).
   * One tag per name — matched the same case-insensitive way as the vocabulary.
   *
   * Keyed on `fieldOf`, not on the title. A column renamed to "Gross Volume" is still the Txn
   * Amount field and still has Txn Amount's chip; reading its title here would mint a second,
   * pale "Gross Volume" chip beside it — a control for a field that does not exist, sitting
   * next to the lit one that actually owns the column.
   */
  const customTags = [
    ...answers.customFields,
    ...columns
      .filter((column) => !isVocabularyField(fieldOf(column)))
      .map((column) => ({ title: fieldOf(column), defaultValue: column.defaultValue })),
  ].filter(
    (field, index, all) => all.findIndex((other) => sameField(other.title, field.title)) === index,
  )

  /**
   * A custom tag toggles like a vocabulary one: lit, its ✕ takes the column out of the table
   * and leaves the tag pale; pale, a click puts the column back with its default value.
   */
  const customTag = (field: (typeof customTags)[number]) => {
    const selected = isFieldSelected(columns, field.title)
    return (
      <TagV2
        key={field.title}
        text={field.title}
        size={shape.size}
        subType={shape.subType}
        color={TagV2Color.NEUTRAL}
        type={selected ? TagV2Type.ATTENTIVE : shape.offType}
        // The asterisk, never the hash. Both want the one left slot, and of the two only the
        // asterisk says something the chip's own text does not — the hash marks "this is a
        // column now", which the fill already says, while the asterisk marks "this field is
        // yours". So a custom chip keeps its mark even if SHOW_FIELD_HASH is turned back on.
        leftSlot={customFieldSlot(selected)}
        aria-pressed={selected}
        title={selected ? `Remove ${field.title} from the table` : `Add ${field.title} to the table`}
        rightSlot={selected ? REMOVE_TAG_SLOT : undefined}
        onClick={() =>
          selected
            ? onChange({
                ...answers,
                // Kept as a field even if it only existed as a renamed column, so deselecting
                // never makes a tag vanish.
                customFields: answers.customFields.some(
                  ({ title }) => title.trim().toLowerCase() === field.title.trim().toLowerCase(),
                )
                  ? answers.customFields
                  : [...answers.customFields, field],
                columns: withoutField(columns, field.title),
              })
            : appendColumn(field.title, field.defaultValue)
        }
      />
    )
  }

  /**
   * A vocabulary chip — the same toggle as `customTag`, over a name Blend's field list owns
   * rather than one the user wrote, so deselecting simply drops the column and there is no
   * `customFields` bookkeeping to do.
   *
   * A function rather than an inline map body because the chips are no longer drawn in one
   * pass: a selected chip is drawn from `columns` and an unselected one from FIELD_TAGS, and
   * both have to produce the identical chip.
   */
  const vocabularyTag = (tag: string) => {
    const selected = isFieldSelected(columns, tag)
    return (
      <TagV2
        key={tag}
        text={tag}
        size={shape.size}
        subType={shape.subType}
        color={TagV2Color.NEUTRAL}
        type={selected ? TagV2Type.ATTENTIVE : shape.offType}
        leftSlot={selected && newChips && SHOW_FIELD_HASH ? FIELD_HASH_SLOT : undefined}
        aria-pressed={selected}
        title={selected ? `Remove ${tag} from the table` : `Add ${tag} to the table`}
        rightSlot={selected ? REMOVE_TAG_SLOT : undefined}
        onClick={() =>
          selected
            ? setColumns(withoutField(columns, tag))
            : appendColumn(tag)
        }
      />
    )
  }

  /**
   * The chips, selected first.
   *
   * The selected run is read off `columns` in `columns` order, which makes the row say two
   * things at once and keeps them free: click a chip and it lands at the end of the selected
   * run, because `appendColumn` appends; drag a column in the table and its chip moves with
   * it, because DataTable reports the new order back into `columns`. Neither needed code of
   * its own — the order was already the answer, it just was not being read.
   *
   * That is also why there is no separate "selection order" state. One would have to be kept
   * in step with `columns` on every add, remove, rename and drag, and the first place it fell
   * behind would be a chip sitting in a position the table disagrees with.
   *
   * Duplicates are dropped by name: two columns may legitimately carry one title (the table
   * keys on `id`), but two identical chips would be two controls for one thing.
   */
  const selectedFields = columns
    .map(fieldOf)
    .filter((field, index, all) => all.findIndex((other) => sameField(other, field)) === index)

  const selectedChips = selectedFields.map((field) => {
    const custom = customTags.find((entry) => sameField(entry.title, field))
    if (custom) return customTag(custom)
    // The canonical spelling, not the column's. `fieldOf` already reads the name the column
    // was created under rather than its current title, so a renamed column still draws the
    // chip it came from — this only restores FIELD_TAGS' own casing.
    return vocabularyTag(FIELD_TAGS.find((tag) => sameField(tag, field)) ?? field)
  })

  /** Everything not in the table, in the order it is offered: vocabulary first, then custom. */
  const unselectedChips = [
    ...FIELD_TAGS.filter((tag) => !isFieldSelected(columns, tag)).map(vocabularyTag),
    ...customTags
      .filter((field) => !isFieldSelected(columns, field.title))
      .map((field) => customTag(field)),
  ]

  /**
   * The field vocabulary and "Add custom column", as one group held to the flow's content
   * measure even though it sits inside the table's wide track. The table is what earns the
   * breakout; twenty-two tags rewrapped to 1110px just makes a longer line to scan.
   *
   * `self-center` lands the group on the content column exactly: its parent is the table's
   * box centred in the grid, so a column-wide child centred inside it shares the column's
   * own edges — the tags line up with the heading, not with the table.
   */
  const vocabulary = (
    /* Version 6's chips want a lighter subtle border than Blend's token (fieldTagTokens,
       src/theme.ts). Scoped here rather than set globally so the Filters step's "Optional"
       chip — also SUBTLE/NEUTRAL — keeps the default. Every other version renders inside the
       app's own tokens, unwrapped. */
    /* `key` belongs on this element, not the div: it is the array entry in the
       [table, vocabulary] render below. */
    <ThemeProvider key="vocabulary" componentTokens={newChips ? fieldTagTokens : undefined}>
    <div
      className="flex w-full flex-col self-center"
      style={{ maxWidth: 'var(--flow-content)', rowGap: 'var(--fields-add-gap, 16px)' }}
    >
      {/* The field vocabulary — node 4457:15485. Every tag is a toggle: a pale one adds its
          column to the table, a dark one removes it again, and the bin is what says so.

          The whole tag is the control rather than just the bin, because TagV2 renders as a
          single <button> once it is given an onClick — a second button nested inside that
          one is invalid markup, and the browser resolves it by ignoring the inner one.

          Selected chips lead, in the table's column order — see `selectedChips` above. The
          rule that used to divide vocabulary from custom now divides chosen from offered,
          which is the division the row actually has once the chosen ones are hoisted. */}
      <div
        className="flex w-full flex-wrap items-start gap-x-3"
        style={{ rowGap: 'var(--fields-tag-row-gap, 12px)' }}
      >
        {selectedChips}

        {/* The rule and the first offered chip wrap as one unit. Loose in the flex-wrap row,
            the rule could end a line on its own with the chips starting the next, dividing
            nothing. Only drawn when there is something on both sides of it. */}
        {selectedChips.length > 0 && unselectedChips.length > 0 && (
          <span className="flex items-center gap-x-3">
            {/* blend-gap: Blend 0.0.37 ships no divider or separator component, so this is a
                1px rule on a token colour. */}
            <span
              role="separator"
              aria-orientation="vertical"
              className="h-4 w-px"
              style={{ backgroundColor: colors.gray[300] }}
            />
            {unselectedChips[0]}
          </span>
        )}
        {selectedChips.length > 0 ? unselectedChips.slice(1) : unselectedChips}

        {/* Last in the row, so it reads as acting on every tag before it. See LinkAction
            (src/link-action.tsx) for why it is not a plain ButtonV2.

            Only drawn when there is something to clear: a visible control that is a no-op is
            worse than an absent one — it invites the click and then does not answer it.

            Adding the important columns is deliberately NOT offered here as a counterpart. It
            belongs to the empty state (the secondary button above), which is the only moment
            it is the obvious next move; once columns exist, the chips are how you add more. */}
        {/* Deselects everything, custom tags included — but custom tags stay in the row, pale,
            because customFields outlives the columns. */}
        {columns.length > 0 && (
          <LinkAction
            text="Clear all"
            onClick={() =>
              // Renamed-only custom columns are folded into customFields first, so clearing
              // leaves every custom tag in place.
              onChange({
                ...answers,
                customFields: customTags,
                columns: [],
              })
            }
          />
        )}
      </div>
    </div>
    </ThemeProvider>
  )

  /**
   * "Add custom column", outside the card rather than inside it.
   *
   * It is the one control here that does not act on the table's contents: every chip above
   * adds or removes a column that exists, while this opens a dialog to invent one. Sitting
   * inside the frame it read as another row of the vocabulary; below the frame it reads as an
   * action on the whole card, which is what it is.
   *
   * Held to the flow's content measure and centred, exactly as the chip row is — so its
   * right edge lands where it did before the move and the button has not shifted sideways,
   * only out. `self-center` works the same way it does for the vocabulary: the parent is the
   * card's own box, so a column-wide child centred in it shares the column's edges.
   *
   * The modal travels with it, still beside the answers it writes. `contents` keeps it out of
   * the layout.
   */
  const addColumnButton = (
    <div
      key="add-column"
      className="flex w-full items-center justify-end self-center"
      style={{ maxWidth: 'var(--flow-content)' }}
    >
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        text="Add custom column"
        leftSlot={{ slot: <Plus size={14} /> }}
        onClick={() => onAddingColumnChange(true)}
      />
      <div className="contents">
        <AddCustomColumnModal
          isOpen={addingColumn}
          onClose={() => onAddingColumnChange(false)}
          onAdd={({ title, defaultValue }) => {
            scrollToEnd.current = true
            onChange({
              ...answers,
              // Remembered as a field, so the tag survives being deselected later. A name that
              // is already a tag just adds the column.
              customFields:
                isVocabularyField(title) ||
                customTags.some((field) => field.title.trim().toLowerCase() === title.toLowerCase())
                  ? answers.customFields
                  : [...answers.customFields, { title, defaultValue }],
              columns: [...columns, newFieldColumn(title, defaultValue)],
            })
          }}
        />
      </div>
    </div>
  )

  /**
   * The grouping rule, above the table. Inside the same card and above the letter row, because
   * it describes what the table below it will contain — and a rule stated after its result
   * reads as an afterthought.
   */
  const groupBar = grouping ? (
    <GroupByBar
      key="group-by"
      columns={columns}
      groupBy={groupBy}
      onChange={(next) => onChange({ ...answers, groupBy: next })}
    />
  ) : null

  const wide =
    version === 'v3' || version === 'v4' || version === 'v5' || version === 'v6' || version === 'v7'

  /**
   * v8 replaces the whole step body with the column organiser (node 4911:111609), and is the
   * one version that returns before the wrapper below: that wrapper exists to give the table
   * a window wider than the content column, and the organiser is drawn to the column's own
   * 960px measure. `.flow-grid > *` already places it there (index.css), so it needs nothing
   * around it.
   *
   * Everything above is still built — `table`, `vocabulary`, `groupBar` and `addColumnButton`
   * are const bindings, not renders — so none of it costs anything here, and the earlier
   * versions keep working untouched.
   */
  if (version === 'v8') {
    return (
      /* `min-h-0`: this is the filling row of a `[data-fill]` grid (index.tsx), and a grid
         item's default `min-height: auto` would refuse to shrink below its content — the
         organiser's cap would then have nothing to bind against. */
      <div className="flex min-h-0 w-full flex-col">
        <ColumnOrganiser
          answers={answers}
          onChange={onChange}
          aggregated={aggregated}
          onAddCustomColumn={() => onAddingColumnChange(true)}
        />
        {/* The modal travels with the button that opens it in every other version; here the
            button is the organiser's, so the modal is mounted beside it instead. */}
        <AddCustomColumnModal
          isOpen={addingColumn}
          onClose={() => onAddingColumnChange(false)}
          onAdd={({ title, defaultValue }) =>
            onChange({
              ...answers,
              customFields:
                isVocabularyField(title) ||
                customTags.some((field) => sameField(field.title, title))
                  ? answers.customFields
                  : [...answers.customFields, { title, defaultValue }],
              columns: [...columns, newFieldColumn(title, defaultValue)],
            })
          }
        />
      </div>
    )
  }

  return (
    // In versions 1 and 2, `flow-full` puts this in the flow grid's wide track (index.css): the
    // table is the one thing that does not fit the content column, so it breaks out rather
    // than widening the column for every other step. Versions 3 and 4 widen the column itself
    // to 1200px instead, so this stays in the column at full width and the table shares the
    // heading's left edge at every viewport — a breakout would run edge to edge below 1248px.
    <div
      className={`${wide ? '' : 'flow-full '}flex flex-col items-end`}
      style={{
        // Overrides .flow-full's own `width: max-content` — this element is sized by the
        // window it wants onto the table, not by the table's content.
        width: wide ? '100%' : `clamp(var(--flow-content), 100%, ${TABLE_MAX_WIDTH}px)`,
        // Restated because an inline `width` at the floor would otherwise stand on a 375px
        // viewport and push the page sideways. `max-width` beats `width`, so below MIN the
        // table takes the space there is and scrolls its own content instead.
        maxWidth: '100%',
        // Card to button. The dial that names this gap ("Fields To Add Column") still drives
        // exactly the distance it is named for — the button just sits outside the frame now.
        rowGap: 'var(--fields-add-gap, 16px)',
      }}
    >
      {/* The table and its tags framed as one card. The width and grid placement stay on the
          wrapper above, so the button below shares them and lines up with the frame. */}
      <div
        className="flex w-full flex-col items-end"
        style={{
          rowGap: 'var(--fields-table-gap, 16px)',
          // Radius 12 is the design language's card radius; border-box (Preflight) keeps the
          // padding inside the width above.
          border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
          borderRadius: FOUNDATION_THEME.border.radius[12],
          padding: FOUNDATION_THEME.unit[16],
          // 8px more below the last row of chips, which otherwise reads tight against the frame.
          paddingBottom: FOUNDATION_THEME.unit[24],
        }}
      >
        {/* Versions 1 and 4 read table, then vocabulary. Versions 2 and 3 put the vocabulary
            first, so the choice comes before its result. The gap between them is
            --fields-table-gap. */}
        {groupBar}
        {version === 'v1' ||
        version === 'v4' ||
        version === 'v5' ||
        version === 'v6' ||
        version === 'v7'
          ? [table, vocabulary]
          : [vocabulary, table]}
      </div>
      {addColumnButton}
    </div>
  )
}
