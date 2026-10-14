import { FOUNDATION_THEME, TagV2Color } from '@juspay/blend-design-system'
import { CircleCheck, CircleX, LoaderCircle, type LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { font } from '../../primitives'
import { TAGV2_TOKENS } from '../../tokens/TagV2'
import type { EntryStatus } from './data'
import { ALL, type LedgerRow } from './ledger'

/**
 * What both versions of the Ledger page share: sizes, the type styles a cell uses, the status
 * tags' colours, the spacing dials and the table's paging.
 */

/** Icons in an input slot — the search glyph. */
export const SLOT_ICON_SIZE = 16

/** The stat cards' icons — the Alerts page's size, for the same reason (see there). */
export const STAT_ICON_SIZE = 20

/** Row actions: lucide at 16, which iconGhostButtonTokens' 8px padding makes a 32px button. */
export const ACTION_ICON_SIZE = 16

/**
 * A slot icon has to be told its colour: TagV2 colours its label from the token but leaves
 * the slot to inherit from the table cell. Read from the tree TagV2 reads (as on Alerts).
 */
export const tagTextColor = (color: TagV2Color) => TAGV2_TOKENS.lg.text.color.subtle[color]

export const STATUS_TAG: Record<EntryStatus, { color: TagV2Color; Icon: LucideIcon }> = {
  COMPLETED: { color: TagV2Color.SUCCESS, Icon: CircleCheck },
  IN_PROGRESS: { color: TagV2Color.WARNING, Icon: LoaderCircle },
  FAILED: { color: TagV2Color.ERROR, Icon: CircleX },
}

/** Let content decide each column's width, as on the Configurator and Alerts tables. */
export const HUG = { minWidth: '0px', maxWidth: 'none' } as const

/** A ledger row as DataTable types its data. */
export type TableRow = LedgerRow & { [key: string]: unknown }
export const entryOf = (row: Record<string, unknown>) => row as unknown as LedgerRow

/** Body copy in a cell, at the table's own size, and the smaller line under it. */
export const CELL_TEXT = font(FOUNDATION_THEME.font.size.body.md)
export const CELL_META = font(FOUNDATION_THEME.font.size.body.sm)

/** The Alerts page's dial shape — `[value, min, max, step]` on the 4px grid. */
const dial = (value: number): [number, number, number, number] => [value, 0, 96, 4]

/** One dial per gap between the page's blocks. Both versions read the same panel. */
export const SPACING_DIALS = {
  aboveTitle: dial(24),
  titleToIntro: dial(4),
  introToCards: dial(24),
  cardsToToolbar: dial(24),
  toolbarToTable: dial(8),
  belowTable: dial(24),
}

export type Spacing = { [K in keyof typeof SPACING_DIALS]: number }

/** The merchant select's options: everything, then each merchant in the ledger. */
export const merchantItemsFor = (merchants: string[]) => [
  {
    items: [
      { value: ALL, label: 'All Merchants' },
      ...merchants.map((merchant) => ({ value: merchant, label: merchant })),
    ],
  },
]

/**
 * Paged here rather than by DataTable, so the footer counts the filtered set (as on Alerts).
 *
 * `toFirstPage` is for the filters: a narrower set sends you back to page one, because page 2
 * of a set of three is an empty table.
 */
export function usePagedRows(rows: TableRow[]) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const totalRows = rows.length
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  const currentPage = Math.min(page, pageCount)
  const data = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize],
  )

  const toFirstPage = useCallback(() => setPage(1), [])
  const onPageSizeChange = useCallback((next: number) => {
    setPageSize(next)
    setPage(1)
  }, [])

  return {
    data,
    toFirstPage,
    tableProps: {
      pagination: { currentPage, pageSize, totalRows, pageSizeOptions: [10, 20, 50] },
      onPageChange: setPage,
      onPageSizeChange,
      serverSidePagination: true,
    },
  }
}
