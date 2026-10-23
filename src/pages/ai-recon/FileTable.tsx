import {
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { X } from 'lucide-react'
import { useMemo } from 'react'
import { PrimitiveText, font } from '../../primitives'
import type { FileRole } from './assistant'
import { describe, type Operation } from './operations'
import { shapeOf, type Table } from './table'

const { colors } = FOUNDATION_THEME

/** DataTable's own row type; `__row` is the row's place in the file, for its id. */
type PreviewRow = Record<string, unknown>

/**
 * Enough rows to see what a column holds and whether a step did what it said — the header
 * tag carries the full count, so nothing here needs paging.
 */
const PREVIEW_ROWS = 5

type FileTableProps = {
  role: FileRole
  name: string
  /** Undefined while the file is still being read. */
  table?: Table
  steps: Operation[]
  onRemoveStep: (index: number) => void
}

/**
 * One uploaded file as it will be matched — every cleanup step already applied — with the
 * steps themselves in the header, each one a tag that takes it back out.
 *
 * The table is a preview — the first few rows — so it has none of DataTable's chrome: no
 * toolbar, no column manager, no pager, nothing sortable.
 */
function FileTable({ role, name, table, steps, onRemoveStep }: FileTableProps) {
  const columns = useMemo<ColumnDefinition<PreviewRow>[]>(
    () =>
      (table?.columns ?? []).map((column) => ({
        field: column,
        header: column,
        type: ColumnType.TEXT,
        isSortable: false,
        minWidth: '120px',
      })),
    [table?.columns],
  )
  const data = useMemo<PreviewRow[]>(
    () =>
      (table?.rows ?? [])
        .slice(0, PREVIEW_ROWS)
        .map((row, index) => ({ ...row, __row: String(index) })),
    [table?.rows],
  )

  return (
    // No frame of its own: DataTable draws one, and a second around it reads as a box in a box.
    <section aria-label={`${role} file`} className="flex flex-col gap-2">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <PrimitiveText
          as="h2"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {role === 'source' ? 'Source' : 'Target'}
        </PrimitiveText>
        <span className="min-w-0 truncate">
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
            {name}
          </PrimitiveText>
        </span>
        {table && (
          <TagV2
            text={shapeOf(table)}
            size={TagV2Size.SM}
            type={TagV2Type.SUBTLE}
            color={TagV2Color.NEUTRAL}
          />
        )}
        {steps.map((step, index) => (
          <TagV2
            key={`${index}-${describe(step)}`}
            text={describe(step)}
            size={TagV2Size.SM}
            type={TagV2Type.SUBTLE}
            color={TagV2Color.PRIMARY}
            rightSlot={{ slot: <X size={12} aria-hidden /> }}
            onClick={() => onRemoveStep(index)}
            aria-label={`Remove step: ${describe(step)}`}
          />
        ))}
      </header>

      {/* Keyed on the columns, so a rename or a joined column draws a fresh header rather
          than relying on DataTable to notice its column list changed. */}
      {table && (
        <DataTable
          key={table.columns.join('\u0000')}
          data={data}
          columns={columns}
          idField="__row"
          showHeader={false}
          showToolbar={false}
          showSettings={false}
          showFooter={false}
          enableColumnManager={false}
          enableColumnReordering={false}
          enableFiltering={false}
        />
      )}
    </section>
  )
}

export default FileTable
