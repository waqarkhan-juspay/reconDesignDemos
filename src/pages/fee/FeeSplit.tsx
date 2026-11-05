/**
 * Layout 3 — the split view, Figma frame 2268:9641: every rule in a list on the left, the
 * one you picked opened on the right.
 *
 * The search field moves inside the list pane here, which is why this layout takes the query
 * rather than letting the page draw a search row above it: the field belongs to the thing it
 * filters, and a page-level field above a split view would look like it searched both halves.
 * The field itself is the shared one (tags.tsx) — only where it sits is this layout's.
 *
 * Selection lives here rather than in the page. It is this layout's own state — the other two
 * have nothing to select — and keeping it local means switching away and back starts clean
 * instead of restoring a rule that may no longer be in the filtered list.
 *
 * blend-gap: `CardV2` cannot be the frame. Its padding scale stops at 12px, it strips
 * `style`, and a two-pane split with its own internal scrolling is not a card's shape at all
 * — there is no slot for a full-height bordered column. So the frame and the panes are
 * composed; the tags, buttons and input inside them are Blend's.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2Size,
} from '@juspay/blend-design-system'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { font, PrimitiveText } from '../../primitives'
import { PANEL_STYLE } from '../pacb/helpers'
import { MODE_HINT, ruleSummary, type FeeRule } from './data'
import { Empty, Kebab, MethodTags, PspNameTags, RuleSearch, StatusTag } from './tags'

const { colors } = FOUNDATION_THEME

/** The design's split: 376px of list, the rest detail, in a 764px frame. */
const LIST_WIDTH = 376
const SPLIT_HEIGHT = 764

const SPLIT_STYLE: CSSProperties = {
  ...PANEL_STYLE,
  '--split-height': `${SPLIT_HEIGHT}px`,
} as CSSProperties

const LIST_PANE_STYLE: CSSProperties = {
  borderColor: colors.gray[200],
  borderStyle: 'solid',
  '--list-width': `${LIST_WIDTH}px`,
} as CSSProperties

const DIVIDER_STYLE: CSSProperties = { backgroundColor: colors.gray[200] }

const ROW_RADIUS = FOUNDATION_THEME.border.radius[8]

/**
 * One row of the list: what the rule is called and how it stands, what it covers, and the
 * rate at the far end — enough to choose between two rules without opening either.
 */
function ListRow({
  rule,
  isSelected,
  onSelect,
}: {
  rule: FeeRule
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected ? 'true' : undefined}
      className="flex h-[50px] w-full shrink-0 cursor-pointer items-center gap-3 border-none px-2 text-left"
      style={{
        backgroundColor: isSelected ? colors.gray[50] : 'transparent',
        borderRadius: ROW_RADIUS,
      }}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="flex min-w-0 items-center gap-2 overflow-hidden">
          <PrimitiveText
            as="span"
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
            truncate
          >
            {rule.name}
          </PrimitiveText>
          <StatusTag status={rule.status} />
        </span>
        <PrimitiveText
          as="span"
          {...font(FOUNDATION_THEME.font.size.body.xs)}
          color={colors.gray[500]}
          truncate
        >
          {ruleSummary(rule)}
        </PrimitiveText>
      </span>
      <PrimitiveText
        as="span"
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[700]}
        style={{ whiteSpace: 'nowrap' }}
      >
        {rule.rate}
      </PrimitiveText>
    </button>
  )
}

/** A labelled column of the detail's meta row — the label, then whatever it introduces. */
function MetaColumn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-start gap-2 overflow-hidden">
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.xs)}
        color={colors.gray[500]}
        style={{ whiteSpace: 'nowrap' }}
      >
        {label}
      </PrimitiveText>
      {children}
    </div>
  )
}

/** A meta column whose content is a value and a line explaining it. */
function MetaValue({ value, hint }: { value: string; hint: string }) {
  return (
    <div className="flex flex-col items-start gap-1 overflow-hidden">
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[700]}
        style={{ whiteSpace: 'nowrap' }}
      >
        {value}
      </PrimitiveText>
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.sm)}
        color={colors.gray[500]}
        style={{ whiteSpace: 'nowrap' }}
      >
        {hint}
      </PrimitiveText>
    </div>
  )
}

function Detail({ rule }: { rule: FeeRule }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[22px] overflow-y-auto p-7">
      <div className="flex w-full items-start gap-3 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2 overflow-hidden">
          <PrimitiveText
            as="h2"
            {...font(FOUNDATION_THEME.font.size.heading.md)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
            truncate
          >
            {rule.name}
          </PrimitiveText>
          {/* SM rather than the XS the lists use: here the status is the second thing on the
              page, not a marker beside a name in a row of ten. */}
          <StatusTag status={rule.status} size={TagV2Size.SM} />
        </div>
        <div className="flex shrink-0 items-start gap-1.5">
          <ButtonV2 text="Edit" buttonType={ButtonV2Type.SECONDARY} size={ButtonV2Size.SMALL} />
          <ButtonV2
            text="Duplicate"
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
          />
          <Kebab name={rule.name} />
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-2.5 overflow-hidden">
        <div className="flex items-baseline gap-3 overflow-hidden whitespace-nowrap">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.heading.xl)}
            color={colors.gray[700]}
          >
            {rule.rate}
          </PrimitiveText>
          {rule.rateCaption && (
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[500]}
            >
              {rule.rateCaption}
            </PrimitiveText>
          )}
        </div>
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
          {rule.description}
        </PrimitiveText>
      </div>

      <div className="h-px w-full shrink-0" style={DIVIDER_STYLE} />

      {/* Columns, wrapping: five of them fit a 939px pane and stack onto a second line below
          it, which is why the row gap (18) is set apart from the column gap (24). */}
      <div className="flex w-full flex-wrap items-start gap-x-6 gap-y-[18px]">
        <MetaColumn label="PSPS">
          <div className="flex flex-col items-start gap-1.5">
            <PspNameTags psps={rule.psps} />
          </div>
        </MetaColumn>
        <MetaColumn label="PAYMENT METHODS">
          <div className="flex flex-wrap items-start gap-1.5">
            <MethodTags methods={rule.methods} />
          </div>
        </MetaColumn>
        <MetaColumn label="FEE MODE">
          <MetaValue value={rule.mode} hint={MODE_HINT[rule.mode]} />
        </MetaColumn>
        <MetaColumn label="VALID">
          <MetaValue value={rule.effective} hint={rule.validHint} />
        </MetaColumn>
        <MetaColumn label="LAST UPDATED">
          <MetaValue value={rule.when} hint={rule.who} />
        </MetaColumn>
      </div>
    </div>
  )
}

export function FeeSplit({
  rules,
  query,
  onQueryChange,
}: {
  rules: FeeRule[]
  query: string
  onQueryChange: (next: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // The chosen rule if it survived the filter, else the first one that did. Derived rather
  // than corrected in an effect: a selection that is no longer in the list is not a state to
  // repair, it is a question the list already answers.
  const selected = rules.find((rule) => rule.id === selectedId) ?? rules[0]

  return (
    <div
      className="flex w-full flex-col overflow-hidden lg:h-[var(--split-height)] lg:flex-row"
      style={SPLIT_STYLE}
    >
      <div
        className="flex shrink-0 flex-col overflow-hidden border-0 border-b lg:w-[var(--list-width)] lg:border-r lg:border-b-0"
        style={LIST_PANE_STYLE}
      >
        <div className="shrink-0 p-[17px] pb-0">
          <RuleSearch query={query} onChange={onQueryChange} />
        </div>
        {/* The list scrolls, not the page: the detail beside it must stay put while you look
            down the list for the next rule to open. */}
        <div className="flex max-h-[360px] flex-1 flex-col gap-0.5 overflow-y-auto p-[17px] lg:max-h-none">
          {rules.map((rule) => (
            <ListRow
              key={rule.id}
              rule={rule}
              isSelected={selected?.id === rule.id}
              onSelect={() => setSelectedId(rule.id)}
            />
          ))}
          {rules.length === 0 && <Empty query={query} size="sm" />}
        </div>
      </div>
      {selected && <Detail rule={selected} />}
    </div>
  )
}
