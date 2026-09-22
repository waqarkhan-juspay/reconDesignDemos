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
import { Check, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { SLOT_ICON } from '../../icons'
import { LinkAction } from '../../link-action'
import { PrimitiveText, font } from '../../primitives'
import { columnOrganiserTokens } from '../../theme'
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
   * The whole vocabulary: Blend's field list, then the user's own. Custom fields are appended
   * rather than merged in alphabetically, so a field you invented does not disappear into a
   * list of twenty-six you did not.
   */
  const vocabulary = useMemo(
    () => [
      ...FIELD_TAGS,
      ...answers.customFields
        .map(({ title }) => title)
        .filter((title) => !FIELD_TAGS.some((tag) => sameField(tag, title))),
    ],
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
    // A grouped field is still a chosen field — purple adds to what SUBTLE already says
    // rather than replacing it, which is why this is the chip's colour and not a fourth type.
    const groupedField = selected && isGrouped(tag)
    return (
      <TagV2
        key={tag}
        text={tag}
        size={TagV2Size.MD}
        subType={TagV2SubType.SQUARICAL}
        color={groupedField ? TagV2Color.PURPLE : TagV2Color.NEUTRAL}
        // SUBTLE when in, NO_FILL when out. Node 4911:111688 gives both states the same
        // #ECEFF3 hairline — that is what fieldTagTokens' `noFill` override is for
        // (src/theme.ts) — and separates them by their fill alone: a chosen chip on gray[50],
        // an unchosen one on the pane's own white. ATTENTIVE, which is what the v1 chips use
        // for the same state, is far too loud down a column of twenty-nine.
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
            // Handed to index.css, which keeps no values of its own (rule 1). No fallbacks
            // on purpose: a property that stops being set here should fail visibly rather
            // than resolve to a literal the stylesheet had quietly kept a copy of.
            '--organiser-micro': `${MICRO_MS}ms`,
            '--organiser-ease': FEEDBACK_EASING,
            '--organiser-hover': colors.gray[50],
          } as CSSProperties
        }
      >
        {/* ── The palette ─────────────────────────────────────────────────────────────── */}
        <div
          className="organiser-palette flex shrink-0 flex-col gap-4 p-5"
          style={{
            width: PALETTE_PANE,
            border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
            borderTopLeftRadius: FOUNDATION_THEME.border.radius[8],
            borderBottomLeftRadius: FOUNDATION_THEME.border.radius[8],
          }}
        >
          <TextInputV2
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search columns"
            size={InputSizeV2.MD}
            // gray[400], the placeholder colour — an icon in an input slot inherits the
            // *value* colour otherwise, and an untinted glyph reads as black shouting beside
            // grey text (rule 11).
            leftSlot={{ slot: <Search size={SLOT_SIZE} color={colors.gray[400]} /> }}
            aria-label="Search columns"
          />

          {/* The bulk actions belong to the chips rather than to the search, so they sit 12px
              above the list and 16px below the input — near enough to read as its header. */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <LinkAction text="Select all" onClick={selectAll} disabled={unpicked.length === 0} />
              <LinkAction text="Clear all" onClick={clearAll} disabled={picked.length === 0} />
            </div>

            <div className="flex flex-col gap-2">
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
        </div>

        {/* ── The organiser ───────────────────────────────────────────────────────────── */}
        <div
          className="flex min-w-0 flex-1 flex-col gap-6 px-6 py-7"
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
          <div className="flex items-center justify-between">
            <PrimitiveText as="h3" {...HEADING} color={colors.gray[700]}>
              Column organiser
            </PrimitiveText>
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.SMALL}
              subType={ButtonV2SubType.INLINE}
              text="Add custom column"
              leftSlot={{ slot: <Plus size={SLOT_SIZE} /> }}
              onClick={onAddCustomColumn}
            />
          </div>

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
            /* One frame around the whole list, drawn by the rows themselves: each carries a
               border and a -1px bottom margin so adjacent edges collapse into one hairline,
               and the first and last take the outer radius. `overflow-hidden` is what makes
               the radius clip the row inside it. */
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
                  showAggregation={aggregated}
                  dragging={draggingIndex === index}
                  handleProps={handleProps(index)}
                  onRename={(title) => update(column.id, { title })}
                  onAggregate={(aggregate: Aggregation) => update(column.id, { aggregate })}
                  onDuplicate={() => duplicate(index)}
                  onRemove={() =>
                    // By id, not by field: a duplicated column's ✕ takes that copy only, and
                    // the chip stays lit while the other one is still there.
                    setColumns(columns.filter((other) => other.id !== column.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}
