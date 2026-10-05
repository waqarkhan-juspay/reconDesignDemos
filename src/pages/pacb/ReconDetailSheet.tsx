/**
 * Payment Info Generator Details — the side sheet a Payment Info Generator row opens, in the
 * module's one sheet frame (DetailSheet.tsx).
 *
 * Every field on the row is shown, as a single-column label/value table split into four
 * groups — what the recon is, who it is for, what the money is made of, and the references
 * it will be paid against. The table is the Configurator's own ConfigSummaryCard, so the
 * app's detail sheets read the same way.
 */

import { ConfigSummaryCard, ConfigSummaryChipRow } from '../../config-summary'
import type { ReconRow } from './data'
import { DetailSheet, SheetMoney, SheetRow } from './DetailSheet'
import { amount, formatIst } from './helpers'
import { StatusTag } from './kit'

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
}: {
  row: ReconRow | null
  onClose: () => void
}) {
  return (
    <DetailSheet open={row !== null} onClose={onClose} title="Payment Info Generator Details">
      {row && <Details row={row} />}
    </DetailSheet>
  )
}
