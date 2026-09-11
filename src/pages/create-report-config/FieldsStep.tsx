import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from '@juspay/blend-design-system'
import { ChevronLeft, ChevronRight, GripVertical, Pencil, Plus, Trash } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { PrimitiveText, font } from '../../primitives'
import type { FieldsLayoutVersion } from './fields-layout'
import { FIELD_TAGS, isFieldSelected,
  isVocabularyField, newFieldColumn, type FieldsAnswers } from './answers'

const { colors } = FOUNDATION_THEME

/**
 * The remove glyph on a lit tag — a plain bin, since clicking it takes the column out of the
 * table. `Trash` rather than `Trash2`: at 12px the second one's inner strokes blur into a
 * filled shape.
 *
 * gray[0], not inherited: ATTENTIVE/NEUTRAL paints its label gray[0] on a gray[950] chip
 * (tagV2.light.tokens.ts), so a currentColor glyph would be near-black on near-black.
 */
const REMOVE_TAG_SLOT = { slot: <Trash size={12} color={colors.gray[0]} /> }

/** Fixed tracks, per the design: 222px per column. */
const COLUMN_WIDTH = 222

/**
 * Row heights are set, not left to the content.
 *
 * 46/56/56 are the design's own row heights (node 4418:13411) — and they are heights in the
 * CSS sense here, borders included, because Tailwind's Preflight sets border-box globally
 * while Figma's auto-layout measures inside the stroke.
 */
const HEADER_HEIGHT = 46

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
 *
 * The five default columns measure 5 x COLUMN_WIDTH = 1110, which sits inside this range:
 * a fresh flow shows all five with no scrollbar on a wide screen, and starts clipping as
 * the window narrows towards the floor.
 */
const TABLE_MAX_WIDTH = 1200

/** How far the clipped edge fades out to signal there is more table past it. */
const EDGE_FADE = 40

/** Scrollbar colours for index.css, which cannot read a JS token itself (rule 1). */
const SCROLLBAR = {
  '--table-scroll-track': colors.gray[50],
  '--table-scroll-thumb': colors.gray[300],
  '--table-scroll-thumb-hover': colors.gray[400],
} as CSSProperties
const RULE = `1px solid ${colors.gray[150]}`

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
 * The header cell's title, which becomes an input on click.
 *
 * blend-gap: no inline-editable table header. TextInputV2 is the nearest component but
 * carries its own label slot and container height, which cannot fit the design's 46px
 * header row — so the input is drawn here and styled to match the text it replaces.
 * Committing on blur and Enter, abandoning on Escape.
 */
/**
 * Editing is controlled from the header rather than owned here, because two things open it:
 * the title itself, and the pencil beside it. One `editing` flag in the parent is what keeps
 * those two in agreement — a second, internal source of truth would let the pencil open a
 * field the title thinks is closed.
 *
 * The draft stays local: it is scratch text that only matters while the field is open, and
 * it is seeded from `title` on the way in.
 */
function EditableTitle({
  title,
  onCommit,
  editing,
  onEditingChange,
}: {
  title: string
  onCommit: (next: string) => void
  editing: boolean
  onEditingChange: (editing: boolean) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  // Adjust-state-while-rendering (AGENTS.md rule 14's shape, for state rather than motion):
  // seeding the draft in an effect would render one frame of an empty input first.
  if (editing && draft === null) setDraft(title)
  if (!editing && draft !== null) setDraft(null)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        title="Rename column"
        className="flex-1 cursor-text overflow-hidden border-none bg-transparent p-0 text-left text-ellipsis whitespace-nowrap"
        style={{
          ...font(FOUNDATION_THEME.font.size.body.sm),
          fontWeight: FOUNDATION_THEME.font.weight[600],
          color: colors.gray[400],
        }}
      >
        {title}
      </button>
    )
  }

  const commit = () => {
    // An all-whitespace name would leave a nameless header, so it reverts instead.
    onCommit((draft ?? '').trim() === '' ? title : (draft ?? '').trim())
    onEditingChange(false)
  }

  return (
    <input
      autoFocus
      value={draft ?? title}
      aria-label="Column name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') onEditingChange(false)
      }}
      className="w-full min-w-0 flex-1 border-none bg-transparent p-0 outline-none"
      style={{
        ...font(FOUNDATION_THEME.font.size.body.sm),
        fontWeight: FOUNDATION_THEME.font.weight[600],
        color: colors.gray[700],
      }}
    />
  )
}

/**
 * Step 3 — the report's columns, drawn as the table they will become.
 *
 * Laid out as a row of column stacks rather than a `<table>`: every control here is
 * per-column (rename, delete) and the letter rail sits outside the card, both of which a
 * table's row-major markup fights. Widths are fixed, so the table simply grows wider as
 * columns are added and scrolls inside its own container.
 */
export function FieldsStep({
  answers,
  onChange,
  version = 'v1',
}: {
  answers: FieldsAnswers
  onChange: (next: FieldsAnswers) => void
  /** Which arrangement to draw — see FieldsLayoutDials. Defaults to the original. */
  version?: FieldsLayoutVersion
}) {
  const { columns } = answers
  const setColumns = (next: typeof columns) => onChange({ columns: next })

  /**
   * Which column's name is open for editing, by id — one at a time, and lifted here because
   * two controls open it (the title and the pencil beside it) and a third closes it
   * (committing). Keyed on id rather than index so a reorder mid-edit does not move the
   * open field to a different column.
   */
  const [editingId, setEditingId] = useState<string | null>(null)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  /**
   * Which edges are currently cutting content off. Only those fade — a fade on an edge with
   * nothing past it would promise a column that is not there.
   */
  const scrollRef = useRef<HTMLDivElement>(null)
  /** Ties version 3's arrows to the scroller they move, for assistive tech. */
  const scrollerId = useId()
  const [clipped, setClipped] = useState({ left: false, right: false })

  const syncClipped = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const furthest = el.scrollWidth - el.clientWidth
    // A pixel of slack: fractional scroll offsets otherwise leave the end fade on forever.
    setClipped({ left: el.scrollLeft > 1, right: el.scrollLeft < furthest - 1 })
  }, [])

  // Re-measured on resize as well as on scroll, since the container narrowing can clip an
  // edge without the scroll position moving at all.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    syncClipped()
    const observer = new ResizeObserver(syncClipped)
    observer.observe(el)
    return () => observer.disconnect()
  }, [syncClipped, columns.length])

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
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({
      left: el.scrollWidth,
      // The scroll is the whole point — it is what shows you where the column landed — so
      // reduced motion gets the jump rather than nothing.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [columns])

  /** New columns always land on the right, so appending is always worth scrolling to. */
  const appendColumn = (title?: string) => {
    scrollToEnd.current = true
    setColumns([...columns, newFieldColumn(title)])
  }

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= columns.length) return
    const next = [...columns]
    next.splice(to, 0, ...next.splice(from, 1))
    setColumns(next)
  }

  const endDrag = () => {
    setDragIndex(null)
    setOverIndex(null)
  }


  /** The table, with its letter rail. Keyed so a version switch reorders it rather than
      remounting it — it keeps its scroll position and any column mid-rename. */
  /**
   * Version 3's arrows. Steps by whole columns — one fewer than fit, so the column at the
   * leading edge stays in view as context — and lands on a column boundary, so the table never
   * rests with a header cut in half. The browser clamps the far ends. Smooth unless the user
   * prefers reduced motion.
   */
  const scrollColumns = (direction: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const page = Math.max(1, Math.floor(el.clientWidth / COLUMN_WIDTH) - 1) * COLUMN_WIDTH
    const from = Math.round(el.scrollLeft / COLUMN_WIDTH) * COLUMN_WIDTH
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: from + direction * page, behavior: reduce ? 'auto' : 'smooth' })
  }

  /**
   * Version 3's scroll controls, top right of the table. Disabled at either end rather than
   * hidden, so the pair never jumps in and out as columns are added — when every column fits,
   * both rest disabled. `clipped` is the same state that drives the edge fades.
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
    // The key sits on this wrapper, not the scroller, so switching versions reorders the
    // block without remounting the scroller — and the arrows' slot before it is always
    // present (as `false` when hidden), so it keeps its place and its scroll position.
    <div key="table" className="flex w-full flex-col gap-2">
      {version === 'v3' && tableArrows}
      <div
        id={scrollerId}
        ref={scrollRef}
        onScroll={syncClipped}
        className="fields-table w-full"
        style={
          {
            ...SCROLLBAR,
            '--fade-left': clipped.left ? `${EDGE_FADE}px` : '0px',
            '--fade-right': clipped.right ? `${EDGE_FADE}px` : '0px',
          } as CSSProperties
        }
      >
        {columns.length === 0 ? (
          // Same height as the full table — letter rail included — so clearing does not
          // yank the tag row up 56px and put a different tag under the cursor.
          <div
            className="flex w-full items-center justify-center"
            style={{ height: 158, border: RULE, borderRadius: 12 }}
          >
            <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[400]}>
              No columns yet — pick a field below, or add a custom column.
            </PrimitiveText>
          </div>
        ) : (
          <div className="flex w-max">
            {columns.map((column, index) => {
              const first = index === 0
              const last = index === columns.length - 1
              const isDropTarget = overIndex === index && dragIndex !== null && dragIndex !== index
              return (
                <div
                  key={column.id}
                  data-column
                  className="group flex flex-col"
                  style={{
                    width: COLUMN_WIDTH,
                    opacity: dragIndex === index ? 0.4 : 1,
                  }}
                  onDragOver={(event) => {
                    if (dragIndex === null) return
                    // Without preventDefault the browser refuses the drop outright.
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setOverIndex(index)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragIndex !== null) move(dragIndex, index)
                    endDrag()
                  }}
                >
                  <div className="flex h-14 items-center justify-center">
                    <PrimitiveText
                      {...font(FOUNDATION_THEME.font.size.body.md)}
                      color={colors.gray[400]}
                    >
                      {columnLetter(index)}
                    </PrimitiveText>
                  </div>

                  {/* The card's outer edges belong to whichever columns are on the ends, so
                    the rightmost one carries the right rule and both right corners. */}
                  <div
                    className="flex items-center gap-1.5 px-4"
                    style={{
                      height: HEADER_HEIGHT,
                      backgroundColor: isDropTarget ? colors.primary[50] : colors.gray[25],
                      borderTop: RULE,
                      borderLeft: RULE,
                      borderBottom: RULE,
                      borderRight: last ? RULE : undefined,
                      borderTopLeftRadius: first ? 12 : undefined,
                      borderTopRightRadius: last ? 12 : undefined,
                      transition: 'background-color var(--flow-feedback) var(--flow-feedback-ease)',
                    }}
                  >
                    {/* The handle is what drags, not the whole header — the title beside it has
                      to stay clickable to rename. Arrow keys move the column too, since native
                      drag and drop is mouse-only. */}
                    <button
                      type="button"
                      draggable
                      aria-label={`Reorder ${column.title}`}
                      className="flex cursor-grab items-center border-none bg-transparent p-0 active:cursor-grabbing"
                      onDragStart={(event) => {
                        setDragIndex(index)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', column.id)
                        // Drag the whole column, not the 14px grip that started it.
                        const stack = event.currentTarget.closest('[data-column]')
                        if (stack) event.dataTransfer.setDragImage(stack, 24, 24)
                      }}
                      onDragEnd={endDrag}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowLeft') move(index, index - 1)
                        if (event.key === 'ArrowRight') move(index, index + 1)
                      }}
                    >
                      <GripVertical size={14} color={colors.gray[400]} />
                    </button>
                    <EditableTitle
                      title={column.title}
                      editing={editingId === column.id}
                      onEditingChange={(editing) => setEditingId(editing ? column.id : null)}
                      onCommit={(title) =>
                        setColumns(columns.map((c) => (c.id === column.id ? { ...c, title } : c)))
                      }
                    />
                    {/* Persistent, not hover-revealed: the affordance is the same on every
                        header at rest, so renaming does not depend on discovering that a
                        control appears under the pointer. It duplicates the title's own
                        click rather than adding a second behaviour — two ways into the same
                        edit, which is why both drive the one `editingId`. */}
                    <button
                      type="button"
                      aria-label={`Rename ${column.title}`}
                      title="Rename column"
                      onClick={() => setEditingId(column.id)}
                      className="flex cursor-pointer items-center border-none bg-transparent p-0"
                    >
                      <Pencil size={14} color={colors.gray[400]} />
                    </button>
                  </div>

                  <div
                    className="flex h-14 items-center px-4"
                    style={{
                      borderLeft: RULE,
                      borderBottom: RULE,
                      borderRight: last ? RULE : undefined,
                      borderBottomLeftRadius: first ? 12 : undefined,
                      borderBottomRightRadius: last ? 12 : undefined,
                    }}
                  >
                    {/* The design's empty-value placeholder: a rule where data will sit. */}
                    <div
                      style={{
                        height: 1,
                        width: 140,
                        backgroundColor: colors.gray[200],
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  /**
   * Columns no vocabulary tag stands for — the ones made with "Add custom column". Derived
   * from `columns`, not stored: rename one to a vocabulary name and it lights that tag
   * instead of keeping its own.
   */
  const customColumns = columns.filter(({ title }) => !isVocabularyField(title))

  /** Keyed and removed by id rather than title: two custom columns can both be "<Title>". */
  const customTag = (column: (typeof columns)[number]) => (
    <TagV2
      key={column.id}
      text={column.title}
      size={TagV2Size.SM}
      subType={TagV2SubType.ROUNDED}
      color={TagV2Color.NEUTRAL}
      type={TagV2Type.ATTENTIVE}
      aria-pressed={true}
      title={`Remove ${column.title} from the table`}
      rightSlot={REMOVE_TAG_SLOT}
      onClick={() => setColumns(columns.filter(({ id }) => id !== column.id))}
    />
  )

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
    <div
      key="vocabulary"
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
              size={TagV2Size.SM}
              subType={TagV2SubType.ROUNDED}
              color={TagV2Color.NEUTRAL}
              type={selected ? TagV2Type.ATTENTIVE : TagV2Type.NO_FILL}
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
        {customColumns.length > 0 && (
          <span className="flex items-center gap-x-3">
            {/* blend-gap: Blend 0.0.37 ships no divider or separator component, so this is a
                1px rule on a token colour. */}
            <span
              role="separator"
              aria-orientation="vertical"
              className="h-4 w-px"
              style={{ backgroundColor: colors.gray[300] }}
            />
            {customTag(customColumns[0])}
          </span>
        )}
        {customColumns.slice(1).map((column) => customTag(column))}
      </div>

      {/* Below the vocabulary, on the tags' own left edge. The two are one gesture read top
          to bottom: pick a column that exists, or — if none of them is what you want — make
          one. */}
      <div className="flex w-full items-center">
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Add custom column"
          leftSlot={{ slot: <Plus size={14} /> }}
          onClick={() => appendColumn()}
        />
      </div>
    </div>
  )

  return (
    // In versions 1 and 2, `flow-full` puts this in the flow grid's wide track (index.css): the
    // table is the one thing that does not fit the content column, so it breaks out rather
    // than widening the column for every other step. Version 3 widens the column itself to
    // 1200px instead, so this stays in the column at full width and the table shares the
    // heading's left edge at every viewport — a breakout would run edge to edge below 1248px.
    <div
      className={`${version === 'v3' ? '' : 'flow-full '}flex flex-col items-end`}
      style={{
        // Overrides .flow-full's own `width: max-content` — this element is sized by the
        // window it wants onto the table, not by the table's content.
        width:
          version === 'v3' ? '100%' : `clamp(var(--flow-content), 100%, ${TABLE_MAX_WIDTH}px)`,
        // Restated because an inline `width` at the floor would otherwise stand on a 375px
        // viewport and push the page sideways. `max-width` beats `width`, so below MIN the
        // table takes the space there is and scrolls its own content instead.
        maxWidth: '100%',
        rowGap: 'var(--fields-table-gap, 16px)',
      }}
    >
      {/* Version 1 reads table, then vocabulary. Versions 2 and 3 put the vocabulary first,
          so the choice comes before its result. The gap between them is --fields-table-gap. */}
      {version === 'v1' ? [table, vocabulary] : [vocabulary, table]}
    </div>
  )
}
