/**
 * PACB Recon → Escrow to OCA Fund Movement. Read-only: what moved from escrow to the OCA
 * account in the range, and what is still waiting.
 */

import type { DateRange } from '@juspay/blend-design-system'
import { Clock, Hourglass, Layers, Zap } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { PAGE_EASING, PAGE_MS } from '../../motion'
import { ESCROW_AS_OF, ESCROW_ROWS, type EscrowRow } from './data'
import { DAY_MS, formatRange } from './dates'
import { PacbPage, PacbTable, RangePicker, StatTile } from './kit'
import { DEFAULT_STAT_CARD } from './recon-summary-layout'
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

/** Pending for more than a day, as of the demo's clock (ESCROW_AS_OF in data.ts). */
const isOverdue = (row: EscrowRow) =>
  row.settlementStatus !== 'SUCCESS' &&
  Date.parse(ESCROW_AS_OF) - Date.parse(row.settledAt) > DAY_MS

const isPending = (row: EscrowRow) => row.settlementStatus !== 'SUCCESS'

/**
 * What a card narrows the table to, one key per card. Pending Amount and Pending Settlements
 * filter to the same rows, but each is its own toggle — only the card clicked lights up.
 */
type CardFilter = 'PENDING_AMOUNT' | 'PENDING_COUNT' | 'SETTLED' | 'OVERDUE'

const FILTERS: Record<CardFilter, (row: EscrowRow) => boolean> = {
  PENDING_AMOUNT: isPending,
  PENDING_COUNT: isPending,
  SETTLED: (row) => row.settlementStatus === 'SUCCESS',
  OVERDUE: isOverdue,
}

const sum = (rows: EscrowRow[]) =>
  Math.round(rows.reduce((total, row) => total + row.settlementAmount, 0) * 100) / 100

function EscrowToOca() {
  const [range, setRange] = useState<DateRange>(() => rangeOf('2026-09-22', '2026-09-29'))
  // Which card the table is narrowed to; clicking the same card again clears it.
  const [filter, setFilter] = useState<CardFilter | null>(null)
  const visible = useMemo(() => ESCROW_ROWS.filter((row) => inRange(row.settledAt, range)), [range])
  const shown = useMemo(
    () => (filter ? visible.filter(FILTERS[filter]) : visible),
    [visible, filter],
  )
  const { pageRows, pagination } = usePaged(shown)

  const settled = visible.filter(FILTERS.SETTLED)
  const pending = visible.filter(isPending)
  const overdue = visible.filter(FILTERS.OVERDUE)

  // The figures always count the whole range — a card says what is there to filter to, not
  // what the table currently shows.
  //
  // Every click also flickers the table once, so it reads as refreshed — even when the rows do
  // not change, as going from Pending Amount to Pending Settlements does not. The Web
  // Animations API restarts it on every click without remounting the table (which would drop
  // its own header state); reduced motion skips it.
  const tableRef = useRef<HTMLDivElement>(null)
  const refreshTable = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    tableRef.current?.animate([{ opacity: 0.2 }, { opacity: 1 }], {
      duration: PAGE_MS,
      easing: PAGE_EASING,
    })
  }
  const card = (key: CardFilter) => ({
    pressed: filter === key,
    onClick: () => {
      setFilter((current) => (current === key ? null : key))
      refreshTable()
    },
  })

  // The Payment Info Generator's layout 8: the range at the title's right, then the figures
  // and the table it scopes as one section with no border or padding of its own, so both
  // line up with the title. Read-only, so the range is the only control.
  return (
    <PacbPage
      title="Escrow to OCA Fund Movement"
      actions={<RangePicker value={range} onChange={setRange} />}
    >
      <section
        aria-label={`Escrow to OCA fund movement for ${formatRange(range.startDate, range.endDate)}`}
        className="flex flex-col"
        style={{ gap: PANEL_SPACING.cardsToTable }}
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          style={{ gap: PANEL_SPACING.cardGap }}
        >
          <StatTile
            title="Pending Amount"
            icon={<Hourglass size={STAT_ICON} />}
            value={`₹${amount(sum(pending))}`}
            {...DEFAULT_STAT_CARD}
            {...card('PENDING_AMOUNT')}
          />
          <StatTile
            title="Pending Settlements"
            icon={<Layers size={STAT_ICON} />}
            value={String(pending.length)}
            {...DEFAULT_STAT_CARD}
            {...card('PENDING_COUNT')}
          />
          <StatTile
            title="Settled Amount"
            icon={<Zap size={STAT_ICON} />}
            value={`₹${amount(sum(settled))}`}
            {...DEFAULT_STAT_CARD}
            {...card('SETTLED')}
          />
          <StatTile
            title="Pending Settlements > 1 Day"
            icon={<Clock size={STAT_ICON} />}
            value={String(overdue.length)}
            {...DEFAULT_STAT_CARD}
            {...card('OVERDUE')}
          />
        </div>
        <div ref={tableRef} style={{ margin: TABLE_OUTSET }} className={FIT_COLUMNS}>
          <PacbTable<EscrowRow>
            data={pageRows}
            columns={COLUMNS}
            idField="settlementId"
            {...pagination}
          />
        </div>
      </section>
    </PacbPage>
  )
}

export default EscrowToOca
