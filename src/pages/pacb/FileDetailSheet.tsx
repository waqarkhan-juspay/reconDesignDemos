/**
 * The side sheet a row of the Workflow's Payment File / Supporting File table opens — in the
 * module's one sheet frame (DetailSheet.tsx), the way a Payment Info Generator row opens its
 * own.
 *
 * Every field the row carries, including the ones the table leaves out (Settlement ID, AD UTR
 * No, Purpose Code, Merchant Business Type): the table is for scanning many payments, the
 * sheet for everything about one. Three groups, in the order a payment travels — the payment,
 * whose it is, then the file that carries it.
 */

import { ConfigSummaryCard, ConfigSummaryChipRow } from '../../config-summary'
import type { FileRow } from './data'
import { DetailSheet, SheetMoney, SheetRow } from './DetailSheet'
import { FILE_STATUS_COLORS, formatIst } from './helpers'
import { StatusTag } from './kit'

function Details({ row }: { row: FileRow }) {
  return (
    <div className="flex flex-col gap-4">
      <ConfigSummaryCard title="Payment" keyColumn="168px">
        <SheetRow label="Payment ID" value={row.paymentId} />
        <ConfigSummaryChipRow label="Payment Status">
          <StatusTag status={row.paymentStatus} />
        </ConfigSummaryChipRow>
        <SheetMoney label="Payment Amount" value={row.settlementAmount} />
        <SheetRow label="Settlement ID" value={row.settlementId} />
        <SheetRow label="Settled At" value={formatIst(row.settledAt)} />
        <SheetRow label="AD UTR No" value={row.adUtrNo} />
        <SheetRow label="Merchant UTR No" value={row.merchantUtrNo} />
      </ConfigSummaryCard>

      <ConfigSummaryCard title="Merchant" keyColumn="168px">
        <SheetRow label="Entity ID" value={row.entityId} />
        <SheetRow label="Line of Business" value={row.lineOfBusiness} />
        <SheetRow label="Purpose Code" value={row.purposeCode} />
        <SheetRow label="Merchant Business Type" value={row.merchantBusinessType} />
      </ConfigSummaryCard>

      <ConfigSummaryCard title="File" keyColumn="168px">
        <ConfigSummaryChipRow label="File Status">
          <StatusTag status={row.fileStatus} colors={FILE_STATUS_COLORS} />
        </ConfigSummaryChipRow>
        <SheetRow label="File Name" value={row.fileName} />
        <SheetRow label="File Uuid" value={row.fileUuid} />
        <SheetRow label="Payment Info Created On" value={formatIst(row.createdAt)} />
        <SheetRow label="File Created At" value={formatIst(row.paymentFileCreatedAt)} />
        <SheetRow label="File Staged At" value={formatIst(row.stagedAt)} />
      </ConfigSummaryCard>
    </div>
  )
}

export function FileDetailSheet({
  noun,
  row,
  onClose,
}: {
  /** "Payment File" or "Supporting File" — the sheet is titled for the tab it opened from. */
  noun: string
  row: FileRow | null
  onClose: () => void
}) {
  return (
    <DetailSheet open={row !== null} onClose={onClose} title={`${noun} Details`}>
      {row && <Details row={row} />}
    </DetailSheet>
  )
}
