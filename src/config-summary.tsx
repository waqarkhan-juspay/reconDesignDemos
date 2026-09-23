/**
 * The configuration summary card — one config read back as a list of label/value rows.
 *
 * Two screens show the same thing and used to draw it two different ways: the create flow's
 * Review step had a six-across grid of cells, and the Configurator's detail sheet had a bare
 * stack of pairs. Same facts, same words, two layouts — so a change to one silently left the
 * other behind. This is the one layout both now use.
 *
 * ## The shape, and why
 *
 * A bordered card with a header row and hairline-separated rows under it. Rules rather than
 * space, which is the exception better-layout allows and not the default: this is a long
 * settings list where every row is a label beside a value, the rows are the same shape all
 * the way down, and space alone at that density would need more height than the panel has.
 * The hairline is kept quiet — 1px of gray[200], no fill, no zebra — so it separates without
 * drawing a grid.
 *
 * ## What is Blend's and what is ours
 *
 * Every row is a `KeyValuePairV2`, every chip a `TagV2`, every action a `ButtonV2`. What is
 * not Blend is the card and the rules between rows:
 *
 * blend-gap: Blend 0.0.37 ships no description-list or settings-panel component. CardV2 is
 * the nearest surface, but its body owns its own padding and its header takes a title and
 * slots rather than a full-bleed row, so a row that has to run edge to edge and carry a
 * hairline cannot sit in it. Composed from tokens instead (rule 13).
 */

import {
  FOUNDATION_THEME,
  KeyValuePairV2,
  KeyValuePairV2Size,
  KeyValuePairV2StateType,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from '@juspay/blend-design-system'
import type { CSSProperties, ReactNode } from 'react'
import { PrimitiveText, font } from './primitives'

const { colors } = FOUNDATION_THEME

/**
 * Nothing answered yet.
 *
 * Words rather than an em dash. A dash says "there is no value here", which is right for a
 * config that genuinely has no filters, and wrong for one whose category simply has not been
 * chosen — the first is finished, the second is not. "Not set" is the difference, and it is
 * the one the Review step needs, since its whole job is showing what is still missing.
 */
export const UNSET = 'Not set'

/**
 * The card's own values, handed to index.css as custom properties.
 *
 * Here rather than in the stylesheet so every one of them stays on FOUNDATION_THEME
 * (rule 1) and the stylesheet keeps no second copy of a token. `--summary-key-column` is
 * overridable per instance — the Review step has a full page of width to give a label, the
 * detail sheet has 600px total — so it is read with a fallback and set by the caller.
 */
const CARD_VARS = {
  '--summary-line': `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
  '--summary-radius': FOUNDATION_THEME.border.radius[12],
  '--summary-surface': colors.gray[0],
  /* The placeholder colour, for a value that is not an answer. DESIGN.md §7 reserves
     gray[400] for exactly this — placeholders and disabled — so a row reading "Not set"
     says so by weight as well as by word. */
  '--summary-muted': colors.gray[400],
  '--summary-pad-x': FOUNDATION_THEME.unit[20],
  '--summary-pad-y': FOUNDATION_THEME.unit[16],
  /* The gap between the label column and the value, matching KeyValuePairV2's own
     `gap.horizontal` so a chip row and a text row line their values up on the same x. */
  '--summary-gap': FOUNDATION_THEME.unit[32],
  /* Named so index.css's @container rule has something to query. Set here rather than in the
     stylesheet because `container-type: inline-size` establishes a containment context, and
     that is a property of this element — not something a global rule should be adding to
     every `.config-summary` it happens to match before the element exists. */
  containerType: 'inline-size',
  containerName: 'config-summary',
} as CSSProperties

export function ConfigSummaryCard({
  title,
  action,
  keyColumn = '220px',
  children,
}: {
  /** Omit where the card already sits under a heading — an accordion, a section title. */
  title?: string
  /** The trailing control on the header row — an Edit button, a count tag, or nothing. */
  action?: ReactNode
  /** Width of the label column. Narrow it where the card is in a panel rather than a page. */
  keyColumn?: string
  children: ReactNode
}) {
  return (
    <div
      className="config-summary"
      style={{ ...CARD_VARS, '--summary-key-column': keyColumn } as CSSProperties}
    >
      {/* The header is a row of the card, not a caption above it: it carries the card's top
          radius and the action that applies to everything below. `gap-3` so a long
          configuration name shortens rather than pushing the action off the edge. */}
      {(title || action) && (
        <div className="config-summary-header flex items-center justify-between gap-3">
          <PrimitiveText
            as="h3"
            {...font(FOUNDATION_THEME.font.size.body.lg)}
            color={colors.gray[900]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {title ?? ''}
          </PrimitiveText>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * One row: a label beside its value.
 *
 * `KeyValuePairV2` horizontal, which is Blend's own component for exactly this pair — key at
 * gray[500]/400, value at gray[700]/500, and the aria wiring (`role="term"` /
 * `role="definition"`, the value labelled by the key) that a hand-built row would have to
 * remember. The 50/50 split its `space-between` layout gives is corrected in index.css, the
 * same way the detail sheet already corrected it.
 *
 * `muted` is for a value that is not an answer — "Not set", an em dash — which reads at
 * gray[400], the placeholder colour, so an unanswered row is visibly unanswered rather than
 * looking like a config whose category is literally a dash.
 */
export function ConfigSummaryRow({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="config-summary-row" data-muted={muted || undefined}>
      <KeyValuePairV2
        keyString={label}
        value={value}
        size={KeyValuePairV2Size.SM}
        keyValuePairState={KeyValuePairV2StateType.horizontal}
        // Never `truncate`: this is the config read back, and a value you cannot finish
        // reading is the one thing a read-back must not do.
        textOverflow="wrap"
        maxWidth="100%"
        showTooltipOnTruncate={false}
      />
    </div>
  )
}

/**
 * A row whose value is a set of chips rather than a sentence — the columns, the filters.
 *
 * Not a `KeyValuePairV2`, because its `value` is a string: the component renders text, and a
 * list of tags is not text. So the label is drawn to match the pair's key exactly (gray[500],
 * body.md, weight 400 — keyValuePairV2.light.tokens.ts) and the chips sit where the value
 * would, on the same column the CSS gives every other row.
 */
export function ConfigSummaryChipRow({
  label,
  children,
  empty,
}: {
  label: string
  children: ReactNode
  /** Shown in place of the chips when there are none, at the muted value colour. */
  empty?: string
}) {
  return (
    <div className="config-summary-row config-summary-chips">
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[500]}
        fontWeight={FOUNDATION_THEME.font.weight[400]}
      >
        {label}
      </PrimitiveText>
      {empty ? (
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[400]}>
          {empty}
        </PrimitiveText>
      ) : (
        <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  )
}

/**
 * A chip naming one column or one filter.
 *
 * NEUTRAL/SUBTLE and squarical, matching the field chips the Fields step already uses, so a
 * column named here and the same column named there are visibly the same object — which is
 * also why `color` is the one thing a caller can move. PURPLE/SUBTLE is the flow's mark for
 * a grouped field, worn by the chip on the Grouping step and by both the chip and the row in
 * the column organiser; a purple chip here is the same field still wearing it. WARNING/SUBTLE
 * — orange — is the same idea for a custom field, the colour of its "Custom" mark.
 *
 * `title` rather than more text, for a fact the chip is not primarily about: which grouping
 * level it is. TagV2 forwards it to the rendered element, so it arrives as a tooltip.
 */
/**
 * One column in a numbered column list — the Review step's and the detail sheet's.
 *
 * The mark is both colour and words: purple and "(grouped)" for a field the report groups
 * by, orange and "(custom)" for a field the user wrote. The colour matches what the same
 * field wears on the Grouping step and in the column organiser; the words say it for a
 * reader who has not met those colours, or cannot tell them apart. Grouping wins where a
 * custom field is also grouped, as it does in the palette — what the report does with a
 * field outranks where it came from. The grouping level, which neither carries, is the
 * tooltip, and only when there is more than one level to tell apart.
 */
export type ColumnMark = { grouping?: { level: number; of: number }; custom?: boolean }

export const columnChip = (
  position: number,
  name: string,
  key: string,
  { grouping, custom }: ColumnMark = {},
) => {
  const text = `${position} · ${name}`
  if (grouping)
    return summaryChip(`${text} (grouped)`, key, {
      color: TagV2Color.PURPLE,
      title: grouping.of > 1 ? `Grouping level ${grouping.level} of ${grouping.of}` : undefined,
    })
  if (custom) return summaryChip(`${text} (custom)`, key, { color: TagV2Color.WARNING })
  return summaryChip(text, key)
}

export const summaryChip = (
  text: string,
  key?: string,
  { color = TagV2Color.NEUTRAL, title }: { color?: TagV2Color; title?: string } = {},
) => (
  <TagV2
    key={key ?? text}
    text={text}
    size={TagV2Size.SM}
    subType={TagV2SubType.SQUARICAL}
    color={color}
    type={TagV2Type.SUBTLE}
    title={title}
  />
)
