/**
 * The Payment Info Generator's Filters button and its panel: sort by any field in the row
 * detail sheet, and filter by the value of any text field in it (recon-query.ts).
 *
 * All Blend: PopoverV2 for the panel, SingleSelectV2 for the sort and for adding a filter,
 * MultiSelectV2 (with search) for a filter's values. Filters are added one field at a time
 * rather than eleven selects drawn at once — the panel shows only the fields in use.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  MultiSelectV2,
  MultiSelectV2SelectionTagType,
  PopoverV2,
  PopoverV2Align,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
} from '@juspay/blend-design-system'
import { Filter, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { PrimitiveText, font } from '../../primitives'
import type { ReconRow } from './data'
import {
  EMPTY_QUERY,
  activeFilterCount,
  valuesOf,
  type FilterField,
  type QueryOptions,
  type ReconQuery,
  type SortDirection,
  type SortField,
} from './recon-query'

const { colors } = FOUNDATION_THEME

const NO_SORT = '__none'

const sortItems = (options: QueryOptions) => [
  { items: [{ value: NO_SORT, label: 'Default order' }] },
  ...options.sort.map(({ groupLabel, items }) => ({
    groupLabel,
    items: items.map(({ field, label }) => ({ value: field, label })),
  })),
]

const DIRECTIONS = [{ items: [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
] }]


function SectionLabel({ children }: { children: string }) {
  return (
    <PrimitiveText
      {...font(FOUNDATION_THEME.font.size.body.sm)}
      color={colors.gray[500]}
      fontWeight={FOUNDATION_THEME.font.weight[600]}
    >
      {children}
    </PrimitiveText>
  )
}

export function ReconFilters({
  rows,
  value,
  onChange,
  options,
}: {
  /** The rows in range — a filter offers the values these actually have. */
  rows: ReconRow[]
  value: ReconQuery
  onChange: (next: ReconQuery) => void
  /** Which fields filter and sort — the sheet's, or only the table's (recon-query.ts). */
  options: QueryOptions
}) {
  const labelOf = (field: FilterField) =>
    options.filter.find((f) => f.field === field)?.label ?? field
  const [open, setOpen] = useState(false)
  /**
   * blend-gap: the selects draw their menus in a portal of their own (SingleSelectV2Menu.tsx:230),
   * outside the popover's content, so the popover reads a click in one as a click outside and
   * closes. Nothing on PopoverV2 reaches Radix's onInteractOutside, so instead every select
   * reports its menu here and the popover ignores a close while one is open.
   */
  const openMenus = useRef(new Set<string>())
  const trackMenu = (id: string) => (isOpen: boolean) => {
    if (isOpen) openMenus.current.add(id)
    else openMenus.current.delete(id)
  }
  // Fields the user added, kept in the order they were added — including ones with no
  // values picked yet, which are in the panel but filter nothing.
  const [fields, setFields] = useState<FilterField[]>(
    () => Object.keys(value.filters) as FilterField[],
  )
  const count = activeFilterCount(value)
  // Only fields the panel still offers — a switch of version or of column set drops the rest
  // (withinOptions does the same to the query).
  const shown = fields.filter((field) => options.filter.some((f) => f.field === field))
  const unused = options.filter.filter(({ field }) => !shown.includes(field))

  const setValues = (field: FilterField, values: string[]) =>
    onChange({ ...value, filters: { ...value.filters, [field]: values } })

  const removeField = (field: FilterField) => {
    openMenus.current.delete(`filter-${field}`)
    setFields((current) => current.filter((f) => f !== field))
    const rest = { ...value.filters }
    delete rest[field]
    onChange({ ...value, filters: rest })
  }

  const clearAll = () => {
    setFields([])
    onChange(EMPTY_QUERY)
  }

  return (
    <PopoverV2
      open={open}
      onOpenChange={(next) => {
        if (!next && openMenus.current.size > 0) return
        setOpen(next)
      }}
      heading="Filter and sort"
      showCloseButton
      align={PopoverV2Align.END}
      width={400}
      primaryAction={{ text: 'Done', onClick: () => setOpen(false) }}
      secondaryAction={{ text: 'Clear all', onClick: clearAll, disabled: count === 0 && !value.sort }}
      trigger={
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.MEDIUM}
          // The count says the table is narrowed even with the panel shut.
          text={count > 0 ? `Filters · ${count}` : 'Filters'}
          leftSlot={{ slot: <Filter size={16} />, maxHeight: 16 }}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <SectionLabel>Sort by</SectionLabel>
          <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
            <SingleSelectV2
              label=""
              placeholder="Default order"
              size={SingleSelectV2Size.MD}
              variant={SingleSelectV2Variant.CONTAINER}
              triggerDimensions={{ width: '100%' }}
              menuDimensions={{ maxHeight: 320 }}
              search={{ show: true, placeholder: 'Search fields' }}
              onOpenChange={trackMenu('sort-field')}
              items={sortItems(options)}
              selected={value.sort?.field ?? NO_SORT}
              onSelect={(field) =>
                onChange({
                  ...value,
                  sort:
                    field === NO_SORT
                      ? null
                      : { field: field as SortField, direction: value.sort?.direction ?? 'asc' },
                })
              }
            />
            <SingleSelectV2
              label=""
              placeholder="Order"
              size={SingleSelectV2Size.MD}
              variant={SingleSelectV2Variant.CONTAINER}
              triggerDimensions={{ width: '100%' }}
              onOpenChange={trackMenu('sort-direction')}
              items={DIRECTIONS}
              selected={value.sort?.direction ?? 'asc'}
              disabled={!value.sort}
              onSelect={(direction) =>
                value.sort &&
                onChange({ ...value, sort: { ...value.sort, direction: direction as SortDirection } })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Filter by</SectionLabel>
          {shown.map((field) => {
            const selected = value.filters[field] ?? []
            return (
              <div key={field} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  {/* The field name is the placeholder, not a label: Blend draws the placeholder
                      in front of the picked values, so the row reads "Entity ID  jpappx". */}
                  <MultiSelectV2
                    label=""
                    aria-label={`${labelOf(field)} filter`}
                    placeholder={labelOf(field)}
                    size={SingleSelectV2Size.MD}
                    variant={SingleSelectV2Variant.CONTAINER}
                    triggerDimensions={{ width: '100%' }}
                    menuDimensions={{ maxHeight: 320 }}
                    search={{ show: true, placeholder: `Search ${labelOf(field)}` }}
                    onOpenChange={trackMenu(`filter-${field}`)}
                    items={[{ items: valuesOf(rows, field).map((v) => ({ value: v, label: v })) }]}
                    selectedValues={selected}
                    // The picked values themselves, not "Any value" and a count — and no clear
                    // of its own: the ✕ beside it removes the filter, which clears it too.
                    selectionTagType={MultiSelectV2SelectionTagType.TEXT}
                    showClearButton={false}
                    // A string toggles one value; an array — Clear, Select all — is the new set.
                    onChange={(next) =>
                      setValues(
                        field,
                        Array.isArray(next)
                          ? next
                          : selected.includes(next)
                            ? selected.filter((v) => v !== next)
                            : [...selected, next],
                      )
                    }
                  />
                </div>
                <ButtonV2
                  buttonType={ButtonV2Type.SECONDARY}
                  subType={ButtonV2SubType.ICON_ONLY}
                  size={ButtonV2Size.MEDIUM}
                  leftSlot={{ slot: <X size={16} />, maxHeight: 16 }}
                  aria-label={`Remove the ${labelOf(field)} filter`}
                  onClick={() => removeField(field)}
                />
              </div>
            )
          })}
          {unused.length > 0 && (
            <SingleSelectV2
              label=""
              placeholder={shown.length ? 'Add another field' : 'Add a field to filter by'}
              size={SingleSelectV2Size.MD}
              variant={SingleSelectV2Variant.CONTAINER}
              triggerDimensions={{ width: '100%' }}
              menuDimensions={{ maxHeight: 320 }}
              search={{ show: true, placeholder: 'Search fields' }}
              onOpenChange={trackMenu('add-field')}
              items={[{ items: unused.map(({ field, label }) => ({ value: field, label })) }]}
              selected=""
              onSelect={(field) => setFields((current) => [...current, field as FilterField])}
            />
          )}
        </div>
      </div>
    </PopoverV2>
  )
}
