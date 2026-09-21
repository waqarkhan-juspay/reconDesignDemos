import {
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from '@juspay/blend-design-system'
import { X } from 'lucide-react'
import { PrimitiveText, font } from '../../primitives'
import {
  FIELD_TAGS,
  newFieldColumn,
  sameField,
  type FieldsAnswers,
} from './answers'

const { colors } = FOUNDATION_THEME

/**
 * The remove glyph on a lit chip — the same 12px `X` the Fields step uses, drawn gray[0]
 * because ATTENTIVE/NEUTRAL paints its label on a near-black chip and a currentColor glyph
 * would be invisible against it.
 */
const REMOVE_TAG_SLOT = { slot: <X size={12} color={colors.gray[0]} /> }

/** The shipped chip shape, matching the Fields step's own default (TAG_SHAPE.current). */
const SHAPE = {
  size: TagV2Size.SM,
  subType: TagV2SubType.ROUNDED,
  offType: TagV2Type.NO_FILL,
} as const

/**
 * Flow version 2's Grouping step — the field vocabulary asked as its own question, before the
 * columns are chosen (see flow-layout.tsx).
 *
 * ## What selecting a tag does
 *
 * Grouping by a field the report does not contain is not a thing you can deliver, so picking
 * a tag here **adds it as a column** as well as adding a grouping level. That inverts the
 * rule GroupByBar states for version 1, where the picker can only offer columns that already
 * exist — and it has to invert, because this step runs before there are any columns.
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
 * Grouping is ordered — Gateway then Txn Type is a different report from the reverse — so the
 * picked chips lead the row in grouping order rather than sitting in place, and the sentence
 * underneath reads the order back. `groupBy` is the only record of it; there is no separate
 * selection-order state to fall out of step with it.
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

  /** The grouping, as titles, in grouping order. Ids with no column left are dropped. */
  const groupedTitles = groupBy.flatMap(
    (id) => columns.find((column) => column.id === id)?.title ?? [],
  )

  const isGrouped = (tag: string) => groupedTitles.some((title) => sameField(title, tag))

  /**
   * Adds a level. The column is reused when the field is already in the table — appending a
   * second column with the same name would give the report two identical headers and leave
   * the Fields step with a chip it cannot fully deselect.
   */
  const group = (tag: string) => {
    const existing = columns.find(({ title }) => sameField(title, tag))
    if (existing) {
      onChange({ ...answers, groupBy: [...groupBy, existing.id] })
      return
    }
    const column = newFieldColumn(tag)
    onChange({
      ...answers,
      columns: [...columns, column],
      groupBy: [...groupBy, column.id],
    })
  }

  /** Drops a level, keeping the column — see the note above. */
  const ungroup = (tag: string) =>
    onChange({
      ...answers,
      groupBy: groupBy.filter((id) => {
        const column = columns.find((other) => other.id === id)
        return !column || !sameField(column.title, tag)
      }),
    })

  const chip = (tag: string) => {
    const grouped = isGrouped(tag)
    return (
      <TagV2
        key={tag}
        text={tag}
        size={SHAPE.size}
        subType={SHAPE.subType}
        color={TagV2Color.NEUTRAL}
        type={grouped ? TagV2Type.ATTENTIVE : SHAPE.offType}
        aria-pressed={grouped}
        title={grouped ? `Stop grouping by ${tag}` : `Group the report by ${tag}`}
        rightSlot={grouped ? REMOVE_TAG_SLOT : undefined}
        onClick={() => (grouped ? ungroup(tag) : group(tag))}
      />
    )
  }

  /**
   * The vocabulary offered here is the same one the Fields step offers: Blend's field list,
   * plus anything already added as a custom field. Deliberately the whole list rather than
   * some "groupable" subset — which fields summarise usefully is the user's call, and a
   * filtered list would be this file quietly holding an opinion it cannot justify.
   */
  const vocabulary = [
    ...FIELD_TAGS,
    ...answers.customFields
      .map(({ title }) => title)
      .filter((title) => !FIELD_TAGS.some((tag) => sameField(tag, title))),
  ]

  const picked = groupedTitles
  const offered = vocabulary.filter((tag) => !isGrouped(tag))

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-wrap items-start gap-x-3 gap-y-3">
        {picked.map(chip)}

        {/* The rule and the first offered chip wrap as one unit, so the rule can never end a
            line on its own and divide nothing. Only drawn with something on both sides. */}
        {picked.length > 0 && offered.length > 0 && (
          <span className="flex items-center gap-x-3">
            {/* blend-gap: Blend 0.0.37 ships no divider component, so this is a 1px rule on a
                token colour. */}
            <span
              role="separator"
              aria-orientation="vertical"
              className="h-4 w-px"
              style={{ backgroundColor: colors.gray[300] }}
            />
            {chip(offered[0])}
          </span>
        )}
        {(picked.length > 0 ? offered.slice(1) : offered).map(chip)}
      </div>

      {/* Reads the rule back as the thing the user actually cares about — the shape of a row
          in the delivered file. The same sentence GroupByBar draws under version 1's bar, so
          the two versions say the same thing about the same answer. */}
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
