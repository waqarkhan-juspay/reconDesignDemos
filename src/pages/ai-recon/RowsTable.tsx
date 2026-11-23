import { ColumnType, DataTable, type ColumnDefinition } from '@juspay/blend-design-system'
import { useMemo } from 'react'
import type { Row } from './table'

/** DataTable's own row type; `__row` is the row's place in the list, for its id. */
type TableRow = Record<string, unknown>

type RowsTableProps = {
  columns: string[]
  rows: Row[]
  /** Pages of this many rows; without it every row given is shown, with no pager. */
  pageSize?: number
}

/**
 * Rows as a plain table: none of DataTable's chrome — no toolbar, no column manager,
 * nothing sortable — since what it shows is a file's rows or the exceptions in them, not a
 * set to work on. The file previews and a result card's rows share it.
 */
function RowsTable({ columns, rows, pageSize }: RowsTableProps) {
  const definitions = useMemo<ColumnDefinition<TableRow>[]>(
    () =>
      columns.map((column) => ({
        field: column,
        header: column,
        type: ColumnType.TEXT,
        isSortable: false,
        minWidth: '120px',
      })),
    [columns],
  )
  const data = useMemo<TableRow[]>(
    () => rows.map((row, index) => ({ ...row, __row: String(index) })),
    [rows],
  )

  return (
    // Keyed on the columns, so a rename or a joined column draws a fresh header rather than
    // relying on DataTable to notice its column list changed.
    <DataTable
      key={columns.join('\u0000')}
      data={data}
      columns={definitions}
      idField="__row"
      showHeader={false}
      showToolbar={false}
      showSettings={false}
      enableColumnManager={false}
      enableColumnReordering={false}
      enableFiltering={false}
      // A pager only when there is a second page to go to.
      {...(pageSize && data.length > pageSize
        ? { pagination: { currentPage: 1, pageSize, totalRows: data.length, pageSizeOptions: [pageSize] } }
        : { showFooter: false })}
    />
  )
}

export default RowsTable
