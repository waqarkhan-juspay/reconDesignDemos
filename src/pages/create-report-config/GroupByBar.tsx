import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  MenuV2,
  MenuV2Alignment,
  MenuV2ItemActionType,
  MenuV2ItemVariant,
  MenuV2Side,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  type MenuV2GroupType,
  type MenuV2ItemType,
} from '@juspay/blend-design-system'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { PrimitiveText, font } from '../../primitives'
import type { FieldColumn } from './answers'

const { colors } = FOUNDATION_THEME

/** Past this many levels a grouping stops summarising anything, so the picker closes. */
const MAX_LEVELS = 4

/** The chevron on a grouping chip — it opens a menu, and the glyph is what says so. */
const OPENS_MENU_SLOT = { slot: <ChevronDown size={12} color={colors.primary[600]} /> }

/** Moves the entry at `from` to `to`, leaving the rest in order. */
const move = (ids: readonly string[], from: number, to: number) => {
  const next = [...ids]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Step 3's grouping rule, drawn above the table it acts on.
 *
 * Three decisions carry this control, and they are all about what grouping *is*:
 *
 * 1. **It is ordered, so it is drawn as a sequence.** Group by Gateway and then Txn Type and
 *    you get one block per gateway, split by type; swap them and you get the opposite report.
 *    A multi-select would hand back a set and lose that distinction silently — so this is a
 *    row of chips read left to right, with a chevron between them for "then by", and moving a
 *    level is a first-class action rather than something you redo by clearing and re-picking.
 *
 * 2. **You can only group by a column the report already has.** The picker lists `columns`
 *    and nothing else, which removes the whole class of "grouped by a field that is not in
 *    the output" — and it makes the chips below the table the single place a field enters
 *    this step. A column leaving takes its grouping with it (`activeGroupBy`).
 *
 * 3. **It sits on the table, not in a step of its own.** Grouping is a property of these
 *    columns; a rule stated somewhere else is a rule you have to hold in your head while you
 *    pick them. The sentence under the bar closes the loop by saying what the rule produces,
 *    in rows, which is the thing the user actually cares about.
 *
 * The whole chip is the menu trigger rather than carrying its own ✕, because TagV2 renders as
 * a single <button> once it has an onClick and a button inside a button is markup the browser
 * resolves by ignoring the inner one — the same reason the field chips below are whole-tag
 * toggles. One menu also puts reorder, replace and remove in one discoverable place, and
 * reaches the keyboard for free, which a drag handle would not.
 */
export function GroupByBar({
  columns,
  groupBy,
  onChange,
}: {
  columns: FieldColumn[]
  /** Already pruned to columns that exist — see `activeGroupBy`. Outermost first. */
  groupBy: readonly string[]
  onChange: (next: string[]) => void
}) {
  const byId = new Map(columns.map((column) => [column.id, column]))
  const grouped = groupBy.flatMap((id) => byId.get(id) ?? [])
  const available = columns.filter((column) => !groupBy.includes(column.id))
  const full = groupBy.length >= MAX_LEVELS

  /** Every column not already a level, as menu rows running `pick`. */
  const columnItems = (pick: (id: string) => void): MenuV2ItemType[] =>
    available.map((column) => ({
      id: column.id,
      label: { text: column.title },
      onClick: () => pick(column.id),
    }))

  const addItems: MenuV2GroupType[] = [
    { items: columnItems((id) => onChange([...groupBy, id])) },
  ]

  const levelItems = (index: number): MenuV2GroupType[] => [
    {
      showSeparator: true,
      items: [
        {
          label: { text: 'Move earlier' },
          // Kept and disabled rather than dropped, so the two rows do not swap places
          // between the first chip's menu and the second's.
          disabled: index === 0,
          onClick: () => onChange(move(groupBy, index, index - 1)),
        },
        {
          label: { text: 'Move later' },
          disabled: index === groupBy.length - 1,
          onClick: () => onChange(move(groupBy, index, index + 1)),
        },
      ],
    },
    // Replacing a level in place, rather than remove-then-add, which loses its position.
    ...(available.length > 0
      ? [
          {
            showSeparator: true,
            items: [
              {
                label: { text: 'Change field' },
                subMenu: columnItems((id) =>
                  onChange(groupBy.map((current, at) => (at === index ? id : current))),
                ),
                enableSubMenuSearch: available.length > 8,
                subMenuSearchPlaceholder: 'Find a column',
              },
            ],
          },
        ]
      : []),
    {
      items: [
        {
          label: { text: 'Remove grouping' },
          variant: MenuV2ItemVariant.ACTION,
          actionType: MenuV2ItemActionType.DANGER,
          onClick: () => onChange(groupBy.filter((_, at) => at !== index)),
        },
      ],
    },
  ]

  return (
    <div
      key="group-by"
      role="group"
      aria-label="Group by"
      className="flex w-full flex-col gap-1"
    >
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[600]}>
          Group by
        </PrimitiveText>

        {grouped.map((column, index) => (
          // The chevron reads "then by". Wrapped with its chip so a row that wraps never
          // starts with a separator pointing at nothing.
          <span key={column.id} className="flex items-center gap-x-3">
            {index > 0 && (
              <ChevronRight size={14} color={colors.gray[400]} aria-hidden="true" />
            )}
            <MenuV2
              alignment={MenuV2Alignment.START}
              side={MenuV2Side.BOTTOM}
              trigger={
                <TagV2
                  text={column.title}
                  size={TagV2Size.MD}
                  subType={TagV2SubType.SQUARICAL}
                  // PRIMARY, where every chip below the table is NEUTRAL: a level is a rule
                  // about the report, not another field in it, and at a glance the colour is
                  // the only thing that separates the two rows of squarical md chips.
                  color={TagV2Color.PRIMARY}
                  type={TagV2Type.SUBTLE}
                  rightSlot={OPENS_MENU_SLOT}
                  title={
                    groupBy.length > 1
                      ? `Grouping level ${index + 1} of ${groupBy.length}: ${column.title}`
                      : `Grouping by ${column.title}`
                  }
                />
              }
              items={levelItems(index)}
            />
          </span>
        ))}

        {/* Disabled rather than hidden at the ceiling and with nothing left to pick, so the
            bar keeps its shape and the reason is on the button rather than in its absence. */}
        {available.length === 0 || full ? (
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            subType={groupBy.length > 0 ? ButtonV2SubType.INLINE : ButtonV2SubType.DEFAULT}
            text={groupBy.length > 0 ? 'Add level' : 'Group by a column'}
            leftSlot={{ slot: <Plus size={14} /> }}
            disabled
            title={
              full
                ? `Up to ${MAX_LEVELS} levels — remove one to add another.`
                : 'Every column in the report is already a level.'
            }
          />
        ) : (
          <MenuV2
            alignment={MenuV2Alignment.START}
            side={MenuV2Side.BOTTOM}
            enableSearch={available.length > 8}
            searchPlaceholder="Find a column"
            trigger={
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.SMALL}
                subType={groupBy.length > 0 ? ButtonV2SubType.INLINE : ButtonV2SubType.DEFAULT}
                text={groupBy.length > 0 ? 'Add level' : 'Group by a column'}
                leftSlot={{ slot: <Plus size={14} /> }}
              />
            }
            items={addItems}
          />
        )}
      </div>

      {/* What the rule produces, in rows. Grouping is easy to set and hard to picture, and a
          sentence that names the output is cheaper than a preview that fakes one. */}
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
        {grouped.length === 0
          ? 'Optional. Collapses rows that share a value — one row per group instead of one per transaction.'
          : `One row per ${grouped.map(({ title }) => title).join(' + ')}.`}
      </PrimitiveText>
    </div>
  )
}
