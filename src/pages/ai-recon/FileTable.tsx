import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
} from '@juspay/blend-design-system'
import { FileUp, X } from 'lucide-react'
import { useMemo } from 'react'
import { MiddleTruncate } from '../../middle-truncate'
import { PrimitiveText, font } from '../../primitives'
import { ROLE_LABEL, type FileRole } from './assistant'
import { describe, type Operation } from './operations'
import RowsTable from './RowsTable'
import { shapeOf, type Table } from './table'

const { colors } = FOUNDATION_THEME

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
  /** Swap this file for another — the way to change files once the upload box has gone. */
  onReplace: () => void
}

/**
 * One uploaded file as it will be matched — every cleanup step already applied — with the
 * steps themselves in the header, each one a tag that takes it back out. The table is the
 * first few rows.
 */
function FileTable({ role, name, table, steps, onRemoveStep, onReplace }: FileTableProps) {
  const preview = useMemo(() => table?.rows.slice(0, PREVIEW_ROWS) ?? [], [table?.rows])

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
          {ROLE_LABEL[role]}
        </PrimitiveText>
        {/* Cut in the middle: two exports of one report differ at the end of their names. */}
        <span className="min-w-0 max-w-full">
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
            <MiddleTruncate text={name} />
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
        {/* At the row's far end, apart from the tags that describe the file. */}
        <span className="ml-auto flex shrink-0">
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            text="Replace"
            leftSlot={{ slot: <FileUp size={14} aria-hidden /> }}
            onClick={onReplace}
            aria-label={`Replace ${name}`}
          />
        </span>
      </header>

      {table && <RowsTable columns={table.columns} rows={preview} />}
    </section>
  )
}

export default FileTable
