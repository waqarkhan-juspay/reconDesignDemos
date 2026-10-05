/**
 * PACB Recon → Escrow to OCA Fund Movement. Read-only: what moved from escrow to the OCA
 * account in the range, and what is still waiting.
 */

import type { DateRange } from '@juspay/blend-design-system'
import { Hourglass, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ESCROW_ROWS, type EscrowRow } from './data'
import {
  PacbPage,
  PacbTable,
  RangePicker,
  StatRow,
} from './kit'
import {
  STAT_ICON,
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
} from './helpers'

const COLUMNS = [
  // Middle-truncated like Recon ID — the IDs differ at their ends, and 36 characters whole
  // took a fifth of the table. The tooltip and the copy glyph both carry the full value.
  idCol<EscrowRow>('settlementId', 'Settlement ID', { copyable: true }),
  textCol<EscrowRow>('entityId', 'Entity ID'),
  amountCol<EscrowRow>('settlementAmount', 'Settlement Amount'),
  statusCol<EscrowRow>('settlementStatus', 'Settlement Status'),
  copyCol<EscrowRow>('utrNo', 'UTR No'),
  textCol<EscrowRow>('createdBy', 'Created By'),
  textCol<EscrowRow>('approvedBy', 'Approved By'),
  dateCol<EscrowRow>('settledAt', 'Settled At'),
]

const sum = (rows: EscrowRow[]) =>
  Math.round(rows.reduce((total, row) => total + row.settlementAmount, 0) * 100) / 100

function EscrowToOca() {
  const [range, setRange] = useState<DateRange>(() => rangeOf('2026-09-22', '2026-09-29'))
  const visible = useMemo(() => ESCROW_ROWS.filter((row) => inRange(row.settledAt, range)), [range])
  const { pageRows, pagination } = usePaged(visible)

  const settled = visible.filter((row) => row.settlementStatus === 'SUCCESS')
  const pending = visible.filter((row) => row.settlementStatus !== 'SUCCESS')

  return (
    <PacbPage
      title="Escrow to OCA Fund Movement"
      actions={<RangePicker value={range} onChange={setRange} />}
    >
      <StatRow
        stats={[
          {
            title: 'Pending',
            value: amount(sum(pending)),
            tone: 'warning',
            icon: <Hourglass size={STAT_ICON} />,
          },
          {
            title: 'Settled',
            value: amount(sum(settled)),
            tone: 'success',
            icon: <Zap size={STAT_ICON} />,
          },
        ]}
      />

      <PacbTable<EscrowRow>
        data={pageRows}
        columns={COLUMNS}
        idField="settlementId"
        {...pagination}
      />
    </PacbPage>
  )
}

export default EscrowToOca
