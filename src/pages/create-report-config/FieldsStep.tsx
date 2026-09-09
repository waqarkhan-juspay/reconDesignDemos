import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from '@juspay/blend-design-system'
import { Eraser, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { PrimitiveText, font } from '../../primitives'
import { FIELD_TAGS, isFieldSelected, newFieldColumn, type FieldsAnswers } from './answers'

const { colors } = FOUNDATION_THEME

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
 * The table stops growing here and scrolls instead.
 *
 * 1110 is 5 x COLUMN_WIDTH — the five default columns to the pixel, so a fresh flow shows
 * the whole table with no scrollbar and no fade, and both appear the moment a sixth column
 * is added. Keep the two in step if the column width ever moves.
 */
const TABLE_MAX_WIDTH = COLUMN_WIDTH * 5

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
function EditableTitle({ title, onCommit }: { title: string; onCommit: (next: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(title)}
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
    onCommit(draft.trim() === '' ? title : draft.trim())
    setDraft(null)
  }

  return (
    <input
      autoFocus
      value={draft}
      aria-label="Column name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') setDraft(null)
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
}: {
  answers: FieldsAnswers
  onChange: (next: FieldsAnswers) => void
}) {
  const { columns } = answers
  const setColumns = (next: typeof columns) => onChange({ columns: next })

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  /**
   * Which edges are currently cutting content off. Only those fade — a fade on an edge with
   * nothing past it would promise a column that is not there.
   */
  const scrollRef = useRef<HTMLDivElement>(null)
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

  return (
    <div
      className="mx-auto flex w-full flex-col items-end gap-4"
      style={{ maxWidth: TABLE_MAX_WIDTH }}
    >
      <div
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
                      onCommit={(title) =>
                        setColumns(columns.map((c) => (c.id === column.id ? { ...c, title } : c)))
                      }
                    />
                    {/* Every column is deletable, the last one included. It used to be held
                      back on the grounds that a report with no columns is not a state the
                      rest of the flow can do anything with — but Clear all reaches that
                      state in one click, so refusing it one column at a time would only be
                      inconsistent. The flow already handles it: `isFieldsComplete` fails on
                      an empty set, so Continue disables and the later steps relock. */}
                    {/* Revealed on hover or keyboard focus of the column, so a row of
                        trash icons is not sitting in the header at rest. Utilities rather
                        than a rule in index.css: this is our own markup, so nothing from
                        Blend competes for the property — which is not true of the Blend
                        controls, where a layered utility loses to styled-components.
                        `group-focus-within` keeps it reachable by keyboard, where there is
                        no hover. Timings still come from the flow root's custom properties,
                        so src/motion.ts stays the only place a duration is written. */}
                    <button
                      type="button"
                      aria-label={`Delete ${column.title}`}
                      onClick={() => setColumns(columns.filter((c) => c.id !== column.id))}
                      className="pointer-events-none flex cursor-pointer items-center border-none bg-transparent p-0 opacity-0 transition-opacity duration-[var(--flow-feedback)] ease-[var(--flow-feedback-ease)] group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 motion-reduce:transition-none"
                    >
                      <Trash2 size={14} color={colors.gray[400]} />
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

      {/* Outside the scroll container on purpose. In the design the + lives in a gutter at
          the far right of the header, which is the first thing to scroll out of sight once
          the table outgrows 1100px — precisely when you are most likely to want it. Out
          here it holds its place however far the table is scrolled.

          Clear all sits beside it, between the table it empties and the tags it unlights,
          which is the one place it is legible as acting on both. */}
      <div className="flex items-center gap-2">
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Clear all"
          leftSlot={{ slot: <Eraser size={14} /> }}
          // Nothing to clear is not an error worth explaining, so the control simply goes
          // quiet rather than emptying an empty table.
          disabled={columns.length === 0}
          onClick={() => setColumns([])}
        />
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Add custom column"
          leftSlot={{ slot: <Plus size={14} /> }}
          onClick={() => appendColumn()}
        />
      </div>

      {/* The field vocabulary — node 4457:15485. Every tag is a toggle: a pale one adds its
          column to the table, a dark one removes it again, and the ✕ is what says so.

          The whole tag is the control rather than just the ✕, because TagV2 renders as a
          single <button> once it is given an onClick — a second button nested inside that
          one is invalid markup, and the browser resolves it by ignoring the inner one. */}
      <div className="flex w-full flex-wrap items-start gap-3">
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
              rightSlot={
                selected
                  ? {
                      // gray[0], not inherited: ATTENTIVE/NEUTRAL paints its label gray[0]
                      // on a gray[950] chip (tagV2.light.tokens.ts), so a currentColor ✕
                      // would be near-black on near-black. The design exports most of these
                      // glyphs at gray[400], which is the same mistake in a file.
                      slot: <X size={12} color={colors.gray[0]} />,
                    }
                  : undefined
              }
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
      </div>
    </div>
  )
}
