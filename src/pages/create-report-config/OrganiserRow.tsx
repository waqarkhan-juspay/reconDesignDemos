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
  TooltipV2,
  TooltipV2Align,
  TooltipV2Side,
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

/**
 * The least room between the row's two halves — the name and its note on the left, the
 * aggregation and the actions on the right. `justify-between` already holds them at the
 * card's edges; this is what stops a long name running up against COUNT when it does not.
 */
const HALF_GAP = 16

/**
 * The least of a renamed column's name that stays on screen — a few letters and the
 * ellipsis, enough to tell two renamed rows apart.
 *
 * The note does not shrink (see the name's comment in the row), so its cap is everything but
 * this, the pencil, and the two 4px gaps either side of the note. On any realistic row that
 * is more than the longest note needs, so the note reads in full; only a row too narrow to
 * hold both does it ellipsis, and then the tooltip has the rest.
 */
const NAME_MIN = 56
const NOTE_MAX = `calc(100% - ${NAME_MIN + ICON_SIZE + 4 * 2}px)`

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
  custom,
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
  /** Whether the field under this column is one the user wrote rather than one the vocabulary
      shipped with — the same fact the palette's chip says in orange. */
  custom: boolean
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

  /**
   * The origin line's tooltip, and whether it has anything to say.
   *
   * Controlled rather than left to Radix, because a tooltip that repeats text you can already
   * read is the same no-op affordance as a "Clear all" with nothing to clear: it costs a
   * hover and answers with what is on screen. So the row agrees to open only when the span is
   * actually clipped, which `scrollWidth > clientWidth` reports — measured on the hover
   * itself, so it tracks the window being resized without an observer to keep in sync.
   */
  const originRef = useRef<HTMLSpanElement>(null)
  const [showOrigin, setShowOrigin] = useState(false)

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
   *
   * Never on a custom column, whatever its `source` says. There the name *is* the field and
   * stays so — renaming one renames the field itself, chip and grouping included (`rename`
   * in ColumnOrganiser.tsx) — so there is no earlier name left to point back at. The only
   * way the two can differ at all is a copy left on the old name while its twin was edited,
   * and a `represents` line under a row the user just named is the tautology this line
   * exists to avoid.
   */
  const origin = fieldOf(column)
  const renamed = !custom && !sameField(origin, column.title)

  /** Past Z — see BADGE_WIDTH. Both halves of the row's left edge read this one flag. */
  const size = letter.length > 1 ? 'double' : 'single'

  const options = aggregationsFor(origin)

  return (
    <div
      data-organiser-row
      data-dragging={dragging || undefined}
      className="organiser-row relative flex items-center justify-between"
      style={{
        columnGap: HALF_GAP,
        backgroundColor: colors.gray[0],
        border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
        // Rows are pulled together so their borders collapse into one hairline — the design
        // draws a single frame around the list, not a stack of separate cards. The first and
        // last rows take the frame's radius; see ColumnOrganiser.
        marginBottom: -1,
      }}
    >
      {/* flex-1 here and on the text column below: NOTE_MAX is a percentage, and it needs a
          definite width to be a percentage *of*. Content-sized, the column is only as wide as
          the note itself, so the cap clipped a short row's note with the whole row free. Only
          the containers grow — the name, the note and the pencil keep their own widths, so
          the pencil still follows the text. */}
      <div className="flex min-w-0 flex-1 items-center">
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
          className="flex min-w-0 flex-1 items-baseline gap-1"
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
              {/* The name gives ground; the note stays. A renamed column's name is whatever the
                  user typed — the one they can reopen with the pencil — while the note is the
                  only place the row says which field the data comes from. So when the row runs
                  out of width the name ellipses and the note keeps its full text.

                  The note is not shrinkable at all (below), which makes this a hard order
                  rather than a weighting: flexbox shares overflow by factor × basis, so any
                  weighting leaves a sliver on the wrong side, and a sliver is an ellipsis. */}
              <PrimitiveText
                as="span"
                {...NAME}
                color={colors.gray[900]}
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                  flexShrink: 1,
                }}
              >
                {column.title}
              </PrimitiveText>
              {renamed && (
                /* A native span rather than a PrimitiveText, on purpose: TooltipV2 wraps any
                   trigger that is not a host element in an `inline-flex` span of its own
                   (TooltipV2.tsx:85-96), and that wrapper would become the flex item instead
                   — leaving the ellipsis measuring itself against a box with no width to run
                   out of. A host element is cloned in place, so the styles below stay on the
                   element the layout actually sizes. META carries the token type; the
                   truncation is Tailwind's, on markup this file owns. */
                <TooltipV2
                  content={`represents “${origin}”`}
                  side={TooltipV2Side.TOP}
                  align={TooltipV2Align.START}
                  open={showOrigin}
                  onOpenChange={(next) => {
                    const el = originRef.current
                    setShowOrigin(next && el !== null && el.scrollWidth > el.clientWidth)
                  }}
                >
                  {/* Never shrinks, so it always reads in full beside a name of any length.
                      Capped by NOTE_MAX all the same, which only binds on a row too narrow to
                      hold it — there it ellipses too, and the tooltip above has the rest. */}
                  <span
                    ref={originRef}
                    className="truncate"
                    style={{ ...META, color: colors.gray[500], flex: 'none', maxWidth: NOTE_MAX }}
                  >
                    {`represents “${origin}”`}
                  </span>
                </TooltipV2>
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
        {/* Where the column came from, which is the one thing about a custom column that
            cannot be read off the row: its name is whatever the user typed, so nothing else
            here distinguishes it from the twenty-six the vocabulary shipped with.

            It stacks with "Grouped by" rather than competing for the slot, because the two
            answer different questions — where the field came from, and what the report does
            with it — and a custom field that is grouped is both. Same size, same shape and
            the same absent `onClick` as that pill; only the hue differs, and it is the
            palette chip's orange so the mark is the one the user already met. */}
        {custom && (
          <span className="pr-2">
            <TagV2
              text="Custom"
              size={TagV2Size.SM}
              subType={TagV2SubType.SQUARICAL}
              color={TagV2Color.WARNING}
              type={TagV2Type.SUBTLE}
            />
          </span>
        )}
        {(grouped || showAggregation) && (
          /* One slot, one keyline.

             Whatever stands here — the pill or the select — ends 8px short of the action
             buttons, so the pill's right edge and the chevron's right edge land on the same
             vertical however the row is configured. The 8px is on this wrapper and not on
             either child, which is what stops the two branches drifting: there is one number
             and both read it.

             Blend's `inline` select zeroes its own padding, so before this the trigger ran
             flush into the duplicate button and that keyline cut the chevron through its
             middle — the pill beside it stopped 8px earlier, and the two read as a column
             that could not decide where it ended. */
          <span className="pr-2">
            {grouped ? (
              /* The grouped column has no aggregation to choose — it is the thing being
                 grouped by, so there is nothing to roll up. The design states that in the
                 slot the select would have taken, rather than leaving a gap the eye has to
                 account for.

                 The same subtle purple chip the Grouping step lit when the field was picked,
                 so the mark a user made one step ago is the mark they find here. Rendered
                 without an `onClick`, which is what makes TagV2 draw a Block instead of a
                 PrimitiveButton (TagV2.tsx:53) — this states a fact about the row, it is not
                 a second control. */
              <TagV2
                text="Grouped by"
                size={TagV2Size.SM}
                subType={TagV2SubType.SQUARICAL}
                color={TagV2Color.PURPLE}
                type={TagV2Type.SUBTLE}
              />
            ) : (
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
            )}
          </span>
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
