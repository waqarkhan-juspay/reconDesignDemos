/**
 * Payment Info Generator Details — the side sheet a Payment Info Generator row opens, in the
 * module's one sheet frame (DetailSheet.tsx).
 *
 * Every field on the row is shown, as a single-column label/value table split into four
 * groups — what the recon is, who it is for, what the money is made of, and the references
 * it will be paid against. The table is the Configurator's own ConfigSummaryCard, so the
 * app's detail sheets read the same way.
 *
 * The footer's View transactions swaps the sheet to the row's transactions: the sheet
 * widens to half the screen, since a table needs the room. There the title names the recon
 * (copyable on hover), borderless figures over the table total its money and count its
 * transactions, Download under the table saves the whole table as a CSV, and the footer's
 * Go Back returns to the details. Beside View transactions, the selection bar's two
 * moves for the one row open: Mark as ready on a HOLD row, Revert to Hold on a READY one.
 */

import { ButtonV2, ButtonV2Size, ButtonV2Type } from '@juspay/blend-design-system'
import downloadIcon from '../../assets/icons/download-01.svg'
import MaskIcon from '../../components/MaskIcon'
import { useMemo, useState } from 'react'
import { ConfigSummaryCard, ConfigSummaryChipRow } from '../../config-summary'
import { r3, type PiStatus, type ReconRow } from './data'
import { DetailSheet, SheetMoney, SheetRow } from './DetailSheet'
import {
  amount,
  amountCol,
  copyCol,
  dateCol,
  downloadBlob,
  FIT_COLUMNS,
  formatIst,
  hugColumns,
  idCol,
  money,
  statusCol,
  textCol,
  toCsv,
  usePaged,
} from './helpers'
import { PacbTable, StatTile, StatusTag } from './kit'
import { transactionsOf, type ReconTransaction } from './transactions'

const TRANSACTION_COLUMNS = hugColumns<ReconTransaction>([
  idCol<ReconTransaction>('txnId', 'Transaction ID', { copyable: true }),
  copyCol<ReconTransaction>('orderId', 'Order ID'),
  statusCol<ReconTransaction>('txnType', 'Type'),
  amountCol<ReconTransaction>('amount', 'Amount'),
  amountCol<ReconTransaction>('fee', 'Fee'),
  amountCol<ReconTransaction>('tax', 'Tax'),
  textCol<ReconTransaction>('paymentMethod', 'Payment Method'),
  statusCol<ReconTransaction>('status', 'Status'),
  dateCol<ReconTransaction>('createdAt', 'Created At'),
])

/** Every one of the row's transactions — not just the page in view — as a CSV. */
function downloadTransactions(row: ReconRow) {
  // The table's own columns, so the file and the table cannot disagree.
  const csv = toCsv(
    transactionsOf(row),
    TRANSACTION_COLUMNS.map(({ header, field }) => [
      header,
      (t: ReconTransaction) => t[field as keyof ReconTransaction],
    ]),
  )
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `transactions_${row.reconId}.csv`)
}

/** What the transactions add up to — summed from the rows, so the figures match the table. */
function totalsOf(rows: ReconTransaction[]) {
  let net = 0
  let fee = 0
  let tax = 0
  for (const t of rows) {
    net += t.txnType === 'REFUND' ? -t.amount : t.amount
    fee += t.fee
    tax += t.tax
  }
  return { net: r3(net), fee: r3(fee), tax: r3(tax) }
}

/**
 * Every transaction the row settles, paged, under bare figures — the way the Payment Info
 * Generator's summary strip draws its totals — with Download for all of them under the
 * table. Money first, in the table's own column order (Amount, Fee, Tax), then the counts
 * that make it up.
 */
function Transactions({ row }: { row: ReconRow }) {
  const rows = transactionsOf(row)
  const { pageRows, pagination } = usePaged(rows)
  const totals = useMemo(() => totalsOf(rows), [rows])
  const figure = { bare: true, minimal: true, tone: 'gray' as const }
  return (
    <div className="flex flex-col gap-6">
      {/* Three columns at 24px gaps: StatCardV2 holds each figure at a 200px minimum. */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-5">
        <StatTile
          {...figure}
          title="Amount"
          value={`₹${money(totals.net)}`}
          helpIconText="Orders minus refunds."
        />
        <StatTile {...figure} title="Fee" value={`₹${money(totals.fee)}`} />
        <StatTile {...figure} title="Tax" value={`₹${money(totals.tax)}`} />
        <StatTile {...figure} title="Transactions" value={amount(rows.length)} />
        <StatTile {...figure} title="Orders" value={amount(row.orderCount)} />
        <StatTile {...figure} title="Refunds" value={amount(row.refundCount)} />
      </div>
      <div className="flex flex-col gap-4">
        <div className={FIT_COLUMNS}>
          <PacbTable<ReconTransaction>
            data={pageRows}
            columns={TRANSACTION_COLUMNS}
            idField="txnId"
            {...pagination}
          />
        </div>
        <div className="flex justify-end">
          <ButtonV2
            buttonType={ButtonV2Type.PRIMARY}
            size={ButtonV2Size.SMALL}
            text="Download"
            leftSlot={{ slot: <MaskIcon src={downloadIcon} size={14} />, maxHeight: 14 }}
            onClick={() => downloadTransactions(row)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * The four groups. Order within each follows how the row is read: identity before status,
 * the parts of the settlement before the net they add up to, the IDs before the UTRs they
 * are paid under.
 */
function Details({ row }: { row: ReconRow }) {
  return (
    <div className="flex flex-col gap-4">
      <ConfigSummaryCard title="Recon" keyColumn="168px">
        <SheetRow label="Recon ID" value={row.reconId} />
        <ConfigSummaryChipRow label="PI Generation Status">
          <StatusTag status={row.piStatus} />
        </ConfigSummaryChipRow>
        <SheetRow label="Created At" value={formatIst(row.createdAt)} />
        <SheetRow label="Updated At" value={formatIst(row.updatedAt)} />
      </ConfigSummaryCard>

      <ConfigSummaryCard title="Merchant" keyColumn="168px">
        <SheetRow label="Entity ID" value={row.entityId} />
        <SheetRow label="Line of Business" value={row.lineOfBusiness} />
        <SheetRow label="Payment Entity" value={row.paymentEntity} />
        <SheetRow label="Business Type" value={row.businessType} />
        <SheetRow label="Purpose Code" value={row.purposeCode} />
      </ConfigSummaryCard>

      {/* The components, then what they net to — settlement = order − refund − chargeback −
          dispute − fee − tax − surcharge − hold + release (data.ts). The settlement is last
          because it is the result, not one more part. */}
      <ConfigSummaryCard title="Settlement breakdown" keyColumn="168px">
        <SheetMoney label="Order Amount" value={row.orderAmount} />
        <SheetMoney label="Refund Amount" value={row.refundAmount} />
        <SheetMoney label="Chargeback Amount" value={row.chargebackAmount} />
        <SheetMoney label="Dispute Amount" value={row.disputeAmount} />
        <SheetMoney label="Fee Amount" value={row.feeAmount} />
        <SheetMoney label="Tax Amount" value={row.taxAmount} />
        <SheetMoney label="Surcharge Amount" value={row.surchargeAmount} />
        <SheetMoney label="Hold Amount" value={row.holdAmount} />
        <SheetMoney label="Release Amount" value={row.releaseAmount} />
        <SheetMoney label="Settlement Amount" value={row.settlementAmount} />
        <SheetRow label="Total Count" value={amount(row.orderCount + row.refundCount)} />
      </ConfigSummaryCard>

      <ConfigSummaryCard title="References" keyColumn="168px">
        <SheetRow label="Payment ID" value={row.paymentId} />
        <SheetRow label="Settlement ID" value={row.settlementId} />
        <SheetRow label="AD UTR No" value={row.adUtrNo} />
        <SheetRow label="Merchant UTR No" value={row.merchantUtrNo} />
      </ConfigSummaryCard>
    </div>
  )
}

export function ReconDetailSheet({
  row,
  onClose,
  onSetStatus,
}: {
  row: ReconRow | null
  onClose: () => void
  /** Mark as ready / Revert to Hold. A host whose rows are all GENERATED, which offer no move, can leave it out. */
  onSetStatus?: (rowId: string, to: PiStatus) => void
}) {
  // Which row's transactions are showing — by id, so another row opens on its details.
  const [transactionsFor, setTransactionsFor] = useState<string | null>(null)
  const showTransactions = row !== null && transactionsFor === row.rowId
  return (
    <DetailSheet
      open={row !== null}
      onClose={() => {
        setTransactionsFor(null)
        onClose()
      }}
      // Both views are named by the recon, copyable on hover; the details view by the ID alone.
      title={showTransactions ? `Transactions in ${row.reconId}` : (row?.reconId ?? '')}
      copy={row ? { value: row.reconId, label: 'Recon ID' } : undefined}
      width={showTransactions ? '50vw' : undefined}
      footer={
        row && (
          // A row of its own, full width: DrawerFooter right-aligns its children and takes no
          // prop to change that, so the buttons are laid out here — the way the Configurator's
          // sheet does it. View transactions on the left and the status move on the right,
          // or Go Back on its own.
          <div className="flex w-full items-center justify-between gap-3">
            {showTransactions ? (
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.MEDIUM}
                text="Go Back"
                onClick={() => setTransactionsFor(null)}
              />
            ) : (
              <>
                <ButtonV2
                  buttonType={ButtonV2Type.SECONDARY}
                  size={ButtonV2Size.MEDIUM}
                  text="View transactions"
                  onClick={() => setTransactionsFor(row.rowId)}
                />
                {/* HOLD moves on to READY and READY back to HOLD; a GENERATED row has neither. */}
                {row.piStatus === 'HOLD' && (
                  <ButtonV2
                    buttonType={ButtonV2Type.PRIMARY}
                    size={ButtonV2Size.MEDIUM}
                    text="Mark as ready"
                    onClick={() => onSetStatus?.(row.rowId, 'READY')}
                  />
                )}
                {row.piStatus === 'READY' && (
                  // Secondary: it is the undo of Mark as ready, not the way forward.
                  <ButtonV2
                    buttonType={ButtonV2Type.SECONDARY}
                    size={ButtonV2Size.MEDIUM}
                    text="Revert to Hold"
                    onClick={() => onSetStatus?.(row.rowId, 'HOLD')}
                  />
                )}
              </>
            )}
          </div>
        )
      }
    >
      {row && (showTransactions ? <Transactions row={row} /> : <Details row={row} />)}
    </DetailSheet>
  )
}
