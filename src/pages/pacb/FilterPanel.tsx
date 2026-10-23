/**
 * The PACB Workflow page's Filter button (PACB Figma node 88:47578) and the panel it opens:
 * a search over the filters' names with Clear and Apply beside it, then two columns — the
 * filters on the left, the chosen filter's values as checkboxes on the right. The product's
 * panel has a third, "All Filters" column in front; with one group of filters it said
 * nothing, so it is left out.
 *
 * Choices are a draft until Apply. Closing the panel any other way drops them, and opening it
 * again starts from what is applied.
 *
 * blend-gap: Blend has no filter panel. PopoverV2 is the surface, ButtonV2, TextInputV2 and
 * CheckboxV2 the controls; the two-column list is composed here from tokens.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  CheckboxV2,
  FOUNDATION_THEME,
  InputSizeV2,
  PopoverV2,
  PopoverV2Align,
  PopoverV2Side,
  SelectorV2Size,
  TextInputV2,
} from '@juspay/blend-design-system'
import { ChevronRight, ListFilter, Search } from 'lucide-react'
import { useState } from 'react'
import { font, PrimitiveText } from '../../primitives'
import { HAIRLINE } from './helpers'

const { colors } = FOUNDATION_THEME

export type FilterGroup<K extends string> = { key: K; label: string; options: string[] }

const BODY = FOUNDATION_THEME.font.size.body.md
const SMALL = FOUNDATION_THEME.font.size.body.sm

/** Wide enough for both columns and the buttons on one line above them. */
const PANEL_WIDTH = 600

const searchSlot = { slot: <Search size={16} color={colors.gray[400]} />, maxHeight: 16 }

export function FilterPanel<K extends string>({
  groups,
  value,
  onApply,
}: {
  groups: FilterGroup<K>[]
  value: Record<K, string[]>
  onApply: (next: Record<K, string[]>) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [active, setActive] = useState<K>(groups[0]!.key)
  const [groupQuery, setGroupQuery] = useState('')
  const [optionQuery, setOptionQuery] = useState('')

  const applied = Object.values<string[]>(value).reduce((sum, picked) => sum + picked.length, 0)
  const shownGroups = groups.filter(({ label }) =>
    label.toLowerCase().includes(groupQuery.trim().toLowerCase()),
  )
  const group = groups.find(({ key }) => key === active) ?? groups[0]!
  const options = group.options.filter((option) =>
    option.toLowerCase().includes(optionQuery.trim().toLowerCase()),
  )

  const openChange = (next: boolean) => {
    // Every opening starts from what is applied, so a draft abandoned by closing is gone.
    if (next) {
      setDraft(value)
      setGroupQuery('')
      setOptionQuery('')
    }
    setOpen(next)
  }
  const toggle = (option: string) =>
    setDraft((current) => {
      const picked = current[group.key]
      return {
        ...current,
        [group.key]: picked.includes(option)
          ? picked.filter((v) => v !== option)
          : [...picked, option],
      }
    })
  const cleared = Object.fromEntries(groups.map(({ key }) => [key, []])) as unknown as Record<
    K,
    string[]
  >

  return (
    // The popover portals out of this span.
    <span className="inline-flex">
      <PopoverV2
        open={open}
        onOpenChange={openChange}
        side={PopoverV2Side.BOTTOM}
        align={PopoverV2Align.END}
        sideOffset={8}
        width={PANEL_WIDTH}
        maxWidth={PANEL_WIDTH}
        trigger={
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.MEDIUM}
            text={applied ? `Filter · ${applied}` : 'Filter'}
            leftSlot={{ slot: <ListFilter size={16} />, maxHeight: 16 }}
          />
        }
      >
        {/* 16px all round — this app's PopoverV2 tokens give the surface no padding of its own
            (src/tokens/PopoverV2.ts), so the panel pads itself. */}
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="w-64">
              <TextInputV2
                size={InputSizeV2.MD}
                value={groupQuery}
                onChange={(event) => setGroupQuery(event.target.value)}
                placeholder="Search filter name"
                aria-label="Search filter name"
                leftSlot={searchSlot}
              />
            </div>
            <div className="flex items-center gap-2">
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.MEDIUM}
                text="Clear Filters"
                onClick={() => {
                  setDraft(cleared)
                  onApply(cleared)
                }}
              />
              <ButtonV2
                buttonType={ButtonV2Type.PRIMARY}
                size={ButtonV2Size.MEDIUM}
                text="Apply Filters"
                onClick={() => {
                  onApply(draft)
                  setOpen(false)
                }}
              />
            </div>
          </div>

          <div
            className="grid h-80 grid-cols-[200px_1fr] overflow-hidden"
            style={{
              border: HAIRLINE,
              borderRadius: FOUNDATION_THEME.border.radius[12],
            }}
          >
            <ul
              aria-label="Filters"
              className="flex flex-col gap-1 overflow-y-auto p-2"
              style={{
                borderRight: HAIRLINE,
              }}
            >
              {shownGroups.length === 0 && (
                <li className="px-3 py-2">
                  <PrimitiveText {...font(BODY)} color={colors.gray[500]}>
                    No filters match.
                  </PrimitiveText>
                </li>
              )}
              {shownGroups.map(({ key, label }) => {
                const isActive = key === group.key
                const count = draft[key].length
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-current={isActive}
                      onClick={() => {
                        setActive(key)
                        setOptionQuery('')
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 border-none px-3 py-2 text-left [background:var(--row-fill)] hover:[background:var(--row-hover)]"
                      style={{
                        borderRadius: FOUNDATION_THEME.border.radius[8],
                        ['--row-fill' as string]: isActive ? colors.gray[100] : 'transparent',
                        ['--row-hover' as string]: isActive ? colors.gray[100] : colors.gray[50],
                      }}
                    >
                      <PrimitiveText {...font(BODY)} color={colors.gray[700]}>
                        {count ? `${label} (${count})` : label}
                      </PrimitiveText>
                      <ChevronRight
                        size={16}
                        color={isActive ? colors.gray[700] : colors.gray[400]}
                        aria-hidden
                      />
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="flex min-h-0 flex-col gap-3 p-3">
              <TextInputV2
                size={InputSizeV2.MD}
                value={optionQuery}
                onChange={(event) => setOptionQuery(event.target.value)}
                placeholder={`Search in ${group.options.length} option${group.options.length === 1 ? '' : 's'}`}
                aria-label={`Search ${group.label}`}
                leftSlot={searchSlot}
              />
              <PrimitiveText {...font(SMALL)} color={colors.gray[400]}>
                Values shown below depend on the selected time range.
              </PrimitiveText>
              <div
                role="group"
                aria-label={group.label}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-1"
              >
                {options.length === 0 ? (
                  <PrimitiveText {...font(BODY)} color={colors.gray[500]}>
                    No values match.
                  </PrimitiveText>
                ) : (
                  options.map((option) => (
                    <CheckboxV2
                      key={option}
                      label={option}
                      size={SelectorV2Size.MD}
                      checked={draft[group.key].includes(option)}
                      onCheckedChange={() => toggle(option)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </PopoverV2>
    </span>
  )
}
