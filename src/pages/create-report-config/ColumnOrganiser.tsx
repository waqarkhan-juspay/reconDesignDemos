import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  InputSizeV2,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  TextInputV2,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { Check, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { SLOT_ICON } from '../../icons'
import { LinkAction } from '../../link-action'
import { PrimitiveText, font } from '../../primitives'
import { columnOrganiserTokens, headerGhostButtonTokens, organiserRowTokens } from '../../theme'
import {
  columnLetter,
  fieldOf,
  FIELD_TAGS,
  IMPORTANT_FIELDS,
  isFieldSelected,
  isGroupedField,
  newFieldColumn,
  sameField,
  withoutField,
  type Aggregation,
  type FieldColumn,
  type FieldsAnswers,
} from './answers'
import { OrganiserRow } from './OrganiserRow'
import { moveItem, useRowDrag } from './use-row-drag'

const { colors } = FOUNDATION_THEME

/**
 * The palette pane — 282px, which is node 4911:111684's own width: a 240px column of chips
 * (4911:111685), 20px of padding either side, and the 1px border on each edge that `box-sizing:
 * border-box` (Preflight) counts inside it.
 */
const PALETTE_PANE = 240 + 20 * 2 + 1 * 2

/** The inset the palette keeps from its own edges — chips and header alike. */
const PANE_PAD = 20

/** The search field's height — TextInputV2 at MD. */
const SEARCH_ROW = 36

/**
 * The organiser header's box, and the whole of how the two panes line up now that only the
 * palette draws a hairline under its header.
 *
 * It is the palette's search field plus the padding above and below it, and the heading
 * inside it is centred rather than stacked — so "Column organiser" sits on exactly the line
 * "Search columns" centres on, whatever the heading row's own height turns out to be. The
 * two headers are no longer the same height and are not trying to be: what reads across the
 * seam is the one line both of them put their first thing on.
 *
 * The palette's header takes no floor at all any more — it hugs its own stack, which is what
 * `p-5` on it already says.
 */
const ORGANISER_HEADER = PANE_PAD * 2 + SEARCH_ROW

const SLOT_SIZE = 16

/**
 * The two states of a palette chip's right slot, and the whole of what the chip says about
 * itself: `+` means this field is not in the report, `✓` means it is.
 *
 * Built once rather than per chip because there are twenty-six of them and neither depends on
 * which field it sits in. The colours are the design's own exports — the plus at gray[500]
 * against an unfilled chip, the check at gray[700] against a filled one, so each keeps the
 * same distance from the label beside it.
 */
const ADD_SLOT = { slot: <Plus {...SLOT_ICON} color={colors.gray[500]} /> }
const ADDED_SLOT = { slot: <Check {...SLOT_ICON} color={colors.gray[700]} /> }
/**
 * The same check on a chip the report groups by — purple[600], which is what SUBTLE/PURPLE
 * colours the label beside it, so the glyph and the word stay one thing.
 */
const GROUPED_SLOT = { slot: <Check {...SLOT_ICON} color={colors.purple[600]} /> }

const HEADING = {
  ...font(FOUNDATION_THEME.font.size.body.lg),
  fontWeight: FOUNDATION_THEME.font.weight[600],
}

/**
 * Step 3, version 2 — node 4911:111609.
 *
 * Two panes sharing one frame. On the left the vocabulary, as a searchable column of chips;
 * on the right the columns you picked, in the order the report will carry them. The split is
 * the point: picking a field and arranging it are different jobs, and the v1 layout made you
 * do the second one inside a table preview that was already showing you the answer.
 *
 * `columns` is the single source of truth for both halves. A chip is lit because a column
 * came from it (`isFieldSelected`), never because it remembers being clicked — so there is no
 * second list to keep in step, and no way for the two sides to disagree.
 */
export function ColumnOrganiser({
  answers,
  onChange,
  aggregated,
  onAddCustomColumn,
}: {
  answers: FieldsAnswers
  onChange: (next: FieldsAnswers) => void
  /**
   * Whether the report groups its records at all — Setup's third question, arriving through
   * FieldsStep from index.tsx.
   *
   * This and not `hasAnyGrouping` is what puts an aggregation on a row, because the two ask
   * different things. "Is this report aggregated?" was answered on Setup; "which fields does
   * it group by?" is answered on Grouping, and a grouped report with no levels chosen yet is
   * still a report whose columns have to be rolled up — into one row, but rolled up. Keying
   * the select on the levels instead would make every column's aggregation appear and vanish
   * as badges were picked on a step the user has already left.
   */
  aggregated: boolean
  /** Opens the modal the page owns — see FieldsStep. */
  onAddCustomColumn: () => void
}) {
  const [query, setQuery] = useState('')
  const { columns } = answers

  const setColumns = useCallback(
    (next: FieldColumn[]) => onChange({ ...answers, columns: next }),
    [answers, onChange],
  )

  /**
   * The whole vocabulary: the shipped field list and the user's own, in one alphabetical run.
   *
   * A custom field takes its place in the list rather than landing after it, because the way
   * you look for a field you named is the way you look for any other — you go to its letter.
   * Appending put it where nothing else would ever be looked for, and past twenty-nine chips
   * that is below the fold. The orange chip is what keeps it findable *as* yours (see `chip`
   * below), which is the job the position was doing badly.
   *
   * `sensitivity: 'base'` so a title typed in lower case sorts by its letter and not by its
   * case — the same indifference to spelling that `sameField` applies everywhere else here.
   * Verified against FIELD_TAGS: the comparator reproduces the shipped order exactly, so
   * sorting moves nothing that was already in place.
   */
  const vocabulary = useMemo(
    () =>
      [
        ...FIELD_TAGS,
        ...answers.customFields
          .map(({ title }) => title)
          .filter((title) => !FIELD_TAGS.some((tag) => sameField(tag, title))),
      ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [answers.customFields],
  )

  /**
   * Substring, case-insensitive, and nothing cleverer. The list is twenty-six known nouns, so
   * the search is there to save scrolling, not to guess at intent — a fuzzy match over this
   * many short names mostly returns the ones you did not mean.
   */
  const needle = query.trim().toLowerCase()
  const matches = needle === '' ? vocabulary : vocabulary.filter((tag) => tag.toLowerCase().includes(needle))

  /**
   * Whether the report groups by a field — the user's answer from the Grouping step, which
   * `groupBy` records as fields rather than column ids (answers.ts).
   *
   * That is what makes the mark survive this page: remove a grouped column with its ✕ or its
   * chip and put it straight back, and the new column — a different column, with a different
   * id — is still a column for a field the report groups by, so it comes back purple and
   * still reads "Grouped by". By field rather than by title for the same reason `fieldOf`
   * exists: renaming a column here must not decide whether it counts as grouped either.
   */
  const isGrouped = (field: string) => isGroupedField(answers, field)

  /**
   * Whether a tag is one the user invented rather than one the vocabulary shipped with.
   *
   * Read off `customFields` and not off FIELD_TAGS' complement, because that list is what
   * survives a custom column being removed (answers.ts) — the chip has to stay marked while
   * it sits unselected in the palette, which is exactly when it is easiest to mistake for one
   * of the twenty-six.
   */
  const isCustom = (tag: string) =>
    answers.customFields.some((field) => sameField(field.title, tag))

  /**
   * A new column for a vocabulary tag, carrying a custom field's default value when it has
   * one. Shared by the single toggle and "Select all" so a field added twenty-nine at a time
   * is the same column as a field added on its own.
   */
  const columnFor = (tag: string) => {
    const custom = answers.customFields.find((field) => sameField(field.title, tag))
    return newFieldColumn(tag, custom?.defaultValue)
  }

  const toggleField = (tag: string) => {
    if (isFieldSelected(columns, tag)) {
      // Every column from this field, not just the first: a duplicated column would otherwise
      // survive its own chip going dark.
      setColumns(withoutField(columns, tag))
      return
    }
    setColumns([...columns, columnFor(tag)])
  }

  /**
   * The two bulk actions, and both of them act on what the search has left on screen.
   *
   * With a filter typed, "all" can only sensibly mean all of *these* — and the alternative is
   * worse than merely surprising: a click that reaches twenty-nine fields while nine are shown
   * changes the report in ways the pane is not currently able to display. With an empty
   * search, which is the usual case, the visible set is the whole vocabulary and the reading
   * is the plain one.
   */
  const unpicked = matches.filter((tag) => !isFieldSelected(columns, tag))
  const picked = matches.filter((tag) => isFieldSelected(columns, tag))

  /**
   * The caption over the palette, which answers whichever question the pane is currently
   * being used to ask.
   *
   * A typed search wins, always: while the list is filtered, what the user needs back is how
   * much of it survived the filter — that is the whole point of having typed — and a running
   * selection total there would be answering a question nobody asked. With no search, a
   * selection is the more useful fact of the two, because the number of columns available is
   * a constant the chips below already show in full.
   *
   * `columns.length` and not `picked.length`: it counts what the organiser actually holds,
   * which is what the report ships with. The two differ wherever a field is in twice, or
   * where a custom column was added on the right without a chip on the left ever being
   * clicked — and in both of those the honest answer is the higher one.
   */
  const plural = (n: number) => (n === 1 ? 'column' : 'columns')
  const caption =
    needle === '' && columns.length > 0
      ? `${columns.length} ${plural(columns.length)} selected`
      : `Showing ${matches.length} ${plural(matches.length)}`

  const selectAll = () => setColumns([...columns, ...unpicked.map(columnFor)])

  /**
   * The important fields still missing — IMPORTANT_FIELDS in answers.ts, which is the one
   * place this step's opinion about where a report should start is written down.
   *
   * Only the empty state reads it, where by definition every one of them is missing, so today
   * this is always the whole list. It stays a filter rather than IMPORTANT_FIELDS itself so
   * that a later caller somewhere the organiser is not empty cannot quietly add a duplicate
   * column — the same guard the v1 step keeps on its own `missingImportant`.
   */
  const missingImportant = IMPORTANT_FIELDS.filter((tag) => !isFieldSelected(columns, tag))
  const addImportant = () => setColumns([...columns, ...missingImportant.map(columnFor)])
  // Folded one field at a time rather than filtered in one pass, so duplicates of a field go
  // with it — the same rule `toggleField` applies to a single chip.
  const clearAll = () =>
    setColumns(picked.reduce((kept, tag) => withoutField(kept, tag), columns))

  /**
   * Reordering reads the latest columns from a ref rather than from the closure.
   *
   * A drag can cross two slots inside one frame, and both crossings run before React has
   * committed the first — so the second would build its array from the order the first one
   * replaced, and the row would jump back. Browsers coalesce pointermove to one event per
   * frame, which makes this rare rather than impossible, and a reorder that is wrong once in
   * a while is worse than one that is wrong every time.
   *
   * The ref is written by `move` as well as during render, so each crossing composes onto the
   * one before it whether or not React has caught up.
   */
  const columnsRef = useRef(columns)
  const answersRef = useRef(answers)
  // In an effect rather than written during render — a ref assigned while rendering is not
  // safe under concurrent rendering, and this one is only ever read from a pointer handler.
  // `move` writes it too, so between a commit and this effect the ref is still at least as
  // fresh as the last reorder it made.
  useEffect(() => {
    columnsRef.current = columns
    answersRef.current = answers
  }, [columns, answers])

  const move = useCallback(
    (from: number, to: number) => {
      const next = moveItem(columnsRef.current, from, to)
      columnsRef.current = next
      onChange({ ...answersRef.current, columns: next })
    },
    [onChange],
  )
  const { listRef, draggingIndex, handleProps } = useRowDrag(columns.length, move)

  const update = (id: string, patch: Partial<FieldColumn>) =>
    setColumns(columns.map((column) => (column.id === id ? { ...column, ...patch } : column)))

  /**
   * Renaming a column, which is two different operations wearing one pencil.
   *
   * For a field the vocabulary shipped, the title is a label laid over a field the report
   * already knows about. The label moves and the field does not: `source` holds the two
   * together, the chip stays lit, and the row reads back `represents "Gateway"` so the
   * original name is never actually lost.
   *
   * For a field the user invented there is nothing underneath to point back at — the name
   * *is* the field. So the rename goes all the way down: `customFields`, which is what draws
   * the chip; `groupBy`, which stores field names and would otherwise keep pointing at a name
   * that no longer exists and silently ungroup the field; and `source` on every column that
   * came from it. Renaming only the title would have split one field into a chip nobody could
   * find and a row claiming to represent a name the user had just replaced.
   *
   * A duplicate follows the rename only while it still carries the field's own name. Once a
   * copy has a title of its own, that title is a decision, and a rename of its twin is not
   * the place to overturn it.
   */
  const rename = (column: FieldColumn, title: string) => {
    const field = fieldOf(column)
    if (!isCustom(field)) {
      update(column.id, { title })
      return
    }
    onChange({
      ...answers,
      columns: columns.map((other) =>
        sameField(fieldOf(other), field)
          ? {
              ...other,
              source: title,
              ...(other.id === column.id || sameField(other.title, field) ? { title } : {}),
            }
          : other,
      ),
      customFields: answers.customFields.map((custom) =>
        sameField(custom.title, field) ? { ...custom, title } : custom,
      ),
      ...(answers.groupBy && {
        groupBy: answers.groupBy.map((other) => (sameField(other, field) ? title : other)),
      }),
    })
  }

  /**
   * A copy lands directly below its original rather than at the end, because the reason to
   * duplicate a column is to have the same field twice with different treatment — two
   * aggregations of Txn Amount, say — and those belong beside each other.
   *
   * The copy keeps `source`, so both halves of the pair stay attached to the field they came
   * from and the chip stays lit while either one exists.
   */
  const duplicate = (index: number) => {
    const original = columns[index]
    const copy: FieldColumn = { ...original, ...newFieldColumn(original.title), source: original.source }
    setColumns([...columns.slice(0, index + 1), copy, ...columns.slice(index + 1)])
  }

  const chip = (tag: string) => {
    const selected = isFieldSelected(columns, tag)
    /*
     * Purple whether or not the field is currently a column, for the reason the custom chip
     * is orange either way: both say where a field stands in this configuration, and neither
     * stops being true while the field sits out of the list.
     *
     * `isGrouped` reads `groupBy`, which records fields and not column ids, so pulling a
     * grouped column out with its ✕ does not ungroup anything — put it back and the row says
     * "Grouped by" again. A chip that dropped to grey in between would be claiming the
     * opposite, on the one screen where you are deciding what to remove.
     */
    const groupedField = isGrouped(tag)
    /*
     * Orange for a field the user wrote themselves, so it is findable in a list of
     * twenty-nine nouns that otherwise all look alike — WARNING is the palette's orange
     * (tagV2.light.tokens.ts), and it is a mark of origin here rather than of anything wrong.
     * `color` here only moves the *word*. Blend's WARNING and PURPLE each wash the whole chip;
     * `fieldTagTokens` (src/theme.ts) sends both back to the neutral fill and the neutral
     * hairline, so every chip in the column is the same shape and the label is the only thing
     * that differs.
     *
     * Grouping still wins where the two meet: purple says what this report *does* with the
     * field, which is a fact about the current configuration, and that outranks where the
     * field came from. A custom field that is grouped is already unmistakable from its
     * "Grouped by" row on the right.
     */
    return (
      <TagV2
        key={tag}
        text={tag}
        size={TagV2Size.MD}
        subType={TagV2SubType.SQUARICAL}
        color={
          groupedField
            ? TagV2Color.PURPLE
            : isCustom(tag)
              ? TagV2Color.WARNING
              : TagV2Color.NEUTRAL
        }
        // SUBTLE when in, NO_FILL when out. Node 4911:111688 gives both states the same
        // #ECEFF3 hairline — that is what fieldTagTokens' border override is for
        // (src/theme.ts) — and separates them by their fill alone: a chosen chip on gray[50],
        // an unchosen one on the pane's own white, whatever colour its label is. ATTENTIVE,
        // which is what the v1 chips use for the same state, is far too loud down a column of
        // twenty-nine.
        type={selected ? TagV2Type.SUBTLE : TagV2Type.NO_FILL}
        rightSlot={selected ? (groupedField ? GROUPED_SLOT : ADDED_SLOT) : ADD_SLOT}
        aria-pressed={selected}
        title={selected ? `Remove ${tag} from the report` : `Add ${tag} to the report`}
        onClick={() => toggleField(tag)}
      />
    )
  }

  return (
    <ThemeProvider componentTokens={columnOrganiserTokens}>
      <div
        className="flex w-full items-stretch"
        style={
          {
            borderRadius: FOUNDATION_THEME.border.radius[8],
            /*
             * Capped so that each pane scrolls its own list instead of the step growing to
             * twenty-nine chips' worth of height and taking the page with it.
             *
             * 100% of the filling grid row (`.flow-grid[data-fill]`, index.css), which is the
             * flow's content pane: `flex-1` inside an `h-screen` column. So the cap *is*
             * viewport height, less the topbar and footer that have to stay on screen for it
             * to be any use. A literal `100dvh` was the first attempt and does not bind — it
             * is larger than the pane it sits in, so on a tall window the box just grew past
             * the fold exactly as before.
             */
            maxHeight: '100%',
            // Handed to index.css, which keeps no values of its own (rule 1). No fallbacks
            // on purpose: a property that stops being set here should fail visibly rather
            // than resolve to a literal the stylesheet had quietly kept a copy of.
            '--organiser-micro': `${MICRO_MS}ms`,
            '--organiser-ease': FEEDBACK_EASING,
            '--organiser-hover': colors.gray[50],
            '--organiser-scrollbar': colors.gray[300],
            // The search's clear control, at rest and under the pointer. gray[400] is the
            // placeholder colour every icon in an input slot takes (rule 11) — it belongs to
            // the field's furniture, not to the value.
            '--organiser-clear': colors.gray[400],
            '--organiser-clear-hover': colors.gray[600],
          } as CSSProperties
        }
      >
        {/* ── The palette ─────────────────────────────────────────────────────────────── */}
        <div
          className="organiser-palette flex min-h-0 shrink-0 flex-col"
          style={{
            width: PALETTE_PANE,
            border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
            borderTopLeftRadius: FOUNDATION_THEME.border.radius[8],
            borderBottomLeftRadius: FOUNDATION_THEME.border.radius[8],
          }}
        >
          {/* The header: what you search and select *with*, held still while what you search
              and select *over* scrolls beneath it. The hairline is what makes that read as a
              header rather than as the first two things in a long list.

              `p-5` all round, and the box hugs what is in it — 20px is the same inset the
              chips below keep from the pane's edges, so the padding is one decision rather
              than a horizontal one and a vertical one that happen to agree. It used to be a
              fixed height with the stack centred inside, which produced the identical 20px
              but only for as long as the constant and the stack stayed in step. */}
          <div
            className="flex shrink-0 flex-col gap-3 p-5"
            style={{
              borderBottom: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
            }}
          >
            <TextInputV2
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search columns"
              size={InputSizeV2.MD}
              // gray[400], the placeholder colour — an icon in an input slot inherits the
              // *value* colour otherwise, and an untinted glyph reads as black shouting
              // beside grey text (rule 11).
              leftSlot={{ slot: <Search size={SLOT_SIZE} color={colors.gray[400]} /> }}
              /*
               * Shown once there is something to clear, rather than on focus: an ✕ over an
               * empty field is the no-op control "Clear all" below was just taken off the
               * page for (src/link-action.tsx). Gating on the value also survives a blur —
               * clicking a chip takes focus out of the field, and a focus-gated ✕ would
               * vanish while its own search was still filtering the list.
               */
              rightSlot={
                query
                  ? {
                      slot: (
                        <button
                          type="button"
                          aria-label="Clear search"
                          title="Clear search"
                          /* The caret never leaves the field: `mousedown` is what would blur
                             it, and the click still fires, so you can carry straight on
                             typing after clearing. */
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setQuery('')}
                          className="organiser-clear flex cursor-pointer items-center justify-center border-none bg-transparent p-0"
                        >
                          <X size={SLOT_SIZE} />
                        </button>
                      ),
                    }
                  : undefined
              }
              aria-label="Search columns"
            />

            {/* The bulk action sits with the search rather than with the chips: it acts on
                the whole list, and it has to stay reachable once that list is scrolled.

                Split left and right, with the count on the left: the row reads as a caption
                for the list under it — what you are looking at, then what you can do to all
                of it — and the action ends up in the corner rather than adrift in the middle
                of an otherwise empty line. */}
            <div className="flex items-center justify-between gap-4">
              {/* Two facts sharing one line, because they are never both wanted at once —
                  see `caption` above for which wins when. It earns the space either way: the
                  chips scroll, so neither number can be arrived at by counting what is on
                  screen. */}
              <PrimitiveText
                as="p"
                {...font(FOUNDATION_THEME.font.size.body.sm)}
                color={colors.gray[500]}
              >
                {caption}
              </PrimitiveText>

              {/* One control, not two, and which one it is answers the only question the
                  corner can usefully answer: the list is untouched, so take all of it — or
                  you have taken some, so put it back.

                  Both at once made the pair read as a choice between two bulk actions, when
                  in practice the second is only ever the undo of the first. Swapping in
                  place also means the corner never grows a control while you are looking
                  somewhere else, which is what a "Clear all" appearing beside a still-live
                  "Select all" did.

                  `picked` and not `columns`, so the control is search-scoped like the two
                  handlers it calls. Type a filter that excludes everything you have already
                  taken and it says "Select all" again — correctly, because "Clear all" there
                  would reach none of the visible fields and answer the click with nothing.
                  The caption on the left is what still reports the whole selection.

                  Nothing at all when the search has emptied the list: the action trails,
                  with nothing after it to slide into the gap, so hiding beats a drawn no-op
                  — the rule in src/link-action.tsx. The row still says "Showing 0 columns"
                  and the pane below still says what missed, so nothing goes unexplained. */}
              {matches.length > 0 &&
                (picked.length === 0 ? (
                  <LinkAction text="Select all" onClick={selectAll} />
                ) : (
                  <LinkAction text="Clear all" onClick={clearAll} />
                ))}
            </div>
          </div>

          {/* The chips, and the only part of this pane that moves. `min-h-0` is what makes it
              scroll rather than push: a flex item's default `min-height: auto` refuses to
              shrink below its content, so without it the pane grows past the cap above and
              nothing ever overflows to scroll. */}
          <div className="organiser-scroll flex min-h-0 flex-1 flex-col gap-2 p-5">
            {matches.map(chip)}
            {matches.length === 0 && (
              <PrimitiveText
                as="p"
                {...font(FOUNDATION_THEME.font.size.body.sm)}
                color={colors.gray[500]}
              >
                {`No field matches “${query.trim()}”.`}
              </PrimitiveText>
            )}
          </div>
        </div>

        {/* ── The organiser ───────────────────────────────────────────────────────────── */}
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          style={{
            backgroundColor: colors.gray[25],
            // No left border: the palette's right border already draws the seam, and two
            // hairlines a pixel apart read as a gap rather than a division.
            borderTop: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
            borderRight: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
            borderBottom: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
            borderTopRightRadius: FOUNDATION_THEME.border.radius[8],
            borderBottomRightRadius: FOUNDATION_THEME.border.radius[8],
          }}
        >
          {/* No hairline under this one. The pane already carries three borders and a vertical
              seam against the palette, and a fourth line here cut the heading off from the
              rows it names — with the two headers no longer the same height it had nothing on
              the other side of the seam to meet anyway.

              24px in from the sides, the inset this pane's rows keep. The vertical is the
              palette's 20px rather than 24, because ORGANISER_HEADER is built out of the
              palette's own search row: that is what puts this heading on the same centre line
              as "Search columns" instead of merely at the same top edge. */}
          <div
            // `pr-4` and not `pr-6`: the button below now carries 8px of its own horizontal
            // padding so its hover fill has somewhere to be, and the header hands back exactly
            // that much on the right. The label therefore still ends on the 24px keyline the
            // rows under it use — the padding moved from the parent to the child rather than
            // being added on top of it.
            className="flex shrink-0 items-center justify-between py-5 pl-6 pr-4"
            style={{ minHeight: ORGANISER_HEADER }}
          >
            <PrimitiveText as="h3" {...HEADING} color={colors.gray[700]}>
              Column organiser
            </PrimitiveText>
            {/* blend-gap: ButtonV2 hard-codes `cursor: default` on every enabled button
                (ButtonV2/utils.ts:269) and no prop or token reaches it, so a control that
                answers a click reads as text under the pointer. The rule goes on a wrapper
                we own, since ButtonV2 omits className. */}
            <span className="[&_button]:cursor-pointer">
              {/* INLINE gives no padding and no hover fill of its own — see
                  headerGhostButtonTokens (src/theme.ts) for both, and for why the scope is
                  this one button rather than the pane. */}
              <ThemeProvider componentTokens={headerGhostButtonTokens}>
                <ButtonV2
                  buttonType={ButtonV2Type.SECONDARY}
                  size={ButtonV2Size.SMALL}
                  subType={ButtonV2SubType.INLINE}
                  text="Add custom column"
                  leftSlot={{ slot: <Plus size={SLOT_SIZE} /> }}
                  onClick={onAddCustomColumn}
                />
              </ThemeProvider>
            </span>
          </div>

          {/* The columns, scrolling under the header — `min-h-0` for the reason the palette's
              list carries it. */}
          <div className="organiser-scroll flex min-h-0 flex-1 flex-col gap-6 px-6 py-1">
            {columns.length === 0 ? (
              /* blend-gap: Blend 0.0.37 publishes no EmptyState (it exists on GitHub — rule 3),
                 so this is the smallest honest version: what the panel is for, in the place its
                 first row will appear. */
              <div
                className="flex flex-col items-center justify-center gap-4 py-12"
                style={{
                  border: `${FOUNDATION_THEME.border.width[1]} dashed ${colors.gray[300]}`,
                  borderRadius: FOUNDATION_THEME.border.radius[8],
                }}
              >
                {/* Title and subtitle as their own stack, so the 4px between them is not the
                    16px that separates the whole message from the button. */}
                <div className="flex flex-col items-center gap-1">
                  <PrimitiveText
                    as="p"
                    {...font(FOUNDATION_THEME.font.size.body.md)}
                    color={colors.gray[600]}
                  >
                    No columns yet
                  </PrimitiveText>
                  <PrimitiveText
                    as="p"
                    {...font(FOUNDATION_THEME.font.size.body.sm)}
                    color={colors.gray[500]}
                  >
                    Pick a field on the left, or add a custom column.
                  </PrimitiveText>
                </div>
                {/* The one shortcut out of the empty state, so the panel offers a way forward
                    rather than only describing one — the same button, the same list and the
                    same wiring as the v1 step's empty table.

                    MEDIUM rather than the SMALL of "Add custom column" in the heading above:
                    that one sits in a row of panel chrome and is sized against it, where this
                    one stands alone inside the dashed frame.

                    No `missingImportant.length` guard: this renders only when `columns` is
                    empty, so every important field is missing and the button always has
                    something to do. */}
                <ButtonV2
                  buttonType={ButtonV2Type.SECONDARY}
                  size={ButtonV2Size.MEDIUM}
                  text="Add important columns"
                  leftSlot={{ slot: <Plus size={14} /> }}
                  onClick={addImportant}
                />
              </div>
            ) : (
              /* The rows run on their own tag colours — organiserRowTokens (src/theme.ts) —
                 for why a pill in here keeps the wash a chip in the palette gives up. */
              <ThemeProvider componentTokens={organiserRowTokens}>
                {/* One frame around the whole list, drawn by the rows themselves: each carries
                    a border and a -1px bottom margin so adjacent edges collapse into one
                    hairline, and the first and last take the outer radius. `overflow-hidden`
                    is what makes the radius clip the row inside it. */}
                <div
                  ref={listRef}
                  className="organiser-list flex flex-col"
                  style={{ borderRadius: FOUNDATION_THEME.border.radius[8] }}
                >
                  {columns.map((column, index) => (
                    <OrganiserRow
                      key={column.id}
                      column={column}
                      letter={columnLetter(index)}
                      grouped={isGrouped(fieldOf(column))}
                      // By field, like the chip — a custom column that has been renamed is
                      // still one the user invented, and `fieldOf` is what remembers that.
                      custom={isCustom(fieldOf(column))}
                      showAggregation={aggregated}
                      dragging={draggingIndex === index}
                      handleProps={handleProps(index)}
                      onRename={(title) => rename(column, title)}
                      onAggregate={(aggregate: Aggregation) => update(column.id, { aggregate })}
                      onDuplicate={() => duplicate(index)}
                      onRemove={() =>
                        // By id, not by field: a duplicated column's ✕ takes that copy only,
                        // and the chip stays lit while the other one is still there.
                        setColumns(columns.filter((other) => other.id !== column.id))
                      }
                    />
                  ))}
                </div>
              </ThemeProvider>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
