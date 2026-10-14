import { DIRECTION_LABEL, STATUS_LABEL } from './data'
import { formatDate, type LedgerRow } from './ledger'

/** `ledger_export_2026-10-14` — the prototype's file name, dated today. */
const fileName = (extension: string) =>
  `ledger_export_${new Date().toISOString().split('T')[0]}.${extension}`

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // A tick later, so the download has taken the URL before it stops resolving.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Quotes a field only when it has to, doubling any quote inside it (RFC 4180). */
const csvField = (value: string | number | boolean) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * The rows the table is showing, as CSV, with the prototype's columns.
 *
 * A Blob rather than the prototype's `data:` URI: `encodeURI` leaves `#` alone, so the first
 * `#` in a particulars field — "Client Invoice #INV-001" — ended the file there.
 */
export function exportCsv(rows: LedgerRow[]) {
  const header = [
    'ID',
    'Merchant ID',
    'Date',
    'Particulars',
    'Type',
    'Entry Type',
    'Amount',
    'Closing Balance',
    'Status',
    'Reconciled',
    'Hold Amount',
    'Hold Reason',
  ]
  const lines = rows.map((row) =>
    [
      row.id,
      row.merchantId,
      row.date,
      row.particulars,
      row.type,
      row.entryType,
      row.amount,
      row.runningBalance,
      row.status,
      row.reconciled,
      row.holdAmount,
      row.holdReason,
    ]
      .map(csvField)
      .join(','),
  )
  saveBlob(
    new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }),
    fileName('csv'),
  )
}

const MONEY = '#,##0.00'

/**
 * The same rows as a real .xlsx — amounts as numbers in a money format, so they add up in
 * Excel instead of arriving as text.
 *
 * Loaded on first use: the writer is only needed by the one person who presses the button,
 * so it stays out of the bundle every other page pays for.
 */
export async function exportXlsx(rows: LedgerRow[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const header = [
    'Transaction ID',
    'Merchant ID',
    'Date',
    'Particulars',
    'Type',
    'Entry Type',
    'Amount ($)',
    'Closing Balance ($)',
    'Status',
    'Reconciled',
    'Hold Amount ($)',
    'Hold Reason',
  ].map((value) => ({ value, fontWeight: 'bold' as const }))

  const body = rows.map((row) => [
    row.id,
    row.merchantId,
    formatDate(row.date),
    row.particulars,
    DIRECTION_LABEL[row.type],
    row.entryType,
    { value: row.amount, format: MONEY },
    { value: row.runningBalance, format: MONEY },
    STATUS_LABEL[row.status],
    row.reconciled ? 'Yes' : 'No',
    { value: row.holdAmount, format: MONEY },
    row.holdReason,
  ])

  await writeXlsxFile([header, ...body], {
    sheet: 'Ledger_Data',
    columns: [16, 14, 14, 32, 10, 14, 14, 18, 14, 12, 16, 28].map((width) => ({ width })),
  }).toFile(fileName('xlsx'))
}
