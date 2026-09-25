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
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { ArrowRightLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { PrimitiveText, font } from '../../primitives'
import { fieldTagTokens, ghostSmallButtonTokens } from '../../theme'
import { ConditionIcon } from './condition-icons'
import {
  FIELD_TAGS,
  FILTER_CONDITIONS,
  conditionLabel,
  conditionTakesValue,
  isSetCondition,
  isSignRuleBlank,
  newSignRule,
  signRuleValuesFor,
  type SignRule,
  type SignRules,
  type ValueSign,
} from './answers'
import type { DataTransformLayout } from './data-transform-layout'

const { colors } = FOUNDATION_THEME

/** The section's two lines, under the title and under the last rule — gray[150], the stroke of
    the ELSE IF pill the lower one runs into. */
const DIVIDER = `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[150]}`

/**
 * The sign logic for an amount column, as an if / else-if chain with an else at the end —
 * the Filters step's rule grid (FiltersStep.tsx) with a fourth answer on every row: which way
 * the amount is written when the row matches.
 *
 * Borrowed from Filters rather than redrawn: the column, condition and value controls are the
 * same three, in the same order, with the same dependencies between them, so a user who has
 * built a filter already knows how to build one of these.
 */

/** The section card's inset, on every side. */
const CARD_PADDING = FOUNDATION_THEME.unit[20]

/** Same as the Filters step's column menu: ten rows, then it scrolls. */
const COLUMN_MENU_MAX_HEIGHT = 10 * 33 + 36 + 2

/** The sign track. Fixed rather than a share of the row: its answers are two short words. */
const SIGN_TRACK = 'w-36'

/** "ELSE IF" at the mono 14px is ~59px; 64 holds it on the 4px grid. */
const MARKER_TRACK = 'w-16'

const toggleValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value]

const group = (values: readonly string[]) => [
  { items: values.map((value) => ({ label: value, value })) },
]

const CONDITION_ITEMS = [
  {
    items: FILTER_CONDITIONS.map(({ id }) => ({
      label: conditionLabel(id),
      value: id,
      slot1: <ConditionIcon condition={id} color={colors.gray[500]} />,
    })),
  },
]

/** The glyph beside each sign — in the menu and, once chosen, in the trigger. */
const SIGN_ICON: Record<ValueSign, React.ReactNode> = {
  POSITIVE: <Plus size={14} color={colors.gray[500]} />,
  NEGATIVE: <Minus size={14} color={colors.gray[500]} />,
}

const SIGN_ITEMS = [
  {
    items: [
      { label: 'Positive', value: 'POSITIVE', slot1: SIGN_ICON.POSITIVE },
      { label: 'Negative', value: 'NEGATIVE', slot1: SIGN_ICON.NEGATIVE },
    ],
  },
]

/** A row's keyword gutter — IF, ELSE IF. */
function Marker({ children }: { children?: React.ReactNode }) {
  return (
    <div className={`flex h-8 ${MARKER_TRACK} shrink-0 items-center`}>
      <PrimitiveText
        // The Filters step's gutter type (code.lg, JetBrains Mono, regular) — see RowMarker
        // there. gray[600] rather than its gray[400]: there the gutter is a row number and
        // can sit back; here the keyword is the logic, and 400 fails contrast on white.
        {...font(FOUNDATION_THEME.font.size.code.lg)}
        fontFamily="var(--font-mono)"
        fontWeight={FOUNDATION_THEME.font.weight[400]}
        color={colors.gray[600]}
      >
        {children}
      </PrimitiveText>
    </div>
  )
}

/**
 * The delete button's track, held by a hidden copy of the button — the Filters step's trick,
 * so the header stays aligned with the rows if Blend's icon button ever changes size.
 */
function DeleteSpacer() {
  return (
    <div aria-hidden className="shrink-0" style={{ visibility: 'hidden' }}>
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        subType={ButtonV2SubType.ICON_ONLY}
        leftSlot={{ slot: <Trash2 size={14} /> }}
      />
    </div>
  )
}

const HEADER = font(FOUNDATION_THEME.font.size.body.sm)

function Headers({ layout }: { layout: DataTransformLayout }) {
  return (
    <div className="flex items-end" style={{ gap: layout.markerGap }}>
      <div className={`${MARKER_TRACK} shrink-0`} />
      <div className="flex min-w-0 flex-1 items-end" style={{ gap: layout.trackGap }}>
        {['Column', 'Condition', 'Value'].map((label) => (
          <div key={label} className="min-w-0 flex-1">
            <PrimitiveText {...HEADER} color={colors.gray[700]}>
              {label}
            </PrimitiveText>
          </div>
        ))}
        <div className={`${SIGN_TRACK} shrink-0`}>
          <PrimitiveText {...HEADER} color={colors.gray[700]}>
            Transform it to
          </PrimitiveText>
        </div>
      </div>
      <DeleteSpacer />
    </div>
  )
}

function RuleRow({
  rule,
  index,
  layout,
  onChange,
  onDelete,
}: {
  rule: SignRule
  index: number
  layout: DataTransformLayout
  onChange: (next: SignRule) => void
  onDelete: () => void
}) {
  // Left to right, each control waiting on the one before — the Filters step's rule, for its
  // reason: a condition means nothing until there is a column to ask it of.
  const conditionLocked = rule.column === null
  const valueLocked = conditionLocked || rule.condition === null
  const valueGone = !conditionTakesValue(rule.condition)
  const branch = index === 0 ? 'IF' : 'ELSE IF'
  // A typed-in value joins the list, so the trigger and the menu can still show it.
  const suggested = signRuleValuesFor(rule.column)
  const valueOptions = [...suggested, ...rule.value.filter((v) => !suggested.includes(v))]

  return (
    <div className="flex items-center" style={{ gap: layout.markerGap }}>
      <Marker>{branch}</Marker>
      <div className="flex min-w-0 flex-1 items-center" style={{ gap: layout.trackGap }}>
        <div className="min-w-0 flex-1">
          <SingleSelectV2
            aria-label={`${branch} column, rule ${index + 1}`}
            placeholder="Column"
            size={SingleSelectV2Size.SM}
            // Every field, not just the report's columns: the sign is decided on the source
            // row, which carries all of them.
            items={group(FIELD_TAGS)}
            selected={rule.column ?? ''}
            onSelect={(column) => onChange({ ...rule, column, condition: null, value: [] })}
            search={{ show: true, placeholder: 'Search columns' }}
            triggerDimensions={{ width: '100%' }}
            menuDimensions={{ maxHeight: COLUMN_MENU_MAX_HEIGHT }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <SingleSelectV2
            aria-label={`${branch} condition, rule ${index + 1}`}
            placeholder="Condition"
            size={SingleSelectV2Size.SM}
            items={CONDITION_ITEMS}
            selected={rule.condition ?? ''}
            onSelect={(condition) =>
              onChange({
                ...rule,
                condition,
                // A null test takes no value; a single-value test keeps only the first of a
                // set, so moving from "is in" to "equal to" never hides extra values.
                value: !conditionTakesValue(condition)
                  ? []
                  : isSetCondition(condition)
                    ? rule.value
                    : rule.value.slice(0, 1),
              })
            }
            triggerDimensions={{ width: '100%' }}
            disabled={conditionLocked}
            slot={
              rule.condition ? (
                <ConditionIcon condition={rule.condition} color={colors.gray[500]} />
              ) : undefined
            }
          />
        </div>
        {/* The track stays when a null test removes the control, as on the Filters step. */}
        <div className="min-w-0 flex-1">
          {valueGone ? null : isSetCondition(rule.condition) ? (
            // "is in" and "not in" test against a set, so the value is a multi-select.
            <MultiSelectV2
              // Empty: the "Value" header names the column (see FiltersStep).
              label=""
              aria-label={`${branch} values, rule ${index + 1}`}
              // Short, because MultiSelectV2 shows the placeholder *and* a count badge once
              // values are picked, in one ellipsised line — "Choose values" pushed the badge
              // out of this track entirely, so a filled rule looked empty.
              placeholder="Values"
              size={MultiSelectV2Size.SM}
              items={group(valueOptions)}
              selectedValues={rule.value}
              // A row toggles one value; the clear button hands back the whole list.
              onChange={(next) =>
                onChange({
                  ...rule,
                  value: Array.isArray(next) ? next : toggleValue(rule.value, next),
                })
              }
              search={{ show: true, placeholder: 'Search values' }}
              triggerDimensions={{ width: '100%' }}
              disabled={valueLocked}
              allowCustomValue
              customValueLabel="Use"
            />
          ) : (
            // Every other condition compares against one value — or has none picked yet, when
            // one value is the honest default to offer.
            <SingleSelectV2
              aria-label={`${branch} value, rule ${index + 1}`}
              placeholder="Value"
              size={SingleSelectV2Size.SM}
              items={group(valueOptions)}
              selected={rule.value[0] ?? ''}
              onSelect={(value) => onChange({ ...rule, value: [value] })}
              search={{ show: true, placeholder: 'Search values' }}
              triggerDimensions={{ width: '100%' }}
              disabled={valueLocked}
              allowCustomValue
              customValueLabel="Use"
            />
          )}
        </div>
        <div className={`${SIGN_TRACK} shrink-0`}>
          <SingleSelectV2
            aria-label={`${branch} transform it to, rule ${index + 1}`}
            placeholder="Sign"
            size={SingleSelectV2Size.SM}
            items={SIGN_ITEMS}
            selected={rule.sign ?? ''}
            onSelect={(sign) => onChange({ ...rule, sign: sign as ValueSign })}
            triggerDimensions={{ width: '100%' }}
            slot={rule.sign ? SIGN_ICON[rule.sign] : undefined}
          />
        </div>
      </div>
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        subType={ButtonV2SubType.ICON_ONLY}
        // The IF is never removed — the chain has to start somewhere — so on the first row
        // the same button clears it back to a fresh rule, and has nothing to do while it is
        // one already.
        aria-label={index === 0 ? `Clear rule 1` : `Delete rule ${index + 1}`}
        leftSlot={{ slot: <Trash2 size={14} /> }}
        disabled={index === 0 && isSignRuleBlank(rule)}
        onClick={onDelete}
      />
    </div>
  )
}

export function SignRulesEditor({
  value,
  layout,
  onChange,
}: {
  value: SignRules
  layout: DataTransformLayout
  onChange: (next: SignRules) => void
}) {
  const { rules } = value
  const setRules = (next: SignRule[]) => onChange({ ...value, rules: next })

  return (
    // One bordered card around the title and the rule builder, so the section sits on a
    // surface of its own inside the modal rather than floating in its padding. A card, so
    // DESIGN.md's radius 12; gray[200], the modal's own header and footer stroke.
    <div
      className="flex flex-col"
      style={{
        padding: CARD_PADDING,
        border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
        borderRadius: FOUNDATION_THEME.border.radius[12],
      }}
    >
      {/* The Data Transform glyph from the organiser row's menu (OrganiserRow.tsx), so the
          section wears the icon of the item that opened it. A 40px tile at radius 10 — between
          an input's 8 and a card's 12, as a 40px object is — neutral: a gray[50] wash and a
          gray[150] hairline, the glyph at 20 in gray[600]. Colour is left to the controls. */}
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center"
          style={{
            backgroundColor: colors.gray[50],
            border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[150]}`,
            borderRadius: FOUNDATION_THEME.border.radius[10],
          }}
        >
          <ArrowRightLeft size={20} color={colors.gray[600]} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          {/* 16px medium gray[700] — `font()` carries the 500. */}
          <PrimitiveText
            as="h3"
            {...font(FOUNDATION_THEME.font.size.body.lg)}
            color={colors.gray[700]}
          >
            Choose which data needs to be transformed
          </PrimitiveText>
          {/* gray[600], not 500: 500 on white is 4.49:1, a hair under AA's 4.5. */}
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.md)}
            fontWeight={FOUNDATION_THEME.font.weight[400]}
            color={colors.gray[600]}
          >
            For example, make refunds negative. If a row matches more than one rule, the top one
            applies.
          </PrimitiveText>
        </div>
      </div>

      {/* Between the section's title and the rule builder, in the same stroke as the ELSE IF
          line below, so the title reads as introducing the grid rather than as its first row.
          It runs out to the card's edges and sits the card's own padding under the title, so
          the title reads as the card's header, padded evenly above and below; the grid then
          starts `headingToControls` under it.
          blend-gap: no divider component, so a plain rule on a token border. */}
      <hr
        className="border-0"
        style={{
          borderTop: DIVIDER,
          margin: `${CARD_PADDING} -${CARD_PADDING} ${layout.headingToControls}px`,
        }}
      />

      {/* The headers sit closer to the first row than the rows sit to each other, as on the
          Filters step — they label the grid rather than being a row of it. */}
      <div className="flex flex-col gap-2">
        <Headers layout={layout} />
        <div className="flex flex-col" style={{ gap: layout.ruleGap }}>
          {rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={index}
              layout={layout}
              onChange={(next) => setRules(rules.map((r) => (r.id === rule.id ? next : r)))}
              onDelete={() =>
                setRules(
                  index === 0
                    ? // Same id, so the row keeps its place and its focus.
                      rules.map((r) => (r.id === rule.id ? { ...newSignRule(), id: r.id } : r))
                    : rules.filter((r) => r.id !== rule.id),
                )
              }
            />
          ))}

          {/* Below the last rule, under a hairline that closes the chain, and centred under the
              whole list, so the button reads as adding to the rules as a set rather than as part
              of the last one. The list's own row gap spaces the line from both.

              The line carries the keyword the next rule joins with, on a pill that breaks it:
              the Fields palette's resting chip (NO_FILL under fieldTagTokens), whose gray[150]
              hairline the line matches so the two read as one stroke. Hidden from assistive
              tech — the button's own label says what it adds.
              blend-gap: no divider component, so two plain rules on a token border. */}
          <div aria-hidden className="flex items-center">
            <hr className="m-0 flex-1 border-0" style={{ borderTop: DIVIDER }} />
            <ThemeProvider componentTokens={fieldTagTokens}>
              <TagV2
                text="ELSE IF"
                size={TagV2Size.MD}
                type={TagV2Type.NO_FILL}
                subType={TagV2SubType.ROUNDED}
                color={TagV2Color.NEUTRAL}
              />
            </ThemeProvider>
            <hr className="m-0 flex-1 border-0" style={{ borderTop: DIVIDER }} />
          </div>
          {/* Borderless: the pill above already draws a stroke, and a second one directly under
              it stacked two outlined shapes. Ghost rather than bare INLINE so it keeps a 32px
              hit area and a fill on hover (see ghostButton in theme.ts).
              blend-gap: ButtonV2 sets `cursor: default` with no prop or token to change it, so
              the pointer comes from this wrapper — same as the footer's Exit. */}
          <div className="flex justify-center [&_button]:cursor-pointer">
            <ThemeProvider componentTokens={ghostSmallButtonTokens}>
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.SMALL}
                subType={ButtonV2SubType.INLINE}
                text="Add new rule group"
                leftSlot={{ slot: <Plus size={14} /> }}
                onClick={() => setRules([...rules, newSignRule()])}
              />
            </ThemeProvider>
          </div>
        </div>
      </div>
    </div>
  )
}
