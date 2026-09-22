import {
  FOUNDATION_THEME,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from '@juspay/blend-design-system'
import { CopyPlus, GripVertical, PencilLine, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { PrimitiveText, font } from '../../primitives'
import {
  aggregationOf,
  aggregationsFor,
  fieldOf,
  sameField,
  type Aggregation,
  type FieldColumn,
} from './answers'

const { colors } = FOUNDATION_THEME

/**
 * Every glyph in the row is a lucide one, and every one of them was matched against the
 * design's own export rather than by name (AGENTS.md rule 11, and the design-to-code rule
 * that a name match is not enough):
 *
 * - `GripVertical` — six dots at x 7.5/12.5, y 4.17/10/15.83 in a 20 box. The export's paths
 *   are the same six circles at the same centres.
 * - `PencilLine` — a pencil over a rule at the baseline. The export carries that second
 *   path (`M8 13.33 H14`); plain `Pencil` does not, and the rule is visible in the frame.
 * - `CopyPlus` — the duplicate. The export is a rounded square offset behind another with a
 *   `+` inside it, which is `CopyPlus` and not `Copy`: same rect, plus the two 4px strokes.
 * - `X` — `M12 4 L4 12 M4 4 L12 12`, which is lucide's X scaled to 16.
 */
const ICON_SIZE = 16

/** The grip's own hit area — 40px square, the row's full height, per node 4911:111618. */
const GRIP_BOX = 40

/** Each action button's hit area — 36px square, per node 4911:111634. */
const ACTION_BOX = 36

/**
 * The letter badge's box, and the gap that follows it — and the two move together on purpose.
 *
 * Nodes 4911:111615 and 4911:111638 are the same row drawn with a one- and a two-letter badge.
 * The badge is 20px wide in the first and 28px in the second, and in *both* the name starts at
 * x=76. So the 8px a second letter needs comes out of the gap, not out of the keyline: the
 * design lets the badge grow and holds the names still.
 *
 * That is worth stating as a rule rather than leaving to a padding class, because the column
 * runs past Z as soon as there are twenty-seven fields, and a list whose names stepped right
 * at AA would read as two lists that happened to be stacked.
 *
 * `minWidth`, not `width`, so the badge is deterministic without being a cage — a single
 * letter is a 20px square whichever letter it is (A and Z differ by most of a pixel on their
 * own), and a third letter, at 703 columns, widens the badge rather than being clipped by it.
 */
const BADGE_WIDTH = { single: 20, double: 28 }
const NAME_GAP = { single: 16, double: 8 }

const NAME = font(FOUNDATION_THEME.font.size.body.md)
const META = {
  ...font(FOUNDATION_THEME.font.size.body.sm),
  fontWeight: FOUNDATION_THEME.font.weight[400],
}
const BADGE = {
  ...font(FOUNDATION_THEME.font.size.body.sm),
  fontWeight: FOUNDATION_THEME.font.weight[500],
}

/**
 * A round-cornered icon button — the ✕ and the duplicate.
 *
 * Not a `ButtonV2` with `subType={ICON_ONLY}`: that one draws a bordered secondary control
 * at every size, and the design has a bare glyph in a hit area. Tailwind's Preflight has
 * already stripped `<button>` to transparent with no border (rule 12), so what is left here
 * is the hit area, the hover and the tint.
 */
function RowAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="organiser-action flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent"
      style={{ width: ACTION_BOX, height: ACTION_BOX }}
    >
      {icon}
    </button>
  )
}

/**
 * One column, as a card in the organiser — node 4911:111615.
 *
 * Reads left to right as: where it goes (the grip and the letter), what it is (the name, and
 * what it came from), and what you can do to it (aggregate, duplicate, remove). The row is
 * `justify-between`, so those two halves hold the card's two edges however long the name is.
 */
export function OrganiserRow({
  column,
  letter,
  grouped,
  showAggregation,
  dragging,
  handleProps,
  onRename,
  onAggregate,
  onDuplicate,
  onRemove,
}: {
  column: FieldColumn
  /** The column's position, as a spreadsheet label — see `columnLetter`. */
  letter: string
  /** Whether the report groups by this column, which is what replaces its aggregation. */
  grouped: boolean
  /**
   * Whether to draw the aggregation select at all. False until the report groups by
   * something: with one row per record there is nothing to roll up, and a COUNT beside every
   * column would be answering a question nobody has asked yet.
   */
  showAggregation: boolean
  dragging: boolean
  handleProps: React.HTMLAttributes<HTMLElement> & { style?: CSSProperties }
  onRename: (title: string) => void
  onAggregate: (aggregate: Aggregation) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(column.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [editing])

  const startEditing = () => {
    setDraft(column.title)
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    // A blank name would give the report a nameless header, so an empty field is a cancel
    // rather than a rename — the same rule the table's own inline edit applies.
    const next = draft.trim()
    if (next !== '' && next !== column.title) onRename(next)
  }

  /**
   * The origin line — `represents "Gateway"`.
   *
   * Only once the column has been renamed away from the field it came from, which is what
   * `source` records (answers.ts). Before that the name *is* the field and the line would be
   * a tautology; after it, it is the only thing left saying where the column's data comes
   * from. The curly quotes are the design's.
   */
  const origin = fieldOf(column)
  const renamed = !sameField(origin, column.title)

  /** Past Z — see BADGE_WIDTH. Both halves of the row's left edge read this one flag. */
  const size = letter.length > 1 ? 'double' : 'single'

  const options = aggregationsFor(origin)

  return (
    <div
      data-organiser-row
      data-dragging={dragging || undefined}
      className="organiser-row relative flex items-center justify-between"
      style={{
        backgroundColor: colors.gray[0],
        border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
        // Rows are pulled together so their borders collapse into one hairline — the design
        // draws a single frame around the list, not a stack of separate cards. The first and
        // last rows take the frame's radius; see ColumnOrganiser.
        marginBottom: -1,
      }}
    >
      <div className="flex min-w-0 items-center">
        <span
          {...handleProps}
          role="button"
          tabIndex={0}
          aria-label={`Reorder ${column.title}. Use the arrow keys to move it.`}
          title="Drag to reorder"
          className="flex shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
          style={{ width: GRIP_BOX, height: GRIP_BOX, ...handleProps.style }}
        >
          <GripVertical size={ICON_SIZE} color={colors.gray[400]} />
        </span>

        {/* The column's position, not its identity — A is the leftmost slot whatever ends up
            in it. Same letters the v1 table draws above its headers. */}
        <span
          aria-hidden
          className="flex shrink-0 items-center justify-center"
          style={{
            ...BADGE,
            height: 20,
            minWidth: BADGE_WIDTH[size],
            // No horizontal padding: the width above is the whole of the box, and padding on
            // top of it would make a single letter's badge wider than the design's 20.
            padding: '2px 0',
            color: colors.gray[500],
            backgroundColor: colors.gray[50],
            border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[150]}`,
            borderRadius: FOUNDATION_THEME.border.radius[6],
          }}
        >
          {letter}
        </span>

        <div
          className="flex min-w-0 items-baseline gap-1"
          style={{ paddingLeft: NAME_GAP[size] }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commit()
                if (event.key === 'Escape') setEditing(false)
              }}
              aria-label={`Rename ${column.title}`}
              className="min-w-0 rounded border bg-transparent px-1 outline-none"
              style={{
                ...NAME,
                color: colors.gray[900],
                borderColor: colors.gray[300],
                // Sized to the text it replaces, so committing a rename does not jump the row.
                width: `${Math.max(draft.length, 8) + 2}ch`,
              }}
            />
          ) : (
            <>
              <PrimitiveText
                as="span"
                {...NAME}
                color={colors.gray[900]}
                style={{ whiteSpace: 'nowrap' }}
              >
                {column.title}
              </PrimitiveText>
              {renamed && (
                <PrimitiveText
                  as="span"
                  {...META}
                  color={colors.gray[500]}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {`represents “${origin}”`}
                </PrimitiveText>
              )}
              {/* Hidden until the row is hovered or something in it has focus — the rule is
                  in index.css, because opacity has to answer to `:hover` on the row rather
                  than to a state this component would otherwise have to hold. Focus is in
                  that rule too, so tabbing to it still reveals it. */}
              <button
                type="button"
                onClick={startEditing}
                aria-label={`Rename ${column.title}`}
                title="Rename"
                className="organiser-edit flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0"
              >
                <PencilLine size={ICON_SIZE} color={colors.gray[400]} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        {grouped ? (
          /* The grouped column has no aggregation to choose — it is the thing being grouped
             by, so there is nothing to roll up. The design states that in the slot the select
             would have taken, rather than leaving a gap the eye has to account for.

             The same subtle purple chip the Grouping step lit when the field was picked, so
             the mark a user made one step ago is the mark they find here. Rendered without an
             `onClick`, which is what makes TagV2 draw a Block instead of a PrimitiveButton
             (TagV2.tsx:53) — this states a fact about the row, it is not a second control. */
          <span className="pr-2">
            <TagV2
              text="Grouped by"
              size={TagV2Size.SM}
              subType={TagV2SubType.SQUARICAL}
              color={TagV2Color.PURPLE}
              type={TagV2Type.SUBTLE}
            />
          </span>
        ) : (
          showAggregation && (
            <SingleSelectV2
              placeholder="COUNT"
              selected={aggregationOf(column)}
              onSelect={(value) => onAggregate(value as Aggregation)}
              items={[{ items: options.map((option) => ({ label: option, value: option })) }]}
              size={SingleSelectV2Size.SM}
              // The design's "noContainer": no border, no fill. `inline` on top of it drops
              // the padding and the 32px floor as well, which is what leaves the label
              // sitting on the row's own baseline beside the icons.
              variant={SingleSelectV2Variant.NO_CONTAINER}
              inline
              menuDimensions={{ minWidth: 140 }}
              aria-label={`Aggregation for ${column.title}`}
            />
          )
        )}
        <RowAction
          label={`Duplicate ${column.title}`}
          icon={<CopyPlus size={ICON_SIZE} color={colors.gray[400]} />}
          onClick={onDuplicate}
        />
        <RowAction
          label={`Remove ${column.title}`}
          icon={<X size={ICON_SIZE} color={colors.gray[500]} />}
          onClick={onRemove}
        />
      </div>
    </div>
  )
}
