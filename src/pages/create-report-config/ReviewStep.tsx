import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  ColumnType,
  DataTable,
  InputSizeV2,
  TagV2Color,
  TextAreaV2,
  ThemeProvider,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { SAMPLE_ROW_COUNT, sampleFor } from '../../field-samples'
import {
  ConfigSummaryCard,
  ConfigSummaryChipRow,
  ConfigSummaryRow,
  UNSET,
  summaryChip,
} from '../../config-summary'
import { REPORT_FORMATS } from '../../report-config'
import { neutralLinkTokens } from '../../theme'
import {
  activeGroupBy,
  fieldOf,
  sameField,
  LAST_DAY_OF_MONTH,
  MONTHLY,
  SPECIFIED_TIME,
  WEEKLY,
  type DeliveryAnswers,
  type CustomField,
  type FieldColumn,
  type FieldsAnswers,
  type FiltersAnswers,
  type SetupAnswers,
} from './answers'

/**
 * Step 5 — the config read back before it is submitted (node 4530:10413).
 *
 * Two things sit under the heading: a preview of the report the flow just described, and an
 * accordion holding the answers themselves. The preview is the point — a report config is
 * abstract until you see a row of it.
 */

/**
 * Rows per page in the preview's footer.
 *
 * The table is a fixed three rows, so this paginates nothing — it is the design's own
 * footer (node 4530:10524) and the control it draws. Stated rather than hidden because
 * DataTable renders the footer from `pagination`, and the alternative is a table that ends
 * on a hard edge where the design ends on a rule.
 */
const PREVIEW_PAGE_SIZE = 10

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
const buildPreviewRows = (columns: FieldColumn[], customFields: CustomField[]): PreviewRow[] =>
  Array.from({ length: SAMPLE_ROW_COUNT }, (_, row) => {
    const cells: Record<string, string> = {}
    for (const column of columns) {
      cells[column.id] = sampleFor(
        column.title,
        row,
        customFields.find((field) => field.title === column.title)?.defaultValue,
      )
    }
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

/**
 * The schedule and the channel, as the one sentence they are.
 *
 * Assembled rather than stored: the Delivery step asks it as five questions — cadence,
 * timing, which day, what time, where to — and reading five labels back is not how anyone
 * holds "every Monday at 09:00, by email" in their head. "As soon as recon completes"
 * answers the cadence on its own; nothing below it is asked (isDeliveryComplete), so nothing
 * below it is read.
 *
 * An unset schedule says what happens instead of what is missing: a config with no cadence
 * is not broken, it is a report you run yourself.
 */
function scheduleAndChannel({
  frequency,
  timing,
  dayOfWeek,
  dayOfMonth,
  time,
  channels,
}: DeliveryAnswers) {
  const where = channels.length ? ` to ${channels.join(', ')}` : ''

  if (timing !== null && timing !== SPECIFIED_TIME) {
    return `As soon as recon completes${where}`
  }
  if (frequency === null) {
    return channels.length ? `Runs on demand${where}` : `${UNSET} — runs once, on demand`
  }

  const day =
    frequency === WEEKLY && dayOfWeek
      ? ` on ${dayOfWeek}`
      : frequency === MONTHLY && dayOfMonth
        ? dayOfMonth === LAST_DAY_OF_MONTH
          ? ' on the last day'
          : ` on the ${dayOfMonth}`
        : ''
  return `${frequency}${day}${time ? ` at ${time}` : ''}${where}`
}

/**
 * The report format in the words the flow offered it by.
 *
 * `setup.format` holds the id — 'Raw' / 'Aggregated' — which is what the rest of the app
 * switches on, and which nobody picked: the Setup step's third question offers "Transaction
 * level records" and "Grouped records" (REPORT_FORMATS). Read off that list rather than
 * copied from it, so the two cannot drift.
 */
const formatTitle = (format: SetupAnswers['format']) =>
  format === null ? '' : (REPORT_FORMATS.find((option) => option.id === format)?.title ?? format)

/** One filter rule as a sentence. A condition that takes no value ends after the condition. */
const ruleSentence = ({ column, condition, value }: FiltersAnswers['rules'][number]) =>
  [column, condition, value.join(', ')].filter(Boolean).join(' ')

export function ReviewStep({
  setup,
  delivery,
  fields,
  filters,
}: {
  setup: SetupAnswers
  delivery: DeliveryAnswers
  fields: FieldsAnswers
  filters: FiltersAnswers
}) {
  const { columns } = fields
  /** Derived, so a grouping whose column has since left the report is not read back. */
  const groupBy = activeGroupBy(fields)
  const rules = filters.rules.filter(({ column }) => column !== null)

  /**
   * The report header, or `null` when the report has none.
   *
   * `null` rather than a boolean beside a string, because "no header" and "an empty header"
   * are the same thing to the user and should be one state in the code — otherwise the empty
   * string is reachable two ways and the button and the field can disagree about which one
   * is showing.
   *
   * blend-gap: the design draws the button (node 4530:10899) with nothing behind it yet, so
   * the field it opens is composed here rather than taken from a node.
   */
  const [headerText, setHeaderText] = useState<string | null>(null)

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* The button and the field are the same control in two states, never both at once.
            Leaving the button up beside an open field would offer to add a second header to
            a file that has one first row — and deleting the field is what puts the button
            back, so the pair reads as one toggle rather than two things to keep in step. */}
        {headerText === null ? (
          <div className="flex">
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.LARGE}
              text="Add report header info"
              // `rightSlot`, matching the design — the glyph trails the label rather than
              // leading it, which reads as "and then edit" rather than labelling the button.
              rightSlot={{ slot: <Pencil size={16} /> }}
              onClick={() => setHeaderText('')}
            />
          </div>
        ) : (
          <div className="relative">
            <TextAreaV2
              label="Report header"
              // TextAreaV2 computes its accessible name from `label` alone — `filteredRest`
              // is built and then never spread (TextAreaV2.tsx:236), so an `aria-label` here
              // would be dropped. Which is why the label is the component's and not a
              // PrimitiveText above it.
              placeholder="This text will appear in the first row of your Excel file."
              size={InputSizeV2.MD}
              rows={3}
              // Vertical only: the field already fills the column, and a horizontal handle
              // just lets it be dragged out of the layout.
              resize="vertical"
              value={headerText}
              autoFocus
              onChange={(event) => setHeaderText(event.target.value)}
            />

            {/* On the label's row, trailing — the one place the control costs no height.
                Below the field it put a 32px row between the header and the table it
                describes; beside the field it would have narrowed the box off the table's
                edges. The label row is otherwise empty to the right.

                blend-gap: TextAreaV2 has no slot beside its label, so this is positioned
                over that row: `h-5` is the label's 20px line, the height RecipientsInput's
                ✕ measures against too. Secondary + INLINE tinted by neutralLinkTokens is the
                same borderless link as "Cc" / "Bcc", which fold their fields away the same
                way; ButtonV2 hard-codes `cursor: default`, hence the wrapper. */}
            <div className="absolute top-0 right-0 flex h-5 items-center [&_button]:cursor-pointer [&_button:hover_span]:underline [&_button:hover_span]:underline-offset-2">
              <ThemeProvider componentTokens={neutralLinkTokens}>
                <ButtonV2
                  buttonType={ButtonV2Type.SECONDARY}
                  subType={ButtonV2SubType.INLINE}
                  size={ButtonV2Size.SMALL}
                  text="Remove"
                  aria-label="Remove report header"
                  // Back to null, which both removes the field and restores the button. The
                  // text goes with it: a header you removed and then added again is a new
                  // header, not the old one waiting where you left it.
                  onClick={() => setHeaderText(null)}
                />
              </ThemeProvider>
            </div>
          </div>
        )}

        <DataTable
          data={buildPreviewRows(columns, fields.customFields)}
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
            totalRows: SAMPLE_ROW_COUNT,
            pageSizeOptions: [PREVIEW_PAGE_SIZE],
          }}
        />
      </div>

      {/* No header action. The column count used to sit up here as a tag, which said the
          same number as the "Columns · N" label further down — and said it first, in the one
          slot on the card that should carry something the rows below do not. A count is a
          fact about one row, so it lives on that row. */}
      <ConfigSummaryCard title="Configuration" keyColumn="240px">
        {/* No configuration name row: it is asked after this step, in SubmitConfigModal, so
            at review time there is nothing to show but a dash. */}
        <ConfigSummaryRow
          label="Category"
          value={setup.category ?? UNSET}
          muted={setup.category === null}
        />
        {/* Type and format on one row, as the reference pairs them: neither answer
            means much alone — "Settlement" does not say whether you get rows or
            totals — and read together they are one sentence about what the file is. */}
        <ConfigSummaryRow
          label="Report type and format"
          value={
            setup.sourceType || setup.format
              ? [setup.sourceType, formatTitle(setup.format)].filter(Boolean).join(' · ')
              : UNSET
          }
          muted={setup.sourceType === null && setup.format === null}
        />
        <ConfigSummaryRow
          label="Schedule and channel"
          value={scheduleAndChannel(delivery)}
          muted={delivery.frequency === null && delivery.channels.length === 0}
        />
        <ConfigSummaryChipRow
          label="Filters"
          empty={rules.length === 0 ? 'None' : undefined}
        >
          {rules.map((rule) => summaryChip(ruleSentence(rule), rule.id))}
        </ConfigSummaryChipRow>
        {/* The count is in the label rather than in a tag beside it: it is a fact about
            this row, and the accordion header already carries the headline count. */}
        <ConfigSummaryChipRow
          label={`Columns · ${columns.length}`}
          empty={columns.length === 0 ? UNSET : undefined}
        >
          {columns.map((column, index) => {
            /*
             * Numbered, because this row is about order and nothing else — the same names
             * carry no rank on their own. A grouped column keeps its place and is marked
             * rather than moved: the order is one fact, the grouping is a second fact about
             * one of them.
             *
             * The grouping is the chip's *colour*, not more words in it. Purple is already
             * what a grouped field wears on the Grouping step and in the column organiser,
             * so by the time a reader reaches this card they have met it twice; spelling it
             * out a third time costs the row a third of its width and tells them nothing the
             * colour has not. The level, which the colour cannot carry, is in the tooltip.
             *
             * Matched by field, because `groupBy` holds fields rather than column ids
             * (answers.ts), so a column that was removed and re-added still reads as the
             * level the user set on the Grouping step.
             */
            const level = groupBy.findIndex((field) => sameField(field, fieldOf(column)))
            return summaryChip(
              `${index + 1} · ${column.title}`,
              column.id,
              level === -1
                ? undefined
                : {
                    color: TagV2Color.PURPLE,
                    title:
                      groupBy.length > 1
                        ? `Grouping level ${level + 1} of ${groupBy.length}`
                        : 'Grouped by',
                  },
            )
          })}
        </ConfigSummaryChipRow>
      </ConfigSummaryCard>
    </>
  )
}

export default ReviewStep
