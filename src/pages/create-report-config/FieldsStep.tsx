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
import { ChevronLeft, ChevronRight, Hash, Plus, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { PrimitiveText, font } from '../../primitives'
import { fieldTagTokens } from '../../theme'
import { AddCustomColumnModal } from './AddCustomColumnModal'
import { GroupByBar } from './GroupByBar'
import type { FieldsLayoutVersion } from './fields-layout'
import { activeGroupBy, FIELD_TAGS, isFieldSelected,
  isVocabularyField, newFieldColumn, type FieldColumn, type FieldsAnswers } from './answers'

const { colors } = FOUNDATION_THEME

/**
 * Blend's type tokens are unitless numbers; CSS variables need the unit. Typed loosely
 * because Blend types them as CSSObject values, which include undefined.
 */
const px = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value

/**
 * The remove glyph on a lit tag — the same 12px `X` Blend draws on its own dismissible tags
 * (Tags/accessibility/TagAccessibility.tsx:381), so it reads as Blend's close affordance.
 *
 * gray[0], not inherited: ATTENTIVE/NEUTRAL paints its label gray[0] on a gray[950] chip
 * (tagV2.light.tokens.ts), so a currentColor glyph would be near-black on near-black.
 */
const REMOVE_TAG_SLOT = { slot: <X size={12} color={colors.gray[0]} /> }

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
const FIELD_HASH_SLOT = { slot: <Hash size={12} color={colors.gray[0]} /> }

/** The chip props that differ between the shipped chips and version 6's. */
const TAG_SHAPE = {
  current: { size: TagV2Size.SM, subType: TagV2SubType.ROUNDED, offType: TagV2Type.NO_FILL },
  v6: { size: TagV2Size.MD, subType: TagV2SubType.SQUARICAL, offType: TagV2Type.SUBTLE },
} as const

/**
 * Fixed tracks, per the design: 222px per column. Handed to DataTable as both `minWidth` and
 * `maxWidth` — its column styles set `width: auto` between the two (utils.ts getColumnStyles),
 * so pinning both ends is what holds a column at one width.
 */
const COLUMN_WIDTH = 222

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

/**
 * Empty rows — the table previews columns, not data. Enough of them that the body reads as a
 * table: DataTable draws a rule between rows, and one row has no "between".
 */
const PLACEHOLDER_ROW_COUNT = 3

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
function orderColumns(columns: FieldColumn[], groupedIds: readonly string[]) {
  if (groupedIds.length === 0) return columns
  return [
    ...groupedIds.flatMap((id) => columns.filter((column) => column.id === id)),
    ...columns.filter((column) => !groupedIds.includes(column.id)),
  ]
}

/**
 * Blank on purpose. A renderCell is required rather than just leaving the value out:
 * DataTable draws its own "-" for an empty value, and only a renderCell skips that.
 */
const emptyCell = () => null

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
  version = 'v1',
  addingColumn,
  onAddingColumnChange,
}: {
  answers: FieldsAnswers
  onChange: (next: FieldsAnswers) => void
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
        renderCell: emptyCell,
      })),
    [displayColumns],
  )

  const tableData = useMemo<FieldRow[]>(
    () => Array.from({ length: PLACEHOLDER_ROW_COUNT }, (_, index) => ({ id: `row-${index}` })),
    [],
  )

  /**
   * DataTable's own scroll container. It exposes no ref, so it is found the way DataTable
   * finds it itself — the `<table>`'s parent (TableHeader/index.tsx:1185-1186).
   */
  const wrapperRef = useRef<HTMLDivElement>(null)
  const getScroller = () =>
    wrapperRef.current?.querySelector('table')?.parentElement ?? null

  /** Ties version 3's arrows to the table they move, for assistive tech. */
  const scrollerId = useId()

  /**
   * Which edges are currently cutting content off. Only those fade — a fade on an edge with
   * nothing past it would promise a column that is not there — and version 3's arrows disable
   * against the same state.
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
  }, [syncTable, columns.length])

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
   * Version 3's arrows. Steps by whole columns — one fewer than fit, so the column at the
   * leading edge stays in view as context — and lands on a column boundary, so the table never
   * rests with a header cut in half. The browser clamps the far ends. Smooth unless the user
   * prefers reduced motion.
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
   * Version 3's scroll controls, top right of the table. Disabled at either end rather than
   * hidden, so the pair never jumps in and out as columns are added — when every column fits,
   * both rest disabled.
   */
  const tableArrows = (
    <div className="flex items-center justify-end gap-2">
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
      {version === 'v3' && tableArrows}
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
                      groupBy.includes(column.id) ? colors.primary[600] : colors.gray[400]
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
            className="flex w-full items-center justify-center"
            style={{ height: LETTER_ROW_HEIGHT + TABLE_HEIGHT, border: EMPTY_FRAME, borderRadius: FOUNDATION_THEME.border.radius[12] }}
          >
            <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[400]}>
              No columns yet — pick a field below, or add a custom column.
            </PrimitiveText>
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
    </div>
  )

  /**
   * The custom vocabulary: every field made with "Add custom column", plus any column renamed
   * to something no tag stands for (it has no stored field, so it is picked up from `columns`).
   * One tag per name — matched the same case-insensitive way as the vocabulary.
   */
  const customTags = [
    ...answers.customFields,
    ...columns
      .filter(({ title }) => !isVocabularyField(title))
      .map(({ title, defaultValue }) => ({ title, defaultValue })),
  ].filter(
    (field, index, all) =>
      all.findIndex((other) => other.title.trim().toLowerCase() === field.title.trim().toLowerCase()) ===
      index,
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
        leftSlot={selected && newChips ? FIELD_HASH_SLOT : undefined}
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
                columns: columns.filter(
                  ({ title }) => title.trim().toLowerCase() !== field.title.trim().toLowerCase(),
                ),
              })
            : appendColumn(field.title, field.defaultValue)
        }
      />
    )
  }

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
          one is invalid markup, and the browser resolves it by ignoring the inner one. */}
      <div
        className="flex w-full flex-wrap items-start gap-x-3"
        style={{ rowGap: 'var(--fields-tag-row-gap, 12px)' }}
      >
        {FIELD_TAGS.map((tag) => {
          const selected = isFieldSelected(columns, tag)

          return (
            <TagV2
              key={tag}
              text={tag}
              size={shape.size}
              subType={shape.subType}
              color={TagV2Color.NEUTRAL}
              type={selected ? TagV2Type.ATTENTIVE : shape.offType}
              leftSlot={selected && newChips ? FIELD_HASH_SLOT : undefined}
              aria-pressed={selected}
              title={selected ? `Remove ${tag} from the table` : `Add ${tag} to the table`}
              rightSlot={selected ? REMOVE_TAG_SLOT : undefined}
              onClick={() =>
                selected
                  ? setColumns(
                      columns.filter(
                        ({ title }) => title.trim().toLowerCase() !== tag.toLowerCase(),
                      ),
                    )
                  : appendColumn(tag)
              }
            />
          )
        })}

        {/* Custom columns get a tag of their own, lit, after the vocabulary — so a column made
            with "Add custom column" shows up here and can be removed like any other — set off
            by a rule that only exists once there is something on its far side.

            The rule and the first custom tag wrap as one unit. Loose in the flex-wrap row,
            the rule could end a line on its own with the custom tags starting the next,
            dividing nothing. */}
        {customTags.length > 0 && (
          <span className="flex items-center gap-x-3">
            {/* blend-gap: Blend 0.0.37 ships no divider or separator component, so this is a
                1px rule on a token colour. */}
            <span
              role="separator"
              aria-orientation="vertical"
              className="h-4 w-px"
              style={{ backgroundColor: colors.gray[300] }}
            />
            {customTag(customTags[0])}
          </span>
        )}
        {customTags.slice(1).map((field) => customTag(field))}

        {/* Last in the row, so it reads as acting on every tag before it. INLINE is Blend's
            link button — no padding or fill — and SECONDARY keeps it neutral (gray[600]) so it
            doesn't compete with the tags. Only there when there is something to clear.

            The underline is on the wrapper because ButtonV2 omits className; it targets the
            label (`[data-id]`) rather than the button, since a flex item doesn't reliably
            inherit a parent's text-decoration. Keyboard focus gets it too.

            Type is the chips' own: TagV2 sm reads font.fontSize[12] / font.lineHeight[18]
            (tagV2.light.tokens.ts:162,175), where a small ButtonV2 would be 14px. No ButtonV2
            prop reaches its label's size, so the tokens are handed to the label as variables.
            Weight needs nothing — both are already 500. */}
        {/* Deselects everything, custom tags included — but custom tags stay in the row, pale,
            because customFields outlives the columns. */}
        {columns.length > 0 && (
          <span
            className="flex self-center [&_[data-id]]:!text-[length:var(--link-size)] [&_[data-id]]:!leading-[var(--link-leading)] [&_button:focus-visible_[data-id]]:underline [&_button:hover_[data-id]]:underline"
            style={
              {
                '--link-size': px(FOUNDATION_THEME.font.fontSize[12]),
                '--link-leading': px(FOUNDATION_THEME.font.lineHeight[18]),
              } as CSSProperties
            }
          >
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.SMALL}
              subType={ButtonV2SubType.INLINE}
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
          </span>
        )}
      </div>

      {/* The "Add custom column" button lives in the step heading (index.tsx) — except in
          version 5, which draws it here, below the chips on the table's right edge. The modal
          stays here either way, beside the answers it writes. */}
      {version === 'v5' && (
        <div className="flex w-full items-center justify-end">
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            text="Add custom column"
            leftSlot={{ slot: <Plus size={14} /> }}
            onClick={() => onAddingColumnChange(true)}
          />
        </div>
      )}
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
    </ThemeProvider>
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
    version === 'v3' ||
    version === 'v4' ||
    version === 'v5' ||
    version === 'v6' ||
    version === 'v7'

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
        rowGap: 'var(--fields-table-gap, 16px)',
        // The table and its tags framed as one card. Radius 12 is the design language's card
        // radius; border-box (Preflight) keeps the padding inside the width above.
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
  )
}
