import {
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from '@juspay/blend-design-system'
import { Plus, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { SLOT_ICON } from '../../icons'
import { PrimitiveText, font } from '../../primitives'
import {
  GROUPABLE_FIELDS,
  newFieldColumn,
  fieldOf,
  sameField,
  type FieldsAnswers,
} from './answers'

const { colors } = FOUNDATION_THEME

/**
 * The remove glyph on a picked chip — the same 12px `X` the Fields step uses, drawn purple[600]
 * to match the label beside it. SUBTLE/PURPLE colours its text purple[600]
 * (tagV2.light.tokens.ts), so a gray glyph would be the one cold thing inside a warm chip.
 */
const REMOVE_TAG_SLOT = { slot: <X {...SLOT_ICON} color={colors.purple[600]} /> }

/**
 * The other half of that pair: `+` on a field the report does not group by yet, gray[500]
 * against the chip's own gray[50], which is the same plus the column organiser's palette
 * draws (ColumnOrganiser's ADD_SLOT). Both lists are the same vocabulary asked the same way
 * — click to add — so they say it with the same glyph.
 */
const ADD_TAG_SLOT = { slot: <Plus {...SLOT_ICON} color={colors.gray[500]} /> }

/**
 * The chip shape — squarical and md.
 *
 * SUBTLE in both states, and the colour is the whole of the difference: neutral while a field
 * is merely offered, purple once the report groups by it. Purple rather than a darker neutral
 * because this mark has to survive the trip to the next step — the Fields step repeats it on
 * the chip and on the row (ColumnOrganiser, OrganiserRow), which is how a grouped record stays
 * recognisable after you have stopped looking at the step that made it one. A second shade of
 * grey could not carry that; it would read as "selected", which every chip over there already
 * is.
 */
const SHAPE = {
  size: TagV2Size.MD,
  subType: TagV2SubType.SQUARICAL,
  type: TagV2Type.SUBTLE,
} as const

/**
 * The floor every chip in the column is at least this wide — see `.grouping-palette` in
 * index.css, which is where it has to be applied because TagV2 accepts no width.
 *
 * Sized against the whole field vocabulary rather than the eight or nine dimensions this
 * step happens to offer today (FIELD_TAGS, answers.ts). Its longest name, Recon Secondary
 * Sub Status, sets the measure at 182px of label; a chip adds 20px of padding, 2px of border
 * and 18px for the gap and the right slot, which lands on 222 and rounds up the 4px grid to
 * 224. GROUPABLE_FIELDS is a subset that has already grown once, and a floor that has to be
 * re-measured every time a dimension is added is a floor nobody will re-measure.
 *
 * A custom field longer than that simply grows past it; this is a floor, not a column width.
 */
const CHIP_MIN_WIDTH = 224

/**
 * The Grouping step — the field vocabulary asked as its own question, before the columns are
 * chosen. Only a grouped report walks it (STEPS in index.tsx).
 *
 * ## What selecting a tag does
 *
 * Grouping by a field the report does not contain is not a thing you can deliver, so picking
 * a tag here **adds it as a column** as well as adding a grouping level — it has to, because
 * this step runs before there are any columns.
 *
 * Unpicking removes the grouping level and *leaves the column*. The alternative — taking the
 * column away again — would mean a field could enter and leave the report through a step that
 * is not about which fields the report contains, and a user who unpicked a grouping level
 * would silently lose a column they may since have arranged in the Fields step. So the rule
 * is one-way on purpose: grouping by a field guarantees it is a column; ungrouping says
 * nothing about whether it should stay one. The Fields step is where a column leaves.
 *
 * ## Order
 *
 * Grouping is ordered — Gateway then Txn Type is a different report from the reverse — but the
 * chips are alphabetical and stay where they are when picked, so every field has one fixed
 * place in the column to find it and to click it a second time. That leaves the sentence
 * underneath as the whole statement of the order, which is what it was written to be: it
 * reads the rule back as the shape of a row in the delivered file. `groupBy` is still the
 * only record of it; there is no separate selection-order state to fall out of step with it.
 */
export function GroupingStep({
  answers,
  onChange,
}: {
  answers: FieldsAnswers
  onChange: (next: FieldsAnswers) => void
}) {
  const { columns } = answers
  const groupBy = answers.groupBy ?? []

  /**
   * The grouping, in grouping order — the user's answer, read straight off `groupBy`.
   *
   * `groupBy` holds fields rather than column ids (answers.ts), so this is already what the
   * chips need, and it is what makes the answer stick: a field whose column is deleted on
   * the Fields step stays picked here, and the column organiser lights it purple again the
   * moment the column comes back.
   */
  const groupedFields = groupBy

  const isGrouped = (tag: string) => groupedFields.some((field) => sameField(field, tag))

  /**
   * Adds a level. The column is reused when the field is already in the table — appending a
   * second column with the same name would give the report two identical headers and leave
   * the Fields step with a chip it cannot fully deselect.
   */
  const group = (tag: string) => {
    const existing = columns.find((column) => sameField(fieldOf(column), tag))
    onChange({
      ...answers,
      // The column is reused when the field is already in the table — appending a second
      // column with the same name would give the report two identical headers and leave the
      // Fields step with a chip it cannot fully deselect.
      columns: existing ? columns : [...columns, newFieldColumn(tag)],
      groupBy: [...groupBy, tag],
    })
  }

  /** Drops a level, keeping the column — see the note above. */
  const ungroup = (tag: string) =>
    onChange({
      ...answers,
      groupBy: groupBy.filter((field) => !sameField(field, tag)),
    })

  const chip = (tag: string) => {
    const grouped = isGrouped(tag)
    return (
      <TagV2
        key={tag}
        text={tag}
        size={SHAPE.size}
        subType={SHAPE.subType}
        color={grouped ? TagV2Color.PURPLE : TagV2Color.NEUTRAL}
        type={SHAPE.type}
        aria-pressed={grouped}
        title={grouped ? `Stop grouping by ${tag}` : `Group the report by ${tag}`}
        rightSlot={grouped ? REMOVE_TAG_SLOT : ADD_TAG_SLOT}
        onClick={() => (grouped ? ungroup(tag) : group(tag))}
      />
    )
  }

  /**
   * The dimensions worth grouping by (GROUPABLE_FIELDS), plus anything already added as a
   * custom field.
   *
   * Narrower than the Fields step's vocabulary on purpose, and the reasoning is in
   * answers.ts: a measure and an identifier are both answerable here and neither produces a
   * report anyone wanted. Custom fields are still offered in full — their cardinality is not
   * ours to guess.
   */
  const vocabulary = [
    ...GROUPABLE_FIELDS,
    ...answers.customFields
      .map(({ title }) => title)
      .filter((title) => !GROUPABLE_FIELDS.some((tag) => sameField(tag, title))),
    // Alphabetical across the whole list rather than the design-system fields first and the
    // user's own appended after: a custom field is a field, and a name the user typed is the
    // one they are most likely to be looking for. Case-insensitively, matching `sameField` —
    // a chip typed in lower case belongs beside its neighbours, not in a block after Z.
  ].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))

  const picked = groupedFields

  return (
    <div className="flex w-full flex-col gap-6">
      {/* One column, aligned to the container's left edge, in one alphabetical order that a
          pick does not disturb. `items-start` keeps each chip at its own width inside the
          column — the floor below is a minimum, not a stretch — and the width itself is
          handed to index.css, which keeps no values of its own. */}
      <div
        className="grouping-palette flex w-full flex-col items-start gap-2"
        style={{ '--grouping-chip-min': `${CHIP_MIN_WIDTH}px` } as CSSProperties}
      >
        {vocabulary.map(chip)}
      </div>

      {/* Reads the rule back as the thing the user actually cares about — the shape of a row
          in the delivered file. */}
      <PrimitiveText
        as="p"
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[500]}
      >
        {picked.length === 0
          ? 'No grouping — the report keeps one row per record.'
          : `One row per ${picked.join(' + ')}.`}
      </PrimitiveText>
    </div>
  )
}
