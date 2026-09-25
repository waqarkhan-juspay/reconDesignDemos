import {
  FOUNDATION_THEME,
  MenuV2,
  MenuV2Alignment,
  MenuV2Side,
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
import {
  ArrowRightLeft,
  CopyPlus,
  EllipsisVertical,
  GripVertical,
  Info,
  PencilLine,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type Ref,
} from 'react'
import { font } from '../../primitives'
import {
  aggregationOf,
  aggregationsFor,
  dateFormatLabel,
  describeTransform,
  fieldOf,
  sameField,
  SOURCE_DATE_FORMAT,
  transformKindOf,
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
 *   It now leads the Duplicate row inside the kebab menu rather than standing in the row.
 * - `Info` — beside a renamed column's name; its tooltip says which field the column
 *   represents.
 * - `EllipsisVertical` — the kebab that opens the row's menu, three dots stacked.
 * - `ArrowRightLeft` — Data Transform, in the same menu. The values go in one shape and come out
 *   in another, which is what the two arrows say — the one glyph for both kinds of transform, a
 *   date's format and an amount's sign. Offered on date and amount columns only.
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
 * A round-cornered icon button — the ✕ and the kebab.
 *
 * Not a `ButtonV2` with `subType={ICON_ONLY}`: that one draws a bordered secondary control
 * at every size, and the design has a bare glyph in a hit area. Tailwind's Preflight has
 * already stripped `<button>` to transparent with no border (rule 12), so what is left here
 * is the hit area, the hover and the tint.
 *
 * The rest props and the `ref` are passed through because the kebab is a `MenuV2` trigger:
 * Radix's `Trigger asChild` clones this element and hands it its own ref, `onClick`,
 * `onPointerDown` and `aria-expanded`, and a button that dropped them would never open.
 */
function RowAction({
  label,
  icon,
  ref,
  ...rest
}: {
  label: string
  icon: React.ReactNode
  ref?: Ref<HTMLButtonElement>
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      ref={ref}
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
  onOpenTransform,
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
  /** Opens the Data Transform modal, which the organiser owns — see ColumnOrganiser. */
  onOpenTransform: () => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(column.title)
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * The name's tooltip, and whether it has anything to say.
   *
   * Controlled rather than left to Radix, because a tooltip that repeats text you can already
   * read is the same no-op affordance as a "Clear all" with nothing to clear: it costs a
   * hover and answers with what is on screen. So the row agrees to open only when the name is
   * actually clipped, which `scrollWidth > clientWidth` reports — measured on the hover
   * itself, so it tracks the window being resized without an observer to keep in sync.
   */
  const nameRef = useRef<HTMLSpanElement>(null)
  const [showName, setShowName] = useState(false)

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
   * Whether the row wears the origin (info) glyph — once the column's title has moved away from the
   * field it came from, which is what `source` records (answers.ts). Before that the name *is*
   * the field and there is nothing to point back at.
   *
   * Never on a custom column, whatever its `source` says. There the name *is* the field, and
   * the row offers no rename (see the pencil below), so there is no earlier name to show.
   */
  const origin = fieldOf(column)
  const renamed = !custom && !sameField(origin, column.title)

  /** Dates and amounts only — any other column has nothing for the Data Transform to do. */
  const transformable = transformKindOf(origin) !== undefined

  /**
   * A date column's format, `[DD-MM-YYYY]` — the one a date is *written* in, so it follows the
   * Data Transform the moment one is applied, and reads the source's DD-MM-YYYY until then.
   *
   * Drawn beside the name, never stored in `title`. That keeps it out of the rename field (a
   * user editing "Txn Date" is not handed "Txn Date [DD-MM-YYYY]" to pick apart), out of the
   * report's header and the Review chips, and correct after a transform without a rewrite.
   *
   * Renaming moves it rather than dropping it: the name becomes the user's own words, and the
   * format joins the info glyph's tooltip instead — `represents "Txn Date" [DD-MM-YYYY]` —
   * which is where a renamed row keeps the facts about its field. Renaming back to the field's
   * own name brings it back beside the name, since `renamed` is then false again.
   */
  const dateFormat =
    transformKindOf(origin) === 'DATE'
      ? `[${dateFormatLabel(column.transform?.date ?? SOURCE_DATE_FORMAT)}]`
      : undefined
  /** The info glyph's tooltip. The curly quotes are the design's. */
  const originNote = [`represents “${origin}”`, dateFormat].filter(Boolean).join(' ')

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
      {/* flex-1 here and on the text column below, so the name has a definite width to
          ellipsis against and the double-click target runs to the right-hand controls. Only
          the containers grow — the name, the tags and the pencil keep their own widths, so
          the pencil still follows the text. */}
      <div className="flex min-w-0 flex-1 items-center">
        {/* The grip and the letter are one handle, not a 40px target beside a badge that
            ignores the pointer: the pair reads as the row's "where it goes" end, and a press
            anywhere on it should pick the row up. */}
        <span
          {...handleProps}
          role="button"
          tabIndex={0}
          aria-label={`Reorder ${column.title}. Use the arrow keys to move it.`}
          title="Drag to reorder"
          className="flex shrink-0 cursor-grab items-center self-stretch active:cursor-grabbing"
          // The gap before the name is the handle's own padding rather than the name's, so
          // the pointer is on the handle right up to the first letter of the name.
          style={{ paddingRight: NAME_GAP[size], ...handleProps.style }}
        >
          <span
            className="flex shrink-0 items-center justify-center"
            style={{ width: GRIP_BOX, height: GRIP_BOX }}
          >
            <GripVertical size={ICON_SIZE} color={colors.gray[400]} />
          </span>

          {/* The column's position, not its identity — A is the leftmost slot whatever ends
              up in it. Same letters the v1 table draws above its headers. */}
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
        </span>

        {/* A double-click anywhere from the handle to the right-hand controls renames, like a
            file in a list — the pencil only appears on hover, and aiming for it is the slow
            way. The row's full height, not the text line's, so the blank space beside a short
            name counts too. Custom columns keep no rename at all; see the pencil below. */}
        <div
          className="flex min-w-0 flex-1 items-center self-stretch"
          onDoubleClick={custom || editing ? undefined : startEditing}
        >
          <div className="flex min-w-0 flex-1 items-baseline gap-1">
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
                {/* The name gives ground; everything after it stays whole. The format and the
                    tags are not shrinkable at all, which makes this a hard order rather than a
                    weighting: flexbox shares overflow by factor × basis, so any weighting
                    leaves a sliver on the wrong side, and a sliver is an ellipsis.

                    The full name on hover, but only once it is actually cut: a tooltip repeating
                    a name already on screen is noise. A native span on purpose: TooltipV2 wraps
                    any trigger that is not a host element in an `inline-flex` span of its own
                    (TooltipV2.tsx:85-96), and that wrapper, not this, would become the flex item
                    that has to shrink. A host element is cloned in place. */}
                <TooltipV2
                  content={column.title}
                  side={TooltipV2Side.TOP}
                  align={TooltipV2Align.START}
                  open={showName}
                  onOpenChange={(next) => {
                    const el = nameRef.current
                    setShowName(next && el !== null && el.scrollWidth > el.clientWidth)
                  }}
                >
                  <span
                    ref={nameRef}
                    className="truncate"
                    style={{ ...NAME, color: colors.gray[900], minWidth: 0, flexShrink: 1 }}
                  >
                    {column.title}
                  </span>
                </TooltipV2>
                {/* Unshrinkable, for the reason above: a format cut to "[DD-MM-" says nothing. */}
                {!renamed && dateFormat && (
                  <span style={{ ...META, color: colors.gray[500], flex: 'none' }}>
                    {dateFormat}
                  </span>
                )}
                {/* A renamed column's origin, behind an info glyph: the row only has to say
                    *that* there is more to the name; *what* it stands for is a hover away —
                    `represents "Txn Date"`, with a date's format after it. A 16px glyph rather
                    than a "Renamed" tag or the old inline sentence, because both of those took
                    their width from the name, and on a long name it was the name that paid.

                    Focusable, with the tooltip's text as its label, so the origin is reachable
                    by keyboard and read by a screen reader — a hover-only fact would otherwise
                    exist for the mouse alone. The wrapper is a host span, so TooltipV2 clones it
                    in place (see the name above) and its `self-center` aligns the glyph rather
                    than a wrapper around it. gray.400, the pencil's tint: both are quiet
                    affordances beside the name, not content. */}
                {renamed && (
                  <TooltipV2
                    content={originNote}
                    side={TooltipV2Side.TOP}
                    align={TooltipV2Align.START}
                  >
                    <span
                      tabIndex={0}
                      aria-label={originNote}
                      className="ml-1 flex shrink-0 cursor-default self-center"
                    >
                      <Info size={ICON_SIZE} color={colors.gray[400]} />
                    </span>
                  </TooltipV2>
                )}
                {/* Where the column came from, which is the one thing about a custom column that
                  cannot be read off the row: its name is whatever the user typed, so nothing
                  else here distinguishes it from the twenty-six the vocabulary shipped with.
                  Beside the name because it is a fact about the name. The palette chip's
                  orange, so the mark is the one the user already met; no `onClick`, which is
                  what makes TagV2 draw a Block rather than a button (TagV2.tsx:53).

                  `self-center`: the text column aligns on the baseline, and a tag is a box
                  rather than a line of text. `ml-1` on top of the column's 4px gap gives it
                  8px from the name. */}
                {custom && (
                  <span className="ml-1 flex shrink-0 self-center">
                    <TagV2
                      text="Custom"
                      size={TagV2Size.SM}
                      subType={TagV2SubType.SQUARICAL}
                      color={TagV2Color.WARNING}
                      type={TagV2Type.SUBTLE}
                    />
                  </span>
                )}
                {/* The column's values are rewritten on the way into the file — the one thing
                  about it the row cannot otherwise show. Same shape and place as Custom; the
                  tooltip (a native title — TagV2 has nowhere else to put one) says what the
                  transform does. */}
                {column.transform && (
                  <span
                    className="ml-1 flex shrink-0 self-center"
                    title={describeTransform(column.transform)}
                  >
                    <TagV2
                      text="Transformed"
                      size={TagV2Size.SM}
                      subType={TagV2SubType.SQUARICAL}
                      color={TagV2Color.NEUTRAL}
                      type={TagV2Type.SUBTLE}
                    />
                  </span>
                )}
                {/* No rename on a custom column. Its name *is* the field — the one the user
                  typed in "Add custom column" — so renaming the row would be renaming the
                  field out from under its palette chip and any other copy of it.

                  Otherwise hidden until the row is hovered or something in it has focus — the
                  rule is in index.css, because opacity has to answer to `:hover` on the row
                  rather than to a state this component would otherwise have to hold. Focus is
                  in that rule too, so tabbing to it still reveals it.

                  After a renamed row's info glyph, `ml-1` puts 8px between the two rather than
                  the row's 4px gap — the same 8 the glyph keeps from the name — so the pencil
                  reads as its own action rather than as half of a pair with the glyph. */}
                {!custom && (
                  <button
                    type="button"
                    onClick={startEditing}
                    aria-label={`Rename ${column.title}`}
                    title="Rename"
                    className={`organiser-edit flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0 ${renamed ? 'ml-1' : ''}`}
                  >
                    <PencilLine size={ICON_SIZE} color={colors.gray[400]} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        {(grouped || showAggregation) && (
          /* One slot, one keyline.

             Whatever stands here — the pill or the select — ends 8px short of the action
             buttons, so the pill's right edge and the chevron's right edge land on the same
             vertical however the row is configured. The 8px is on this wrapper and not on
             either child, which is what stops the two branches drifting: there is one number
             and both read it.

             Blend's `inline` select zeroes its own padding, so before this the trigger ran
             flush into the kebab button and that keyline cut the chevron through its
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
        <MenuV2
          alignment={MenuV2Alignment.END}
          side={MenuV2Side.BOTTOM}
          trigger={
            <RowAction
              label={`More actions for ${column.title}`}
              icon={<EllipsisVertical size={ICON_SIZE} color={colors.gray[400]} />}
            />
          }
          items={[
            {
              items: [
                {
                  label: {
                    text: 'Duplicate',
                    leftSlot: <CopyPlus size={ICON_SIZE} color={colors.gray[500]} />,
                  },
                  onClick: onDuplicate,
                },
                ...(transformable
                  ? [
                      {
                        label: {
                          text: 'Data Transform',
                          leftSlot: <ArrowRightLeft size={ICON_SIZE} color={colors.gray[500]} />,
                        },
                        onClick: onOpenTransform,
                      },
                    ]
                  : []),
              ],
            },
          ]}
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
