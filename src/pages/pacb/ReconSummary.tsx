/**
 * PACB Recon → Payment Info Generator (at /pacb/generate-payment-info; called Recon Summary
 * until 2026-10-01 — the file and component keep that name).
 *
 * The flow the buttons model: settlements arrive on HOLD; an operator marks the ones that
 * are good as READY (or reverts them); Generate Payment Info then takes every READY row and
 * produces its payment instruction, which moves it to GENERATED and out of the pending
 * totals.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  ColumnType,
  FOUNDATION_THEME,
  ModalV2,
  SnackbarV2Variant,
  addSnackbarV2,
  type ColumnDefinition,
  type DateRange,
} from '@juspay/blend-design-system'
import { CircleCheck, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BREAKDOWN_CATEGORIES, RECON_ROWS, type PiStatus, type ReconRow } from './data'
import { formatRange } from './dates'
import { ReconDetailSheet } from './ReconDetailSheet'
import { ReconFilters } from './ReconFilters'
import {
  EMPTY_QUERY,
  SHEET_OPTIONS,
  applyQuery,
  tableOptions,
  withinOptions,
  type ReconQuery,
} from './recon-query'
import { useReconSummaryDials } from './recon-summary-layout'
import {
  AmountCell,
  PacbPage,
  PacbTable,
  RangePicker,
  SelectionBar,
  StatTile,
} from './kit'
import {
  amount,
  amountCol,
  copyCol,
  dateCol,
  idCol,
  inRange,
  rangeOf,
  statusCol,
  textCol,
  usePaged,
  useSelection,
} from './helpers'

const { colors } = FOUNDATION_THEME

const COLUMNS = [
  idCol<ReconRow>('reconId', 'Recon ID', { copyable: true }),
  amountCol<ReconRow>('settlementAmount', 'Settlement Amount'),
  textCol<ReconRow>('entityId', 'Entity ID'),
  textCol<ReconRow>('lineOfBusiness', 'Line of Business'),
  textCol<ReconRow>('purposeCode', 'Purpose Code'),
  statusCol<ReconRow>('piStatus', 'PI Status'),
  copyCol<ReconRow>('paymentId', 'Payment ID'),
  textCol<ReconRow>('businessType', 'Business Type'),
  textCol<ReconRow>('paymentEntity', 'Payment Entity'),
  copyCol<ReconRow>('adUtrNo', 'AD UTR No'),
  copyCol<ReconRow>('merchantUtrNo', 'Merchant UTR No'),
  copyCol<ReconRow>('settlementId', 'Settlement ID'),
  dateCol<ReconRow>('createdAt', 'Created At'),
]

/**
 * The lean set drops the payout references, which stay "-" until the payment is made — on a
 * page of settlements still waiting for payment info, three columns of dashes — and Business
 * Type. All four are still in the row's detail sheet, and the dial's "All columns" brings
 * them back.
 */
const LEAN_HIDDEN = new Set(['adUtrNo', 'merchantUtrNo', 'settlementId', 'businessType'])

/**
 * Columns sized to their content. Blend gives every column a minimum and a maximum by type —
 * TEXT 120–250px, NUMBER 80–120px, which clips an amount in the crores — and never applies
 * `width`, so both bounds come off here and the table wrapper below does the rest.
 */
const hug = (columns: ColumnDefinition<ReconRow>[]) =>
  columns.map((column) => ({ ...column, minWidth: '0px', maxWidth: 'none' }))

const FULL_COLUMNS = hug(COLUMNS)
const LEAN_COLUMNS = hug(COLUMNS.filter((column) => !LEAN_HIDDEN.has(String(column.field))))

type BreakdownRow = {
  category: string
  /** Unsigned; `sign` says whether it adds to the settlement or comes off it. */
  amount: number
  sign: 1 | -1
  /** Transaction count, for the two components that have one. */
  count: number | null
  /** The last row: what the parts net to. */
  net?: boolean
}

const { colors: palette } = FOUNDATION_THEME

/**
 * Two columns, fixed order, no header menus: the rows are the settlement's formula top to
 * bottom — each part signed, then the net they come to — and sorting would scramble it.
 * The count rides in the component cell, muted, because only Order and Refund have one; a
 * column of its own was six dashes out of eight.
 */
const BREAKDOWN_COLUMNS: ColumnDefinition<BreakdownRow>[] = [
  {
    field: 'category',
    header: 'Component',
    type: ColumnType.TEXT,
    isSortable: false,
    renderCell: (_value, row) =>
      row.net ? (
        <span style={{ fontWeight: FOUNDATION_THEME.font.weight[600] }}>{row.category}</span>
      ) : (
        <span>
          {row.category}
          {row.count !== null && (
            <span style={{ color: palette.gray[500] }}> · {plural(row.count, 'txn')}</span>
          )}
        </span>
      ),
  },
  {
    field: 'amount',
    header: 'Amount',
    type: ColumnType.NUMBER,
    isSortable: false,
    // Two places, always — this is money summed across rows, and 0 should read as 0.00.
    renderCell: (value, row) => (
      <AmountCell negative={row.sign < 0 && value !== 0} strong={row.net}>
        {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </AmountCell>
    ),
  },
]

const plural = (n: number, one: string) =>
  `${n.toLocaleString('en-US')} ${one}${n === 1 ? '' : 's'}`

/** The period, written the way the range picker writes it (dates.ts). */
const rangeLabel = ({ startDate, endDate }: DateRange) => formatRange(startDate, endDate)

function ReconSummary() {
  const [range, setRange] = useState<DateRange>(() => rangeOf('2026-09-22', '2026-09-29'))
  const [rows, setRows] = useState(RECON_ROWS)
  const [showBreakdown, setShowBreakdown] = useState(false)
  // By id, not the row object, so the sheet shows the row's current status after Mark Ready.
  const [openRowId, setOpenRowId] = useState<string | null>(null)
  const openRow = rows.find((row) => row.rowId === openRowId) ?? null
  const { selected, onRowSelectionChange, clear: clearSelection, tableKey } = useSelection()
  const { layout, columns: columnSet, cards: cardOrder, cardSize, filters: filterScope } =
    useReconSummaryDials()

  const [query, setQuery] = useState<ReconQuery>(EMPTY_QUERY)
  const inRangeRows = useMemo(
    () => rows.filter((row) => inRange(row.createdAt, range)),
    [rows, range],
  )
  const tableColumns = columnSet === 'full' ? FULL_COLUMNS : LEAN_COLUMNS
  // Version 2 of the filters offers only what the table shows; version 1, the whole sheet.
  const queryOptions = useMemo(
    () =>
      filterScope === 'table'
        ? tableOptions(tableColumns.map((c) => ({ field: String(c.field), label: c.header })))
        : SHEET_OPTIONS,
    [filterScope, tableColumns],
  )
  // The filters scope the page the way the range does — totals, table and Generate all act
  // on what is shown, so nothing counts or generates a row the filters have hidden. Anything
  // the panel no longer offers is dropped first (withinOptions).
  const activeQuery = useMemo(() => withinOptions(query, queryOptions), [query, queryOptions])
  const visible = useMemo(() => applyQuery(inRangeRows, activeQuery), [inRangeRows, activeQuery])
  const pending = useMemo(() => visible.filter((row) => row.piStatus !== 'GENERATED'), [visible])
  const { pageRows, pagination } = usePaged(visible)

  const selectedRows = rows.filter((row) => selected.includes(row.rowId))
  const canMarkReady = selectedRows.some((row) => row.piStatus === 'HOLD')
  const canRevert = selectedRows.some((row) => row.piStatus === 'READY')
  const readyCount = visible.filter((row) => row.piStatus === 'READY').length

  /** Moves the selected rows that are in `from` to `to`. Rows in any other state are left. */
  const move = (from: PiStatus, to: PiStatus) => {
    const ids = new Set(selectedRows.filter((row) => row.piStatus === from).map((r) => r.rowId))
    setRows((current) =>
      current.map((row) => (ids.has(row.rowId) ? { ...row, piStatus: to } : row)),
    )
    return ids.size
  }

  const generate = () => {
    const ready = visible.filter((row) => row.piStatus === 'READY')
    const total = ready.reduce((sum, row) => sum + row.settlementAmount, 0)
    const ids = new Set(ready.map((row) => row.rowId))
    setRows((current) =>
      current.map((row) => (ids.has(row.rowId) ? { ...row, piStatus: 'GENERATED' } : row)),
    )
    addSnackbarV2({
      header: `Payment info generated for ${plural(ready.length, 'settlement')}`,
      description: `${amount(total)} moves to the PACB Workflow's payment file queue.`,
      variant: SnackbarV2Variant.SUCCESS,
    })
  }

  const pendingAmount = pending.reduce((sum, row) => sum + row.settlementAmount, 0)

  const breakdown = useMemo(
    () =>
      [
        ...BREAKDOWN_CATEGORIES.map(({ label, amount: field, count, sign }) => ({
          category: label,
          amount: pending.reduce((sum, row) => sum + row[field], 0),
          sign,
          count: count ? pending.reduce((sum, row) => sum + row[count], 0) : null,
        })),
        // The same figure as the amount card, so the modal ends on the number that opened it.
        { category: 'Net Settlement', amount: pendingAmount, sign: 1, count: null, net: true },
      ] satisfies BreakdownRow[],
    [pending, pendingAmount],
  )

  const cardProps = {
    onClick: () => setShowBreakdown(true),
    compact: true,
    tone: 'gray' as const,
    bare: layout === 'inline' || layout === 'strip',
    valueFirst: cardOrder === 'value-first',
    minimal: cardSize === 'minimal',
  }
  // Either card opens the breakdown: it is the breakdown of exactly these two numbers, so the
  // numbers are the way in. The titles say what each figure is — "Pending Amount", "Pending
  // Count" — so neither carries a subtitle.
  // Layout 6 names its container by the period it scopes — see recon-summary-layout.ts.
  const period = rangeLabel(range)

  const amountCard = (
    <StatTile
      {...cardProps}
      title="Pending Amount"
      value={`₹${amount(Math.round(pendingAmount * 100) / 100)}`}
      helpIconText="Sum of settlement amounts not yet sent for payment info generation, in the selected range."
    />
  )
  const countCard = (
    <StatTile
      {...cardProps}
      title="Pending Count"
      value={String(pending.length)}
    />
  )
  // The range and the filters travel together: whichever bar holds one holds both.
  const picker = (
    <div className="flex items-center gap-2">
      <RangePicker value={range} onChange={setRange} />
      <ReconFilters
        rows={inRangeRows}
        value={activeQuery}
        onChange={setQuery}
        options={queryOptions}
      />
    </div>
  )
  const generateButton = (
    <ButtonV2
      buttonType={ButtonV2Type.PRIMARY}
      size={ButtonV2Size.MEDIUM}
      text="Generate Payment Info"
      disabled={readyCount === 0}
      onClick={generate}
      {...(layout === 'rail' && { width: '100%' })}
    />
  )

  /** The two cards as a fixed-width pair: a width that followed the amount would shift the
      count card as the total changed. */
  const cardPair = (
    <div className="flex flex-wrap items-stretch gap-4">
      <div className="w-[300px]">{amountCard}</div>
      <div className="w-[300px]">{countCard}</div>
    </div>
  )

  // Mark Ready and Revert to Hold, each only when the selection has a row it applies to
  // rather than drawn and disabled: in a bar that exists only for the selection, a control
  // that cannot act on it is noise. With neither applicable (every ticked row GENERATED) the
  // bar is the count and Deselect all.
  const selectionActions = (
    <>
      {canMarkReady && (
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Mark Ready"
          leftSlot={{ slot: <CircleCheck size={14} />, maxHeight: 14 }}
          onClick={() => move('HOLD', 'READY')}
        />
      )}
      {canRevert && (
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Revert to Hold"
          // Undo rather than a pause glyph: this takes back a Mark Ready, and HOLD is where
          // every row starts, not a state you put one into.
          leftSlot={{ slot: <Undo2 size={14} />, maxHeight: 14 }}
          onClick={() => move('READY', 'HOLD')}
        />
      )}
    </>
  )

  /* The selection bar sits above the table, not over it (SelectionBar in kit.tsx): Blend's
     own floats over the rows, and these are rows you read before marking them Ready.

     blend-gap: no column-sizing mode. Every cell carries an inline `width: auto` and the
     table is `width: 100%` (utils.ts getColumnStyles, dataTable.tokens.ts), so the browser
     spreads spare width across all columns. `w-px` on every cell but the last makes each
     one shrink to its content, and the last takes what is left; `!` because Blend's width
     is inline. `nowrap` so a shrunk header keeps its label on one line. */
  const table = (
    <div className="flex flex-col gap-3">
      {selected.length > 0 && (
        <SelectionBar count={selected.length} actions={selectionActions} onClear={clearSelection} />
      )}
      <div className="[&_:is(th,td)]:!w-px [&_:is(th,td)]:whitespace-nowrap [&_:is(th,td):last-child]:!w-auto">
        <PacbTable<ReconRow>
          // Remounted by Deselect all — the only way to clear DataTable's checkboxes (useSelection).
          key={tableKey}
          data={pageRows}
          columns={tableColumns}
          idField="rowId"
          // Layout 1 puts Generate in the table's own header, beside a title naming the rows it
          // acts on. Elsewhere — layout 6 included, whose range bar already names the period
          // and holds Generate — the table has no header at all (DataTableHeader:240).
          {...(layout === 'table' && {
            title: 'Settlements',
            description: 'Mark rows Ready, then generate payment info for them.',
            headerSlot1: generateButton,
          })}
          enableRowSelection
          onRowSelectionChange={onRowSelectionChange}
          onRowClick={(row) => setOpenRowId(row.rowId)}
          {...pagination}
        />
      </div>
    </div>
  )

  // The five arrangements — see recon-summary-layout.ts. Each one places the same pieces.
  const body = {
    table: (
      <>
        {cardPair}
        {table}
      </>
    ),
    header: (
      <>
        {cardPair}
        {table}
      </>
    ),
    strip: (
      // blend-gap: Blend has no plain bordered container, so the strip is a Tailwind box with
      // the card's own tokens — 12px radius, gray[200] hairline — around two borderless cards.
      <>
        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5"
          style={{
            border: `1px solid ${colors.gray[200]}`,
            borderRadius: FOUNDATION_THEME.border.radius[12],
            backgroundColor: colors.gray[0],
          }}
        >
          {amountCard}
          <div className="h-12 w-px self-center" style={{ backgroundColor: colors.gray[200] }} />
          {countCard}
          <div className="ml-auto">{generateButton}</div>
        </div>
        {table}
      </>
    ),
    inline: (
      <>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            {amountCard}
            {countCard}
          </div>
          <div className="flex items-center gap-3">
            {picker}
            {generateButton}
          </div>
        </div>
        {table}
      </>
    ),
    rail: (
      // The table keeps a min-w-0 track so its own horizontal scroll, not the page's, takes up
      // the columns that do not fit beside the rail.
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {amountCard}
          {countCard}
          {generateButton}
        </div>
        <div className="min-w-0">{table}</div>
      </div>
    ),
    scoped: (
      // The range as the header of everything it filters: one container, the picker on its
      // top edge, the totals and the table inside it. The nesting is what says "this controls
      // these" — a picker beside the title says only that it is on the page.
      //
      // blend-gap: Blend has no section/panel container, so this is a Tailwind box drawn with
      // the card tokens — 12px radius, gray[200] hairline, a gray[50] header band.
      <section
        aria-label={`Payment info generator for ${period}`}
        className="flex flex-col overflow-hidden"
        style={{
          border: `1px solid ${colors.gray[200]}`,
          borderRadius: FOUNDATION_THEME.border.radius[12],
          backgroundColor: colors.gray[0],
        }}
      >
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          style={{ backgroundColor: colors.gray[50], borderBottom: `1px solid ${colors.gray[200]}` }}
        >
          {picker}
          {/* Generate takes every READY row in the range, so it belongs to the range too —
              on the same bar, at its far end. */}
          <div className="ml-auto">{generateButton}</div>
        </div>
        <div className="flex flex-col gap-6 p-4">
          {cardPair}
          {table}
        </div>
      </section>
    ),
  }[layout]

  const actions = {
    table: picker,
    header: (
      <>
        {picker}
        {generateButton}
      </>
    ),
    strip: picker,
    inline: undefined,
    rail: picker,
    // The range lives on the container it scopes instead.
    scoped: undefined,
  }[layout]

  return (
    <PacbPage title="Payment Info Generator" actions={actions}>
      {body}

      <ModalV2
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        title="Settlement Breakdown"
        // What the table is scoped to — the one thing the table itself cannot say.
        subtitle={`${plural(pending.length, 'pending settlement')} · ${rangeLabel(range)}`}
        showCloseButton
        closeOnBackdropClick
        dimensions={{ width: 560 }}
      >
        {/* No table title or description: the modal's title already names it. With neither
            and no toolbar, DataTableHeader renders nothing (DataTableHeader:240).

            blend-gap: header alignment is one token for every column, and the header cell is
            inline `text-align: left`. The Amount label sits over right-aligned figures, so it
            goes right too. `!` because the label's own styled-components class sets left, and
            unlayered CSS beats Tailwind's utilities layer. Keyed on the `data-id` Blend gives
            the header cell. */}
        <div className="[&_th[data-id='Amount']_p]:!text-right">
          <PacbTable<BreakdownRow>
            data={breakdown}
            idField="category"
            columns={BREAKDOWN_COLUMNS}
            showToolbar={false}
          />
        </div>
      </ModalV2>

      <ReconDetailSheet row={openRow} onClose={() => setOpenRowId(null)} />
    </PacbPage>
  )
}

export default ReconSummary
