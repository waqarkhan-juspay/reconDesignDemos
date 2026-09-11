import {
  AccordionV2,
  AccordionV2Item,
  AccordionV2Type,
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { PrimitiveText, font } from '../../primitives'
import type { FieldColumn, FieldsAnswers } from './answers'

const { colors } = FOUNDATION_THEME

/**
 * Step 5 — the config read back before it is submitted (node 4530:10413).
 *
 * Two things sit under the heading: a preview of the report the flow just described, and an
 * accordion holding the answers themselves. The preview is the point — a report config is
 * abstract until you see a row of it.
 */

/**
 * Sample values the preview fills its rows with, keyed by column title.
 *
 * The design writes real-looking values into every cell (node 4530:10508 onwards), and a
 * preview of blank cells would say nothing about what the report will contain. Keyed on
 * title rather than positional so a reordered or renamed column keeps its own kind of
 * value; anything unrecognised falls back to `SAMPLE_FALLBACK`.
 */
const SAMPLES: Record<string, string> = {
  'Merchant Id': 'Demo Merchant',
  'Merchant ID': 'Demo Merchant',
  'Payment Entity': '19933239749',
  'Payment Entity Txn Id': '19933239749',
  'Payment Entity Txn ID': '19933239749',
  Gateway: 'PAYU',
  'Txn Amount': '1100.000000000',
  'Txn Type': 'ORDER',
  'Txn Currency': 'INR',
  'Txn Date': '2026-09-10',
  'Recon Status': 'Reconciled',
  'Recon Sub Status': 'Matched',
  'Recon Id': 'RCN-4417',
  'Settlement Amount': '1078.500000000',
  'Settlement Currency': 'INR',
  'Settlement Date': '2026-09-12',
  'Reconciled At': '2026-09-11 04:12',
  Credit: 'Yes',
  Debit: 'No',
  Fee: '21.500000000',
  Tax: '3.870000000',
  ID: '8841207',
  Label: 'Standard',
}

/** What a column with no sample of its own shows — an em dash reads as "nothing here yet". */
const SAMPLE_FALLBACK = '—'

/**
 * Three rows, as the design draws (nodes 4530:10508-10510). Enough to read as a table
 * rather than a single record, and few enough that it stays a preview.
 */
const PREVIEW_ROW_COUNT = 3

/**
 * Rows per page in the preview's footer.
 *
 * The table is a fixed three rows, so this paginates nothing — it is the design's own
 * footer (node 4530:10524) and the control it draws. Stated rather than hidden because
 * DataTable renders the footer from `pagination`, and the alternative is a table that ends
 * on a hard edge where the design ends on a rule.
 */
const PREVIEW_PAGE_SIZE = 10

const sampleFor = (title: string) => SAMPLES[title] ?? SAMPLE_FALLBACK

/**
 * `Record<string, unknown>` rather than `Record<string, string>` because that is the shape
 * DataTable's generic resolves to — the same reason Configurator.tsx:491 declares its own
 * columns that way. The cells this builds are all strings regardless.
 */
type PreviewRow = { id: string } & Record<string, unknown>

/**
 * One row per preview line, one key per configured column.
 *
 * Keyed on the column's `id` rather than its title: titles are free text the user edits on
 * the Fields step, and two columns can legitimately carry the same one.
 */
const buildPreviewRows = (columns: FieldColumn[]): PreviewRow[] =>
  Array.from({ length: PREVIEW_ROW_COUNT }, (_, row) => {
    const cells: Record<string, string> = {}
    for (const column of columns) cells[column.id] = sampleFor(column.title)
    return { id: `preview-${row}`, ...cells }
  })

const buildPreviewColumns = (
  columns: FieldColumn[],
): ColumnDefinition<Record<string, unknown>>[] =>
  columns.map(({ id, title }) => ({
    field: id,
    header: title,
    type: ColumnType.TEXT,
    isSortable: false,
  }))

/** One answered question inside the accordion — a label above the value it was given. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
        {label}
      </PrimitiveText>
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[700]}>
        {value}
      </PrimitiveText>
    </div>
  )
}

export function ReviewStep({ fields }: { fields: FieldsAnswers }) {
  const { columns } = fields

  /**
   * The header-info control is a toggle rather than a link: the design draws the button
   * alone (node 4530:10899) with nothing behind it yet, and a button that navigates
   * nowhere is worse than one that visibly does the small thing it can.
   *
   * blend-gap: the design's own "report header info" panel has no node yet, so what the
   * toggle reveals is the preview's own column list rather than a form.
   */
  const [showHeaderInfo, setShowHeaderInfo] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex">
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.LARGE}
            text="Add report header info"
            // `rightSlot`, matching the design — the glyph trails the label rather than
            // leading it, which reads as "and then edit" rather than labelling the button.
            rightSlot={{ slot: <Pencil size={16} /> }}
            onClick={() => setShowHeaderInfo((shown) => !shown)}
          />
        </div>

        {showHeaderInfo && (
          <div
            className="flex flex-col gap-1 rounded-[12px] border px-6 py-4"
            style={{ borderColor: colors.gray[200] }}
          >
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[500]}
            >
              Header row
            </PrimitiveText>
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.md)}
              color={colors.gray[700]}
            >
              {columns.map(({ title }) => title).join(', ')}
            </PrimitiveText>
          </div>
        )}

        <DataTable
          data={buildPreviewRows(columns)}
          columns={buildPreviewColumns(columns)}
          idField="id"
          // The heading above already says what this is; a second title inside the frame
          // would repeat it.
          showHeader={false}
          // Nothing here is interactive on purpose — this is the config read back, not a
          // table to work in. Each of these defaults to on, so each has to be said.
          enableColumnReordering={false}
          enableColumnManager={false}
          enableFiltering={false}
          pagination={{
            currentPage: 1,
            pageSize: PREVIEW_PAGE_SIZE,
            totalRows: PREVIEW_ROW_COUNT,
            pageSizeOptions: [PREVIEW_PAGE_SIZE],
          }}
        />
      </div>

      <AccordionV2 accordionType={AccordionV2Type.BORDER}>
        <AccordionV2Item value="configuration" title="Configuration details">
          <div className="flex flex-col gap-4 px-6 pb-4">
            <SummaryRow label="Columns" value={`${columns.length} selected`} />
            <SummaryRow
              label="Order"
              value={columns.map(({ title }) => title).join(' · ')}
            />
          </div>
        </AccordionV2Item>
      </AccordionV2>
    </>
  )
}

export default ReviewStep
