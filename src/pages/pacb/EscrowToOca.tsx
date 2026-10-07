/**
 * PACB Recon → Escrow to OCA Fund Movement. Read-only: what moved from escrow to the OCA
 * account in the range, and what is still waiting.
 */

import type { DateRange } from '@juspay/blend-design-system'
import { Hourglass, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ESCROW_ROWS, type EscrowRow } from './data'
import { formatRange } from './dates'
import {
  PacbPage,
  PacbTable,
  RangePanel,
  RangePicker,
  StatTile,
} from './kit'
import {
  FIT_COLUMNS,
  PANEL_SPACING,
  STAT_ICON,
  TABLE_OUTSET,
  amount,
  amountCol,
  copyCol,
  dateCol,
  hugColumns,
  idCol,
  inRange,
  rangeOf,
  statusCol,
  textCol,
  usePaged,
} from './helpers'

// Sized to their content — the table's wrapper carries FIT_COLUMNS (helpers.tsx).
const COLUMNS = hugColumns([
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
])

const sum = (rows: EscrowRow[]) =>
  Math.round(rows.reduce((total, row) => total + row.settlementAmount, 0) * 100) / 100

function EscrowToOca() {
  const [range, setRange] = useState<DateRange>(() => rangeOf('2026-09-22', '2026-09-29'))
  const visible = useMemo(() => ESCROW_ROWS.filter((row) => inRange(row.settledAt, range)), [range])
  const { pageRows, pagination } = usePaged(visible)

  const settled = visible.filter((row) => row.settlementStatus === 'SUCCESS')
  const pending = visible.filter((row) => row.settlementStatus !== 'SUCCESS')

  // The Payment Info Generator's layout: the range on its own row under the title, then one
  // panel holding the figures and the table it scopes. Read-only, so the row has no action.
  return (
    <PacbPage title="Escrow to OCA Fund Movement">
      <RangePanel
        label={`Escrow to OCA fund movement for ${formatRange(range.startDate, range.endDate)}`}
        toolbar={<RangePicker value={range} onChange={setRange} />}
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2"
          style={{ gap: PANEL_SPACING.cardGap }}
        >
          <StatTile
            title="Pending"
            icon={<Hourglass size={STAT_ICON} />}
            value={`₹${amount(sum(pending))}`}
            tone="gray"
            minimal
          />
          <StatTile
            title="Settled"
            icon={<Zap size={STAT_ICON} />}
            value={`₹${amount(sum(settled))}`}
            tone="gray"
            minimal
          />
        </div>
        <div style={{ margin: TABLE_OUTSET }} className={FIT_COLUMNS}>
          <PacbTable<EscrowRow>
            data={pageRows}
            columns={COLUMNS}
            idField="settlementId"
            {...pagination}
          />
        </div>
      </RangePanel>
    </PacbPage>
  )
}

export default EscrowToOca
