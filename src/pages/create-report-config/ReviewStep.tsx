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
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'
import {
  activeGroupBy,
  LAST_DAY_OF_MONTH,
  MONTHLY,
  SPECIFIED_TIME,
  WEEKLY,
  type DeliveryAnswers,
  type FieldColumn,
  type FieldsAnswers,
  type FiltersAnswers,
  type SetupAnswers,
} from './answers'

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

/** Nothing answered yet. An em dash reads as "left blank", where an empty cell reads as a bug. */
const UNANSWERED = '—'

/**
 * A label in the summary panel. Uppercase and tracked out, per the design — the case is set
 * on a wrapper because `text-transform` inherits and PrimitiveText takes no className
 * (rule 2), so the wrapper is the only place to put it.
 */
function FieldLabel({ children }: { children: string }) {
  return (
    <span className="uppercase tracking-[0.04em]">
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
        {children}
      </PrimitiveText>
    </span>
  )
}

/** A value in the summary panel — a string, or whatever the caller draws instead. */
function FieldValue({ children }: { children: ReactNode }) {
  return typeof children === 'string' ? (
    <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[700]}>
      {children}
    </PrimitiveText>
  ) : (
    <>{children}</>
  )
}

/**
 * One cell of the six across the top — label above value.
 *
 * `gray[0]` on every cell over the panel's `gray[200]` background is what draws the grid
 * lines: the 1px gaps between cells are the only place the background shows. Borders per
 * cell would need a different rule on the cells that happen to start a row, and the row a
 * cell starts changes with the viewport.
 */
function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex min-w-0 flex-col gap-1 px-4 py-3"
      style={{ backgroundColor: colors.gray[0] }}
    >
      <FieldLabel>{label}</FieldLabel>
      <FieldValue>{value}</FieldValue>
    </div>
  )
}

/**
 * One of the full-width rows below them — a shaded label column beside its value.
 *
 * These three carry lists rather than single words, and a list in a sixth of the panel's
 * width wraps into a column of fragments. So they get the full measure, with the label
 * moved beside the value rather than above it.
 */
function SummaryBand({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-px sm:grid-cols-[176px_1fr]">
      <div className="px-4 py-3" style={{ backgroundColor: colors.gray[50] }}>
        <FieldLabel>{label}</FieldLabel>
      </div>
      <div
        className="flex min-w-0 flex-wrap items-center gap-2 px-4 py-3"
        style={{ backgroundColor: colors.gray[0] }}
      >
        {children}
      </div>
    </div>
  )
}

/** A field name in one of the bands. Neutral — it names a column, it is not a state. */
const fieldChip = (text: string, key?: string) => (
  <TagV2
    key={key ?? text}
    text={text}
    size={TagV2Size.SM}
    subType={TagV2SubType.SQUARICAL}
    color={TagV2Color.NEUTRAL}
    type={TagV2Type.SUBTLE}
  />
)

/**
 * The schedule, as the one sentence it is.
 *
 * Assembled rather than stored: the Delivery step asks it as four questions — cadence,
 * timing, which day, what time — and reading four labels back is not how anyone holds a
 * schedule in their head. "Immediately" answers the whole thing on its own; nothing below
 * it is asked (isDeliveryComplete), so nothing below it is read.
 */
function scheduleSentence({ frequency, timing, dayOfWeek, dayOfMonth, time }: DeliveryAnswers) {
  if (timing !== null && timing !== SPECIFIED_TIME) return 'As soon as recon completes'
  if (frequency === null) return UNANSWERED
  const day =
    frequency === WEEKLY && dayOfWeek
      ? ` on ${dayOfWeek}`
      : frequency === MONTHLY && dayOfMonth
        ? dayOfMonth === LAST_DAY_OF_MONTH
          ? ' on the last day'
          : ` on the ${dayOfMonth}`
        : ''
  return `${frequency}${day}${time ? ` at ${time}` : ''}`
}

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

      <AccordionV2 accordionType={AccordionV2Type.BORDER} defaultValue="configuration">
        <AccordionV2Item
          value="configuration"
          title="Configuration details"
          // The count sits in the header so it survives the panel being collapsed — it is the
          // one number worth knowing without opening anything.
          rightSlot={
            // The wrapper is doing real work: the trigger lays its slots out as a flex row
            // that lets this one shrink, and at its natural basis the label breaks after every
            // word. TagV2 omits className (rule 2), so the rule goes on an element we own.
            <span className="shrink-0 whitespace-nowrap">
              <TagV2
                text={`${columns.length} ${columns.length === 1 ? 'column' : 'columns'} selected`}
                size={TagV2Size.SM}
                subType={TagV2SubType.SQUARICAL}
                color={TagV2Color.PRIMARY}
                type={TagV2Type.SUBTLE}
              />
            </span>
          }
        >
          {/* blend-gap: Blend 0.0.37 ships no description-list or key-value panel, so this is
              a grid of Block-free cells on token colours. The 1px gaps are the rules: the
              container's gray[200] shows through between cells that each paint themselves. */}
          <div className="px-6 pb-4">
            <div
              className="flex flex-col gap-px overflow-hidden"
              style={{
                backgroundColor: colors.gray[200],
                border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
                borderRadius: FOUNDATION_THEME.border.radius[12],
              }}
            >
              {/* The six single-word answers, across the top. Two columns on a phone rather
                  than one, because these are short and a six-deep stack buries the rest. */}
              <div className="grid grid-cols-2 gap-px md:grid-cols-3 xl:grid-cols-6">
                <SummaryCell label="Configuration name" value={delivery.name.trim() || UNANSWERED} />
                <SummaryCell label="Category" value={setup.category ?? UNANSWERED} />
                <SummaryCell label="Report type" value={setup.sourceType ?? UNANSWERED} />
                <SummaryCell label="Report format" value={setup.format ?? UNANSWERED} />
                <SummaryCell label="Schedule" value={scheduleSentence(delivery)} />
                <SummaryCell
                  label="Channel"
                  value={delivery.channels.join(', ') || UNANSWERED}
                />
              </div>

              <SummaryBand label="Metrics">
                {columns.length === 0 ? (
                  <FieldValue>{UNANSWERED}</FieldValue>
                ) : (
                  columns.map(({ id, title }) => fieldChip(title, id))
                )}
              </SummaryBand>

              <SummaryBand label="Filters">
                {rules.length === 0 ? (
                  <FieldValue>{UNANSWERED}</FieldValue>
                ) : (
                  rules.map((rule) => fieldChip(ruleSentence(rule), rule.id))
                )}
              </SummaryBand>

              {/* Numbered, because this row is about order and nothing else — the chips above
                  carry the same names and say nothing about which comes first. A grouped
                  column keeps its place here and is marked rather than moved: this reads back
                  the column order, and the grouping is a second fact about one of them. */}
              <SummaryBand label="Column order">
                {columns.length === 0 ? (
                  <FieldValue>{UNANSWERED}</FieldValue>
                ) : (
                  columns.map((column, index) => (
                    <span key={column.id} className="flex items-center gap-1.5">
                      <PrimitiveText
                        {...font(FOUNDATION_THEME.font.size.body.md)}
                        color={colors.gray[400]}
                      >
                        {`${index + 1}.`}
                      </PrimitiveText>
                      <FieldValue>{column.title}</FieldValue>
                      {groupBy.includes(column.id) && (
                        <TagV2
                          // The level number only earns its place once there is more than
                          // one: "Group by 1" of 1 states a rank nothing else competes for.
                          text={
                            groupBy.length > 1
                              ? `Group by ${groupBy.indexOf(column.id) + 1}`
                              : 'Group by'
                          }
                          size={TagV2Size.XS}
                          subType={TagV2SubType.SQUARICAL}
                          color={TagV2Color.PRIMARY}
                          type={TagV2Type.SUBTLE}
                          title={`Grouping level ${groupBy.indexOf(column.id) + 1} of ${groupBy.length}`}
                        />
                      )}
                    </span>
                  ))
                )}
              </SummaryBand>
            </div>
          </div>
        </AccordionV2Item>
      </AccordionV2>
    </>
  )
}

export default ReviewStep
