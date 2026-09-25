import {
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { Check, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { SLOT_ICON } from '../../icons'
import { PrimitiveText, font } from '../../primitives'
import { fieldTagTokens } from '../../theme'
import { GROUPABLE_FIELDS, newFieldColumn, fieldOf, sameField, type FieldsAnswers } from './answers'

const { colors } = FOUNDATION_THEME

/**
 * The mark on a picked chip — a 12px check, drawn purple[600] to match the label beside it.
 * SUBTLE/PURPLE colours its text purple[600] (tagV2.light.tokens.ts), so a gray glyph would be
 * the one cold thing inside a warm chip.
 *
 * A check rather than an `X`: the chip says what state the field is in — the report groups by
 * it — rather than what clicking it does next. Beside the `+` on an unpicked chip, the pair
 * reads as off and on, like a checkbox. Clicking a picked chip still ungroups it, and its
 * title says so.
 */
const PICKED_TAG_SLOT = { slot: <Check {...SLOT_ICON} color={colors.purple[600]} /> }

/**
 * The other half of that pair: `+` on a field the report does not group by yet, gray[500]
 * against the chip's own gray[50], which is the same plus the column organiser's palette
 * draws (ColumnOrganiser's ADD_SLOT). Both lists are the same vocabulary asked the same way
 * — click to add — so they say it with the same glyph.
 */
const ADD_TAG_SLOT = { slot: <Plus {...SLOT_ICON} color={colors.gray[500]} /> }

/**
 * The chip shape — squarical, like the Fields step's chips, but lg rather than their md: 28px
 * tall on 6/12 padding with an 8px radius, where md is 24 on 4/10 at 6. The label stays
 * 14px/500 either way. This step is a short list asked on its own, so each chip is a target
 * worth a little more room; the Fields palette runs to twenty-nine and keeps md.
 *
 * An offered field is drawn exactly as the column organiser's palette draws a field not yet in
 * the report (ColumnOrganiser.tsx): NO_FILL under `fieldTagTokens`, so a gray[150] hairline on
 * the page's own white with a gray[500] `+`. A picked one is SUBTLE and purple. Purple rather
 * than a darker neutral because this mark has to survive the trip to the next step — the
 * Fields step repeats it on the chip and on the row (ColumnOrganiser, OrganiserRow), which is
 * how a grouped record stays recognisable after you have stopped looking at the step that made
 * it one. A second shade of grey could not carry that; it would read as "selected", which every
 * chip over there already is.
 */
const SHAPE = {
  size: TagV2Size.LG,
  subType: TagV2SubType.SQUARICAL,
} as const

/**
 * The floor every chip in the column is at least this wide — see `.grouping-palette` in
 * index.css, which is where it has to be applied because TagV2 accepts no width.
 *
 * Sized against the whole field vocabulary rather than the eight or nine dimensions this
 * step happens to offer today (FIELD_TAGS, answers.ts). Its longest name, Recon Secondary
 * Sub Status, sets the measure at 182px of label; an lg chip adds 24px of padding, 2px of
 * border and 18px for the gap and the right slot, which lands on 226 and rounds up the 4px grid
 * to 228. GROUPABLE_FIELDS is a subset that has already grown once, and a floor that has to be
 * re-measured every time a dimension is added is a floor nobody will re-measure.
 *
 * A custom field longer than that simply grows past it; this is a floor, not a column width.
 */
const CHIP_MIN_WIDTH = 228

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
    const tagV2 = (
      <TagV2
        text={tag}
        size={SHAPE.size}
        subType={SHAPE.subType}
        color={grouped ? TagV2Color.PURPLE : TagV2Color.NEUTRAL}
        type={grouped ? TagV2Type.SUBTLE : TagV2Type.NO_FILL}
        aria-pressed={grouped}
        title={grouped ? `Stop grouping by ${tag}` : `Group the report by ${tag}`}
        rightSlot={grouped ? PICKED_TAG_SLOT : ADD_TAG_SLOT}
        onClick={() => (grouped ? ungroup(tag) : group(tag))}
      />
    )
    // Only an offered chip takes the palette's tokens. They would also send a picked chip's
    // purple wash back to the neutral fill (see fieldTagTokens), and here the wash is what
    // says the report groups by it.
    return grouped ? (
      <span key={tag} className="contents">
        {tagV2}
      </span>
    ) : (
      <ThemeProvider key={tag} componentTokens={fieldTagTokens}>
        {tagV2}
      </ThemeProvider>
    )
  }

  /**
   * The dimensions worth grouping by (GROUPABLE_FIELDS), and only those.
   *
   * Narrower than the Fields step's vocabulary on purpose, and the reasoning is in
   * answers.ts: a measure and an identifier are both answerable here and neither produces a
   * report anyone wanted.
   *
   * No custom fields, for the reason the Fields step's palette has none (ColumnOrganiser.tsx):
   * a custom column is one the user made, not a field the data carries, so it is not offered
   * as something to group the data by.
   */
  const vocabulary = GROUPABLE_FIELDS

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
          in the delivered file.

          Only once something is picked. On an untouched step the sentence could only say
          there is no grouping yet, which the step's own heading and disabled Continue already
          say — so it arrives with the first pick instead, as that pick's consequence. */}
      {picked.length > 0 && (
        <PrimitiveText
          as="p"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[500]}
        >
          One row per {picked.join(' + ')}.
        </PrimitiveText>
      )}
    </div>
  )
}
