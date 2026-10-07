/**
 * A scratch copy of PacbWorkflow.tsx to tinker with — changes here do not touch the real
 * page. Delete this file and its row in routes.ts / router.tsx when done.
 *
 * PACB Recon → PACB Workflow. One page, five stages of the same payments, one per tab:
 * the payment file, its supporting file, the 145/146 forms, the transaction report and the
 * merchant payment report.
 *
 * The tab lives in the URL (`?tab=`), so a link to a stage opens on that stage.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  SnackbarV2Variant,
  TabsV2,
  TabsV2List,
  TabsV2Size,
  TabsV2Trigger,
  TabsV2Variant,
  ThemeProvider,
  addSnackbarV2,
  type ColumnDefinition,
  type DateRange,
} from '@juspay/blend-design-system'
import { Building2, CloudUpload, Download, Filter, Hourglass, LayoutGrid, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { sectionTabsTokens } from '../../theme'
import { FileDetailSheet } from './FileDetailSheet'
import {
  EMPTY,
  FORM_ROWS,
  MPR_ROWS,
  PAYMENT_FILE_GENERATE,
  PAYMENT_FILE_STAGE,
  REPORT_FILE_ROWS,
  SUPPORTING_FILE_GENERATE,
  SUPPORTING_FILE_STAGE,
  TRANSACTION_REPORT_PENDING,
  TRANSACTION_REPORT_ROWS,
  type FileRow,
  type FormRow,
  type GenerateRow,
  type MprRow,
  type ReportFileRow,
  type StageRow,
  type TransactionReportRow,
} from './data'
import {
  CellAction,
  FullBleed,
  PacbPage,
  PacbTable,
  RangePicker,
  SectionTitle,
  StatRow,
  StatusTag,
} from './kit'
import {
  STAT_ICON,
  amountCol,
  dateCol,
  elementCol,
  idCol,
  inRange,
  rangeOf,
  statusCol,
  FILE_STATUS_COLORS,
  copyCol,
  textCol,
  usePaged,
  useSelection,
} from './helpers'


const TABS = ['Payment File', 'Supporting File', 'Form 145/146', 'Transaction Report', 'MPR'] as const
type Tab = (typeof TABS)[number]

const slug = (tab: Tab) => tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const tabFromSlug = (value: string | null): Tab =>
  TABS.find((tab) => slug(tab) === value) ?? TABS[0]

const DOWNLOAD = <Download size={16} />

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

/** What a section's button does in this demo: say it was asked for. Nothing is sent. */
const announce = (header: string, description: string) =>
  addSnackbarV2({ header, description, variant: SnackbarV2Variant.SUCCESS })

// ─── Payment File / Supporting File ──────────────────────────────────────────────────────


// Payment ID identifies the row, so the Settlement ID it used to sit beside is gone. Purpose
// Code and Merchant Business Type are left out too — one value for every PACB payment, so
// two columns that never vary — and so is AD UTR No.
const GENERATE_COLUMNS: ColumnDefinition<GenerateRow>[] = [
  copyCol('paymentId', 'Payment ID'),
  textCol('entityId', 'Entity ID'),
  textCol('lineOfBusiness', 'Line of Business'),
  amountCol('settlementAmount', 'Payment Amount'),
  statusCol('fileStatus', 'File Status', FILE_STATUS_COLORS),
  copyCol('merchantUtrNo', 'Merchant UTR No'),
  statusCol('paymentStatus', 'Payment Status'),
  textCol('settledAt', 'Settled At'),
  idCol('fileUuid', 'File Uuid', { copyable: true }),
  dateCol('paymentFileCreatedAt', 'File Created At'),
]

const downloadCol = (label: string) =>
  elementCol<StageRow>('download', 'Download File', (row) =>
    // No file yet, nothing to download — the empty mark, as any other empty cell.
    row.fileName === EMPTY ? (
      EMPTY
    ) : (
      <CellAction
        icon={DOWNLOAD}
        label={`Download ${row.fileName}`}
        onClick={() => announce(`Downloading ${label.toLowerCase()}`, row.fileName)}
      />
    ),
  )

const PAYMENT_STAGE_COLUMNS: ColumnDefinition<StageRow>[] = [
  textCol('entityId', 'Entity Id'),
  textCol('fileName', 'File Name', '360px'),
  statusCol('stagingStatus', 'Staging Status'),
  idCol('fileUuid', 'File Uuid', { copyable: true }),
  dateCol('stagedAt', 'File Staged At'),
  dateCol('createdAt', 'Payment Info Created On'),
  downloadCol('Payment file'),
]

const SUPPORTING_STAGE_COLUMNS: ColumnDefinition<StageRow>[] = [
  textCol('entityId', 'Entity Id'),
  textCol('purposeCode', 'Purpose Code'),
  copyCol('paymentId', 'Payment ID'),
  textCol('fileName', 'File Name', '320px'),
  statusCol('stagingStatus', 'Staging Status'),
  idCol('fileUuid', 'File Uuid', { copyable: true }),
  dateCol('stagedAt', 'File Staged At'),
  dateCol('createdAt', 'Payment Info Created On'),
  downloadCol('Supporting file'),
]


const fuseRows = (generate: GenerateRow[], stage: StageRow[]): FileRow[] => {
  const staged = new Map(stage.map((row) => [row.fileUuid, row]))
  return generate.map((row) => {
    const file = staged.get(row.fileUuid)
    return {
      ...row,
      // One status for the file's whole life: the file record's own once there is a file
      // (created or staged), generation's before that — so the Stage table's Staging Status
      // folds in here.
      fileStatus: file?.stagingStatus ?? row.fileStatus,
      fileName: file?.fileName ?? EMPTY,
      stagedAt: file?.stagedAt ?? EMPTY,
      // The file's own creation time when there is a file — that is the Created At the
      // Stage table showed; otherwise the payment's.
      createdAt: file?.createdAt ?? row.createdAt,
    }
  })
}

/**
 * The Generate columns, then every Stage column the Generate table did not already have —
 * matched by field, so Entity Id, File Uuid (and on Supporting File, Payment ID) appear
 * once, and Staging Status and Purpose Code not at all.
 */
/**
 * The order the fused table's columns open in: the payment and its outcome first, then the
 * file's life, then the rest. Drag still reorders for the session.
 */
const FILE_TABLE_ORDER = [
  'paymentId',
  'paymentStatus',
  'entityId',
  'lineOfBusiness',
  'settlementAmount',
  'fileUuid',
  'fileStatus',
  'fileName',
  'stagedAt',
  'createdAt',
  'paymentFileCreatedAt',
  'merchantUtrNo',
  'settledAt',
  'download',
]

const fuseColumns = (stageColumns: ColumnDefinition<StageRow>[]) => {
  // Staging Status is folded into File Status (fuseRows), and Purpose Code is left out of the
  // fused table on purpose (GENERATE_COLUMNS) — so neither comes back from the Stage side.
  const have = new Set([
    ...GENERATE_COLUMNS.map((column) => String(column.field)),
    'stagingStatus',
    'purposeCode',
  ])
  const fused = [
    ...GENERATE_COLUMNS,
    ...stageColumns.filter((column) => !have.has(String(column.field))),
  ] as unknown as ColumnDefinition<FileRow>[]
  // Arranged as the table opens — set by dragging on 2026-10-01. Anything not listed (a
  // column added later) goes at the end rather than disappearing.
  const at = (column: ColumnDefinition<FileRow>) => {
    const i = FILE_TABLE_ORDER.indexOf(String(column.field))
    return i === -1 ? FILE_TABLE_ORDER.length : i
  }
  return [...fused].sort((a, b) => at(a) - at(b))
}

function FileTab({
  noun,
  generate,
  stage,
  stageColumns,
  range,
}: {
  /** "Payment File" or "Supporting File" — every label on the tab is built from it. */
  noun: string
  generate: GenerateRow[]
  stage: StageRow[]
  stageColumns: ColumnDefinition<StageRow>[]
  range: DateRange
}) {
  const generateRows = generate.filter((row) => inRange(row.createdAt, range))
  const rows = fuseRows(generateRows, stage)
  // Paged like every PACB table: without it Blend still pages at 10 internally, but draws no
  // footer, so rows past the tenth cannot be reached.
  const { pageRows, pagination } = usePaged(rows)
  const columns = fuseColumns(stageColumns)
  const { selected, onRowSelectionChange } = useSelection()
  // By id, not the row, so the sheet follows the row through a range change.
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null)
  const openRow = rows.find((row) => row.paymentId === openPaymentId) ?? null
  const count = (status: GenerateRow['fileStatus']) =>
    String(generateRows.filter((row) => row.fileStatus === status).length)

  return (
    <div className="flex flex-col gap-6">
      <StatRow
        stats={[
          { title: 'Pending', value: count('PENDING'), tone: 'warning', icon: <Hourglass size={STAT_ICON} /> },
          { title: 'Created', value: count('CREATED'), icon: <Zap size={STAT_ICON} /> },
          { title: 'Staged', value: count('STAGED'), tone: 'success', icon: <Building2 size={STAT_ICON} /> },
        ]}
      />
      {/* The Generate and Stage tables as one: a payment and the file it became are the same
          row, so both actions act on the same ticks. */}
      <FullBleed>
        <PacbTable<FileRow>
          title={`${noun}s`}
          data={pageRows}
          {...pagination}
          columns={columns}
          idField="paymentId"
          // Blend's column drag — a grip on every header. DataTable keeps the order in its own
          // state, so it lasts until the tab is left.
          enableColumnReordering
          enableRowSelection
          onRowSelectionChange={onRowSelectionChange}
          // A row opens everything about that payment and its file — the Payment Info
          // Generator's row-click, here.
          onRowClick={(row) => setOpenPaymentId(row.paymentId)}
          headerSlot1={
            <div className="flex items-center gap-2">
              <ButtonV2
                buttonType={ButtonV2Type.PRIMARY}
                size={ButtonV2Size.MEDIUM}
                text={`Generate ${noun}`}
                disabled={selected.length === 0}
                onClick={() =>
                  announce(`${noun} generation started`, `${plural(selected.length, 'payment')} queued.`)
                }
              />
              <ButtonV2
                buttonType={ButtonV2Type.PRIMARY}
                size={ButtonV2Size.MEDIUM}
                text={`Stage ${noun}`}
                disabled={selected.length === 0}
                onClick={() =>
                  announce(`${noun} staging started`, `${plural(selected.length, 'file')} queued.`)
                }
              />
            </div>
          }
        />
      </FullBleed>
      <FileDetailSheet noun={noun} row={openRow} onClose={() => setOpenPaymentId(null)} />
    </div>
  )
}

// ─── Form 145/146 ────────────────────────────────────────────────────────────────────────

const FORM_COLUMNS: ColumnDefinition<FormRow>[] = [
  textCol('entityId', 'Entity ID'),
  copyCol('paymentId', 'Payment ID'),
  textCol('purposeCode', 'Purpose Code'),
  statusCol('supportingFileStatus', 'Supporting File Status'),
  statusCol('form145Status', 'Form 145 Status'),
  elementCol('form146', 'Form 146 Status', (row) => <StatusTag status={row.form146Status} />),
  elementCol('upload', 'Upload', (row) => (
    <CellAction
      icon={<CloudUpload size={16} />}
      label={`Upload forms for ${row.paymentId}`}
      onClick={() => announce('Upload', `Pick the signed forms for ${row.paymentId}.`)}
    />
  )),
  elementCol('download', 'Download', (row) => (
    <div className="flex items-center gap-3">
      <CellAction
        icon={DOWNLOAD}
        text="145"
        label={`Download form 145 for ${row.paymentId}`}
        onClick={() => announce('Downloading form 145', row.form145FileId)}
      />
      {/* No 146 exists yet for any row, so its download is drawn and refused. */}
      <CellAction
        icon={DOWNLOAD}
        text="146"
        label={`Download form 146 for ${row.paymentId}`}
        disabled={row.form146Status === null}
      />
    </div>
  )),
  textCol('form145FileId', 'Form 145 File ID', '320px'),
  textCol('form146FileId', 'Form 146 File ID'),
  dateCol('stagedAt', 'Staged At'),
  dateCol('createdAt', 'Created At'),
]

function FormTab({ range }: { range: DateRange }) {
  const { selected, onRowSelectionChange } = useSelection()
  const rows = FORM_ROWS.filter((row) => inRange(row.createdAt, range))
  const { pageRows, pagination } = usePaged(rows)
  const stage = (form: string) => () =>
    announce(`Form ${form} staging started`, `${plural(selected.length, 'payment')} queued.`)

  return (
    <PacbTable<FormRow>
      title="Form 145/146 Records"
      data={pageRows}
      {...pagination}
      columns={FORM_COLUMNS}
      idField="paymentId"
      enableRowSelection
      onRowSelectionChange={onRowSelectionChange}
      headerSlot1={
        <div className="flex items-center gap-2">
          <ButtonV2
            buttonType={ButtonV2Type.PRIMARY}
            size={ButtonV2Size.MEDIUM}
            text="Stage 145 Files"
            disabled={selected.length === 0}
            onClick={stage('145')}
          />
          <ButtonV2
            buttonType={ButtonV2Type.PRIMARY}
            size={ButtonV2Size.MEDIUM}
            text="Stage 146 Files"
            disabled={selected.length === 0}
            onClick={stage('146')}
          />
        </div>
      }
    />
  )
}

// ─── MPR ─────────────────────────────────────────────────────────────────────────────────

const MPR_COLUMNS: ColumnDefinition<MprRow>[] = [
  textCol('entityId', 'Entity ID'),
  textCol('lineOfBusiness', 'Line of Business'),
  textCol('purposeCode', 'Purpose Code'),
  copyCol('adUtrNo', 'AD UTR No'),
  copyCol('merchantUtrNo', 'Merchant UTR No'),
  statusCol('mprStatus', 'MPR Status'),
  amountCol('settlementAmount', 'Settlement Amount'),
  copyCol('paymentId', 'Payment ID'),
  idCol('settlementId', 'Settlement ID', { copyable: true }),
  dateCol('createdAt', 'Created At'),
  // Refused until the MPR is generated — there is no report to download while it is PENDING.
  elementCol('download', 'Download MPR', (row) => (
    <CellAction
      icon={DOWNLOAD}
      label={`Download MPR for ${row.paymentId}`}
      disabled={row.mprStatus !== 'GENERATED'}
    />
  )),
]

function MprTab({ range }: { range: DateRange }) {
  const rows = MPR_ROWS.filter((row) => inRange(row.createdAt, range))
  const { pageRows, pagination } = usePaged(rows)
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Merchant Payment Report (MPR)</SectionTitle>
      <PacbTable<MprRow>
        data={pageRows}
        columns={MPR_COLUMNS}
        idField="paymentId"
        {...pagination}
      />
    </div>
  )
}

// ─── Transaction Report ──────────────────────────────────────────────────────────────────

const REPORT_INFO_COLUMNS: ColumnDefinition<TransactionReportRow>[] = [
  dateCol('settlementDate', 'Settlement Date'),
  idCol('fileUuid', 'File Uuid', { copyable: true }),
  copyCol('paymentId', 'Payment ID'),
  textCol('entityId', 'Entity ID'),
  copyCol('utr', 'UTR'),
  amountCol('settlementAmount', 'Settlement Amount'),
  textCol('originalCurrency', 'Original Currency'),
  textCol('exchangeRate', 'Exchange Rate'),
  amountCol('originalAmount', 'Original Amount'),
  textCol('transactionType', 'Transaction Type'),
  statusCol('updationStatus', 'Updation Status'),
  dateCol('createdAt', 'Created At'),
  dateCol('processedAt', 'Processed At'),
]

const REPORT_FILE_COLUMNS: ColumnDefinition<ReportFileRow>[] = [
  textCol('fileName', 'File Name'),
  idCol('fileUuid', 'File Uuid', { copyable: true }),
  statusCol('fileStatus', 'File Status'),
  dateCol('createdAt', 'Created At'),
  dateCol('processedAt', 'Processed At'),
  elementCol('download', 'Download File', (row) => (
    <CellAction
      icon={DOWNLOAD}
      label={`Download ${row.fileName}`}
      onClick={() => announce('Downloading report file', row.fileName)}
    />
  )),
]

function TransactionReportTab({ range }: { range: DateRange }) {
  const reportRows = TRANSACTION_REPORT_ROWS.filter((row) => inRange(row.createdAt, range))
  const fileRows = REPORT_FILE_ROWS.filter((row) => inRange(row.createdAt, range))
  const info = usePaged(reportRows)
  const files = usePaged(fileRows)
  const count = (status: TransactionReportRow['updationStatus']) =>
    String(reportRows.filter((row) => row.updationStatus === status).length)

  return (
    <div className="flex flex-col gap-6">
      <StatRow
        stats={[
          {
            title: 'Pending',
            value: String(reportRows.length || fileRows.length ? TRANSACTION_REPORT_PENDING : 0),
            tone: 'warning',
            icon: <Hourglass size={STAT_ICON} />,
          },
          { title: 'Matched', value: count('SUCCESS'), tone: 'success', icon: <LayoutGrid size={STAT_ICON} /> },
          { title: 'Mismatched', value: count('FAILED'), tone: 'error', icon: <LayoutGrid size={STAT_ICON} /> },
        ]}
      />
      <PacbTable<TransactionReportRow>
        title="Report Info"
        data={info.pageRows}
        {...info.pagination}
        columns={REPORT_INFO_COLUMNS}
        idField="paymentId"
      />
      <PacbTable<ReportFileRow>
        title="Report Files"
        data={files.pageRows}
        {...files.pagination}
        columns={REPORT_FILE_COLUMNS}
        idField="fileUuid"
      />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────────────────

function PacbWorkflowSandbox() {
  const [params, setParams] = useSearchParams()
  const tab = tabFromSlug(params.get('tab'))
  const [range, setRange] = useState<DateRange>(() => rangeOf('2026-09-22', '2026-09-23'))

  const panel = useMemo(() => {
    switch (tab) {
      case 'Payment File':
        return (
          <FileTab
            noun="Payment File"
            generate={PAYMENT_FILE_GENERATE}
            stage={PAYMENT_FILE_STAGE}
            stageColumns={PAYMENT_STAGE_COLUMNS}
            range={range}
          />
        )
      case 'Supporting File':
        return (
          <FileTab
            noun="Supporting File"
            generate={SUPPORTING_FILE_GENERATE}
            stage={SUPPORTING_FILE_STAGE}
            stageColumns={SUPPORTING_STAGE_COLUMNS}
            range={range}
          />
        )
      case 'Form 145/146':
        return <FormTab range={range} />
      case 'Transaction Report':
        return <TransactionReportTab range={range} />
      case 'MPR':
        return <MprTab range={range} />
    }
  }, [tab, range])

  return (
    <PacbPage
      title="PACB Workflow (Sandbox)"
      actions={
        <>
          {/* Drawn as the design has it; what it filters on is not specified yet. */}
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.MEDIUM}
            text="Filters"
            leftSlot={{ slot: <Filter size={16} />, maxHeight: 16 }}
          />
          <RangePicker value={range} onChange={setRange} />
        </>
      }
    >
      <ThemeProvider componentTokens={sectionTabsTokens}>
        <TabsV2
          variant={TabsV2Variant.UNDERLINE}
          size={TabsV2Size.MD}
          value={slug(tab)}
          onValueChange={(value) => setParams({ tab: value }, { replace: true })}
        >
          <TabsV2List>
            {TABS.map((label) => (
              <TabsV2Trigger key={label} value={slug(label)}>
                {label}
              </TabsV2Trigger>
            ))}
          </TabsV2List>
        </TabsV2>
      </ThemeProvider>

      {/* Keyed on the tab so each panel mounts fresh — its selection does not survive a
          switch to a tab where those rows mean something else. */}
      <div key={tab}>{panel}</div>
    </PacbPage>
  )
}

export default PacbWorkflowSandbox
