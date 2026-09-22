import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  MultiSelectV2,
  MultiSelectV2Size,
  SingleSelectV2,
  SingleSelectV2Size,
} from '@juspay/blend-design-system'
import { Plus, Trash2 } from 'lucide-react'
import emptyState from '../../assets/emptystatefilterstable.svg'
import { PrimitiveText, font } from '../../primitives'
import { ConditionIcon } from './condition-icons'
import {
  FIELD_TAGS,
  FILTER_CONDITIONS,
  conditionTakesValue,
  newFilterRule,
  valuesFor,
  type FilterRule,
  type FiltersAnswers,
} from './answers'

const { colors } = FOUNDATION_THEME

/**
 * How tall the column menu is allowed to get: ten rows, then it scrolls.
 *
 * Twenty-two columns opened at once is a wall of text rather than a list, and it runs past
 * the fold on a laptop. Ten is enough to see that scrolling is possible without the list
 * becoming the page.
 *
 * Measured rather than guessed. Blend puts `menuDimensions.maxHeight` on the whole menu
 * (SingleSelectV2Menu.tsx:246), which is `border-box`, so the sum is the ten 33px rows plus
 * the 36px search field above them plus the menu's own 1px borders. Leave the borders out
 * and the tenth row is clipped to a sliver — which is how this was first written.
 */
const COLUMN_MENU_MAX_HEIGHT = 10 * 33 + 36 + 2

/**
 * Add or remove one value from a rule's selection.
 *
 * Order is the order they were picked, and re-picking removes rather than re-appends, so a
 * value cannot appear twice — `allowCustomValue` means the same string can arrive both from
 * the list and from the keyboard.
 */
const toggleValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value]

/** One group, no label — every select on this step offers a flat list. */
const group = (values: readonly string[]) => [
  { items: values.map((value) => ({ label: value, value })) },
]

const CONDITION_ITEMS = [
  {
    items: FILTER_CONDITIONS.map(({ id }) => ({
      label: id,
      value: id,
      // Blend takes icons in menu items natively — `slot1` on SelectV2ItemType is a
      // ReactNode (SelectV2/types.ts:17). No need to drop them from the list and show them
      // only once selected.
      slot1: <ConditionIcon condition={id} color={colors.gray[500]} />,
    })),
  },
]

/**
 * The grid's column headers.
 *
 * Their own row, rather than `label` on the first rule's three selects — which is how the
 * design draws them, and how this was built until a header went missing. A null condition
 * removes its row's value control, and with the labels riding on those controls it took
 * "Value" with it, leaving the rows underneath with a value dropdown and nothing naming it.
 * A header that belongs to the grid cannot be deleted by one row's answer.
 *
 * The spacers mirror the marker gutter and the delete button so the three labels sit over
 * the tracks they name.
 */
function ColumnHeaders() {
  return (
    <div className="mb-2 flex items-end gap-5">
      {/* Mirrors RowMarker's gutter below — the two must move together or the headers
          drift off their tracks. */}
      <div className="w-6 shrink-0" />
      <div className="flex min-w-0 flex-1 items-end gap-3">
        {['Column', 'Condition', 'Value'].map((label) => (
          <div key={label} className="min-w-0 flex-1">
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[700]}
            >
              {label}
            </PrimitiveText>
          </div>
        ))}
      </div>
      {/* The delete button's track, held by a copy of the button itself rather than a
          hand-measured spacer. `visibility: hidden` keeps its width and drops it from both
          the page and the tab order, so the headers stay over their columns even if Blend's
          small icon button ever changes size — which a literal 34px here would not. */}
      <div aria-hidden className="shrink-0" style={{ visibility: 'hidden' }}>
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          subType={ButtonV2SubType.ICON_ONLY}
          leftSlot={{ slot: <Trash2 size={14} /> }}
        />
      </div>
    </div>
  )
}

/**
 * The gutter that carries the row number, then AND.
 *
 * 24px, not the design's own 26: the 4px grid (rule 10) wins over a 2px difference nobody
 * can see, and 24 centres the numeral just as well inside the h-8 row. The header spacer in
 * ColumnHeaders mirrors this width and has to change with it.
 */
function RowMarker({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-8 w-6 shrink-0 items-center justify-center">
      <PrimitiveText
        // `code.lg`, not `code.md`. The design names this step `font/size/code/md`, but the
        // installed scale calls the same 14/18 pair `lg` and its own `md` is 12/18 — so the
        // token that shares the design's *name* is a size smaller than the one that shares
        // its values. Matched on values.
        {...font(FOUNDATION_THEME.font.size.code.lg)}
        // The design's `font/family/number` is JetBrains Mono, not Blend's mono token
        // ('SF Mono', which only exists on Apple hardware). Self-hosted — see index.css.
        fontFamily="var(--font-mono)"
        // Regular, against rule 10's 500 for body copy, because the design specifies it and
        // this is a gutter numeral rather than copy — at 500 the markers compete with the
        // labels beside them instead of sitting behind the row.
        fontWeight={FOUNDATION_THEME.font.weight[400]}
        color={colors.gray[400]}
        textAlign="center"
      >
        {children}
      </PrimitiveText>
    </div>
  )
}

function RuleRow({
  rule,
  index,
  onChange,
  onDelete,
}: {
  rule: FilterRule
  index: number
  onChange: (next: FilterRule) => void
  onDelete: () => void
}) {
  // The row answers left to right, and each control waits on the one before it. Not
  // house style — each genuinely depends on its predecessor: the conditions worth offering
  // depend on what kind of column was picked, and the values worth offering depend on both.
  // A condition without a column is not a half-built filter, it is a question about nothing.
  const conditionLocked = rule.column === null
  const valueLocked = conditionLocked || rule.condition === null
  // `is null` / `is not null` ask about the absence of a value, so once one is picked there
  // is no third question — the control is removed rather than disabled. Disabling it would
  // leave a greyed box implying something is still to be answered.
  const valueGone = !conditionTakesValue(rule.condition)
  const first = index === 0

  return (
    <div className="flex items-end gap-5">
      <RowMarker>{first ? '1' : 'AND'}</RowMarker>
      {/* Three equal tracks. The wrappers do the sharing, not the selects: SingleSelectV2
          renders a button that sizes to its own content, so `flex-1` has to sit on something
          around it — and `min-w-0` is what lets a long column name shrink rather than push
          the row wider than the 702px the design gives it. */}
      <div className="flex min-w-0 flex-1 items-end gap-3">
        <div className="min-w-0 flex-1">
          <SingleSelectV2
            placeholder="Choose a column"
            size={SingleSelectV2Size.SM}
            items={group(FIELD_TAGS)}
            selected={rule.column ?? ''}
            // Changing the column invalidates what was chosen under it — a value that came
            // from Gateway means nothing once the column is Txn Amount. Cleared here rather
            // than left to look answered.
            onSelect={(column) => onChange({ ...rule, column, condition: null, value: [] })}
            search={{ show: true, placeholder: 'Search columns' }}
            triggerDimensions={{ width: '100%' }}
            menuDimensions={{ maxHeight: COLUMN_MENU_MAX_HEIGHT }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <SingleSelectV2
            placeholder="Choose a condition"
            size={SingleSelectV2Size.SM}
            items={CONDITION_ITEMS}
            selected={rule.condition ?? ''}
            onSelect={(condition) =>
              // Drop a value the new condition cannot carry, rather than keeping it out
              // of sight behind a disabled control and still feeding it to the count.
              onChange({
                ...rule,
                condition,
                value: conditionTakesValue(condition) ? rule.value : [],
              })
            }
            search={{ show: true, placeholder: 'Search conditions' }}
            triggerDimensions={{ width: '100%' }}
            disabled={conditionLocked}
            // The trigger keeps the glyph after the menu closes: `slot1` dresses the item in
            // the list, `slot` dresses the control.
            slot={
              rule.condition ? (
                <ConditionIcon condition={rule.condition} color={colors.gray[500]} />
              ) : undefined
            }
          />
        </div>
        {/* The track stays even when the control does not. `flex-1` belongs to this
            wrapper rather than to the select, so hiding the select leaves the third of the
            row it occupied exactly where it was — the other two keep their 226px and
            nothing reflows. An empty wrapper has no height of its own either, and the row
            is `items-end`, so its height still comes from the two selects beside it. */}
        <div className="min-w-0 flex-1">
          {valueGone ? null : (
            <MultiSelectV2
              // Required by MultiSelectV2 where SingleSelectV2 leaves it optional, and
              // empty on purpose: the column already carries a "Value" header above the
              // grid, and InputLabels renders nothing for a falsy label
              // (InputLabels.tsx:48), so this adds no second one and no extra height.
              label=""
              placeholder="Choose a value"
              size={MultiSelectV2Size.SM}
              items={group(valuesFor(rule.column))}
              selectedValues={rule.value}
              // Two shapes reach this, and they are not interchangeable: a menu row calls
              // back with the one value it toggled (MultiSelectV2MenuItem.tsx:10), while
              // the trigger's clear button calls back with the whole new list — `[]`
              // (MultiSelectV2.tsx:168). Treating the array as a toggle would add the
              // string "" to the selection.
              onChange={(next) =>
                onChange({
                  ...rule,
                  value: Array.isArray(next) ? next : toggleValue(rule.value, next),
                })
              }
              search={{ show: true, placeholder: 'Search values' }}
              triggerDimensions={{ width: '100%' }}
              disabled={valueLocked}
              // Most columns have no closed set of values to offer, so typing one has to be
              // allowed — otherwise the select would open onto nothing.
              allowCustomValue
              customValueLabel="Use"
            />
          )}
        </div>
      </div>
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        subType={ButtonV2SubType.ICON_ONLY}
        aria-label={`Delete filter ${index + 1}`}
        leftSlot={{ slot: <Trash2 size={14} /> }}
        onClick={onDelete}
      />
    </div>
  )
}

/**
 * Step 4 — the rows the report keeps (nodes 4518:10046 empty, 4521:12504 / 4520:12023 with
 * rules).
 *
 * Two states rather than one with things hidden: with no rules the step is a card and an
 * illustration explaining what filters are for, and with rules it is a grid. Deleting the
 * last rule returns the card, which is why the empty state is a branch here and not a
 * separate step.
 */
export function FiltersStep({
  answers,
  onChange,
}: {
  answers: FiltersAnswers
  onChange: (next: FiltersAnswers) => void
}) {
  const { rules } = answers
  const setRules = (next: FilterRule[]) => onChange({ rules: next })
  const addRule = () => setRules([...rules, newFilterRule()])

  if (rules.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-8 px-1 py-8"
        style={{
          // Dashed, not solid: the card stands in for rules that do not exist yet, and a dashed
          // stroke reads as a temporary placeholder where a solid one reads as a finished
          // container. One step darker than the solid rule was, because the gaps in a dash
          // make the same colour read lighter.
          border: `1px dashed ${colors.gray[300]}`,
          borderRadius: FOUNDATION_THEME.border.radius[12],
        }}
      >
        <div className="flex flex-col items-center">
          {/* Both dimensions fixed and the image filling them: sized `auto` an SVG renders
                at its intrinsic size, which is not always the frame it was drawn in. */}
          <div className="h-[140px] w-[264px] overflow-clip">
            <img src={emptyState} alt="" className="block h-full w-full" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.md)}
              color={colors.gray[950]}
            >
              No filters selected
            </PrimitiveText>
            {/* 188, not the design's 184, to land the same two-line break — "Adding
                  filters help you narrow / down the rows in your report".

                  The design draws this at Inter Display Regular; rule 10 puts our body copy
                  at 500, and the heavier cut measures that first line at 185px, one pixel
                  wider than the box it was drawn in, which pushed it to three lines. The
                  window is 185 to 222 — past 222 "down" pulls up onto line one — so 188 sits
                  inside it with room for the font to move. */}
            <div className="w-[188px]">
              <PrimitiveText
                as="p"
                {...font(FOUNDATION_THEME.font.size.body.md)}
                color={colors.gray[400]}
                // PrimitiveText writes textAlign into its own style object and defaults it
                // to 'left' (PrimitiveText.tsx:102), so a wrapper's text-center never wins.
                textAlign="center"
              >
                Adding filters help you narrow down the rows in your report
              </PrimitiveText>
            </div>
          </div>
        </div>

        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          subType={ButtonV2SubType.DEFAULT}
          text="Add a filter"
          // V2 groups its slots into objects — `leftIcon` is the V1 spelling and would be
          // dropped in silence (AGENTS.md rule 2).
          leftSlot={{ slot: <Plus size={14} /> }}
          onClick={addRule}
        />
      </div>
    )
  }

  return (
    <div>
      <ColumnHeaders />
      <div className="flex flex-col gap-5">
        {rules.map((rule, index) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            index={index}
            onChange={(next) => setRules(rules.map((r) => (r.id === rule.id ? next : r)))}
            // Deleting the last row is not special-cased: `rules` empties and the branch above
            // takes over, which is the empty state coming back.
            onDelete={() => setRules(rules.filter((r) => r.id !== rule.id))}
          />
        ))}

        <div className="flex items-center gap-5">
          {/* The design keeps the marker's track here at zero opacity rather than removing it,
            so the button below lines up with the selects above rather than the numbers. */}
          <RowMarker />
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            subType={ButtonV2SubType.DEFAULT}
            text="Add another filter"
            leftSlot={{ slot: <Plus size={14} /> }}
            onClick={addRule}
          />
        </div>
      </div>
    </div>
  )
}
