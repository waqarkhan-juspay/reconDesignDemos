import { FOUNDATION_THEME, TagV2Color } from '@juspay/blend-design-system'
import { useCallback, useMemo, useState } from 'react'
import { font } from '../../primitives'
import { TAGV2_TOKENS } from '../../tokens/TagV2'
import type { EntryStatus } from './data'
import { ALL, type LedgerRow } from './ledger'

/**
 * What both versions of the Ledger page share: sizes, the type styles a cell uses, the status
 * tags' colours, the page's spacing and the table's paging.
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

/**
 * A status is a word and, where it matters, a colour — no glyph.
 *
 * The word already says it, and at 12px a tick, a spinner and a cross are three small rings
 * that read as one texture down the column rather than as three meanings. Completed goes
 * further and drops the colour too: it is the status most rows are in, so it is the one that
 * should not be announcing itself. Colour marks the exception, which is the page's rule
 * everywhere else, reaching the status column.
 */
export const STATUS_TAG: Record<EntryStatus, TagV2Color> = {
  COMPLETED: TagV2Color.NEUTRAL,
  IN_PROGRESS: TagV2Color.WARNING,
  FAILED: TagV2Color.ERROR,
}

/**
 * The Ledger page's own toaster (index.tsx). Every toast the page raises names it, so they
 * land there and not in the app's Blend snackbar host — sonner shows a toast only in the
 * toaster whose id it carries.
 */
export const LEDGER_TOASTER = 'ledger'

/** Let content decide each column's width, as on the Configurator and Alerts tables. */
export const HUG = { minWidth: '0px', maxWidth: 'none' } as const

/** A ledger row as DataTable types its data. */
export type TableRow = LedgerRow & { [key: string]: unknown }
export const entryOf = (row: Record<string, unknown>) => row as unknown as LedgerRow

/** Body copy in a cell, at the table's own size, and the smaller line under it. */
export const CELL_TEXT = font(FOUNDATION_THEME.font.size.body.md)
export const CELL_META = font(FOUNDATION_THEME.font.size.body.sm)

/**
 * The page's vertical rhythm — one gap between each pair of its main blocks: heading, ledger
 * switch, stat cards, toolbar, table. The Alerts page's values, on the 4px grid (DESIGN.md §7).
 */
export const SPACING = {
  aboveTitle: 24,
  introToCards: 24,
  cardsToToolbar: 24,
  // 8, not 24: the toolbar chooses what the table shows, so the two read as one block.
  toolbarToTable: 8,
  /**
   * Manual Reconciliation's split view, toolbar → pair bar → the two lists. 16, between the
   * table's 8 and the page's 24: still one block under the toolbar, but three stacked parts
   * — a bar and two bordered panes — need more air than a table's header line does.
   */
  toolbarToSplit: 16,
  belowTable: 24,
} as const

export type Spacing = { [K in keyof typeof SPACING]: number }

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
 *
 * Generic over the row, because the page now pages three different ones — ledger entries,
 * bank lines and comparison pairs — and the paging is the same arithmetic for all three.
 */
export function usePagedRows<T extends Record<string, unknown>>(rows: T[]) {
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
