import {
  ColumnType,
  FOUNDATION_THEME,
  TagV2Color,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { ArrowRight } from 'lucide-react'
import { PrimitiveText } from '../../primitives'
import { StateTag } from './cells'
import { MATCH_LABEL, type BankRow, type ComparisonRow, type MatchState } from './bank'
import { formatCurrency, formatDate } from './ledger'
import { CELL_META, CELL_TEXT, HUG } from './table'

const { colors } = FOUNDATION_THEME

/**
 * The columns for the two new ledgers. V2's own columns are left exactly where they are —
 * this file only adds what the Bank and the comparison need, and leans on the same CELL_TEXT
 * / CELL_META / HUG the reconciled table uses so all three read as one page.
 */

/** Rows as DataTable types its data. */
type Row = Record<string, unknown>
const bankRow = (row: Row) => row as unknown as BankRow
const comparisonRow = (row: Row) => row as unknown as ComparisonRow

const base = (field: string, header: string) =>
  ({ field, header, ...HUG, isSortable: false as const, type: ColumnType.REACT_ELEMENT }) as const

/** A figure this row does not have. A dash, never a zero — zero is a number someone posted. */
function Dash({ reason }: { reason: string }) {
  return (
    <>
      <span aria-hidden>
        <PrimitiveText {...CELL_TEXT} color={colors.gray[400]}>
          —
        </PrimitiveText>
      </span>
      <span className="sr-only">{reason}</span>
    </>
  )
}

function Money({
  amount,
  emphasis = false,
}: {
  amount: number
  emphasis?: boolean
}) {
  const isCredit = amount >= 0
  return (
    <PrimitiveText
      {...CELL_TEXT}
      color={emphasis ? colors.gray[700] : isCredit ? colors.green[600] : colors.gray[900]}
      fontWeight={FOUNDATION_THEME.font.weight[600]}
    >
      {`${isCredit ? '+' : '-'}${formatCurrency(Math.abs(amount))}`}
    </PrimitiveText>
  )
}

/**
 * Plain text, not the tag the merchant used to be inside the date cell: a tag earns its
 * border by being an exception among plain rows, and a column where every row has one is
 * just a column of borders.
 */
function MerchantCell({ merchantId }: { merchantId: string }) {
  return (
    <div className="whitespace-nowrap">
      <PrimitiveText {...CELL_TEXT} color={colors.gray[700]}>
        {merchantId}
      </PrimitiveText>
    </div>
  )
}

const RIGHT = 'flex justify-end whitespace-nowrap'
const NUMERIC = { fontVariantNumeric: 'tabular-nums' } as const

/**
 * Matched is quiet and everything else carries the colour — the Recon Status column's rule,
 * applied to the same question asked of two ledgers instead of one, in the same tag.
 */
function MatchCell({ match }: { match: MatchState }) {
  return (
    <div className="flex whitespace-nowrap">
      <StateTag
        text={MATCH_LABEL[match]}
        color={match === 'MATCHED' ? TagV2Color.NEUTRAL : TagV2Color.WARNING}
      />
    </div>
  )
}

/**
 * The Bank Ledger — the statement, in the bank's own words.
 *
 * No status column: a statement only ever records what has already happened, so every line
 * has cleared. No actions either — nothing on this page can change what the bank says.
 */
export const BANK_COLUMNS: ColumnDefinition<Row>[] = [
  {
    ...base('date', 'Bank Ref / Date'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = bankRow(raw)
      return (
        <div className="flex flex-col gap-1 py-3 whitespace-nowrap">
          <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
            {row.id}
          </PrimitiveText>
          <PrimitiveText {...CELL_META} color={colors.gray[500]}>
            {formatDate(row.date)}
          </PrimitiveText>
        </div>
      )
    },
  },
  {
    ...base('merchantId', 'Merchant'),
    renderCell: (_value: unknown, raw: Row) => (
      <MerchantCell merchantId={bankRow(raw).merchantId} />
    ),
  },
  {
    ...base('narration', 'Narration'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = bankRow(raw)
      return (
        <div className="flex max-w-[420px] flex-col gap-1 py-3">
          <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
            {row.narration}
          </PrimitiveText>
          {/* Where our entry is, when there is one. The bank's wording is rarely ours, so
              the reference is the only reliable way across. */}
          <div className="flex min-h-5 items-center gap-1.5">
            {row.matchedEntryId ? (
              <>
                <ArrowRight size={12} color={colors.gray[400]} aria-hidden />
                <PrimitiveText
                  {...CELL_META}
                  color={row.match === 'MATCHED' ? colors.gray[500] : colors.orange[700]}
                >
                  {row.match === 'MATCHED'
                    ? row.matchedEntryId
                    : `${row.matchedEntryId} — posted for a different figure`}
                </PrimitiveText>
              </>
            ) : (
              <PrimitiveText {...CELL_META} color={colors.orange[700]}>
                Not in the ledger
              </PrimitiveText>
            )}
          </div>
        </div>
      )
    },
  },
  {
    ...base('amount', 'Amount'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = bankRow(raw)
      return (
        <div className={RIGHT} style={NUMERIC}>
          <Money amount={row.type === 'CREDIT' ? row.amount : -row.amount} />
        </div>
      )
    },
  },
  {
    ...base('runningBalance', 'Bank Balance'),
    renderCell: (_value: unknown, raw: Row) => (
      <div className={RIGHT} style={NUMERIC}>
        <PrimitiveText
          {...CELL_TEXT}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {formatCurrency(bankRow(raw).runningBalance)}
        </PrimitiveText>
      </div>
    ),
  },
  {
    ...base('match', 'Match'),
    renderCell: (_value: unknown, raw: Row) => <MatchCell match={bankRow(raw).match} />,
  },
]

/**
 * Bank v/s Reconciled — one row per pair, plus a row for whatever only one side has.
 *
 * Two amount columns and a delta, which is what this view costs and why it is not simply the
 * other two overlaid: the question here is not what a line is, but whether the two records of
 * it agree.
 */
export const COMPARISON_COLUMNS: ColumnDefinition<Row>[] = [
  {
    ...base('date', 'Refs / Date'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = comparisonRow(raw)
      return (
        <div className="flex flex-col gap-1 py-3 whitespace-nowrap">
          <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
            {[row.bankRef, row.ledgerRef].filter(Boolean).join('  ·  ')}
          </PrimitiveText>
          <PrimitiveText {...CELL_META} color={colors.gray[500]}>
            {formatDate(row.date)}
          </PrimitiveText>
        </div>
      )
    },
  },
  {
    ...base('merchantId', 'Merchant'),
    renderCell: (_value: unknown, raw: Row) => (
      <MerchantCell merchantId={comparisonRow(raw).merchantId} />
    ),
  },
  {
    ...base('particulars', 'Particulars'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = comparisonRow(raw)
      return (
        <div className="flex max-w-[420px] flex-col gap-1 py-3">
          <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
            {row.particulars}
          </PrimitiveText>
          <div className="flex min-h-5 items-center">
            <PrimitiveText {...CELL_META} color={colors.gray[500]}>
              {row.bankRef === null
                ? 'Our wording — the bank has no record'
                : row.ledgerRef === null
                  ? 'The bank’s wording — nothing posted'
                  : 'Matched by reference'}
            </PrimitiveText>
          </div>
        </div>
      )
    },
  },
  {
    ...base('bankAmount', 'Bank Amount'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = comparisonRow(raw)
      return (
        <div className={RIGHT} style={NUMERIC}>
          {row.bankAmount === null ? (
            <Dash reason="Not on the statement" />
          ) : (
            <Money amount={row.bankAmount} />
          )}
        </div>
      )
    },
  },
  {
    ...base('ledgerAmount', 'Ledger Amount'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = comparisonRow(raw)
      return (
        <div className={RIGHT} style={NUMERIC}>
          {row.ledgerAmount === null ? (
            <Dash reason="Nothing posted" />
          ) : (
            <Money amount={row.ledgerAmount} />
          )}
        </div>
      )
    },
  },
  {
    ...base('delta', 'Delta'),
    renderCell: (_value: unknown, raw: Row) => {
      const row = comparisonRow(raw)
      return (
        <div className={RIGHT} style={NUMERIC}>
          {row.delta === 0 ? (
            <Dash reason="No difference" />
          ) : (
            <PrimitiveText
              {...CELL_TEXT}
              color={colors.orange[700]}
              fontWeight={FOUNDATION_THEME.font.weight[600]}
            >
              {`${row.delta > 0 ? '+' : '-'}${formatCurrency(Math.abs(row.delta))}`}
            </PrimitiveText>
          )}
        </div>
      )
    },
  },
  {
    ...base('match', 'Match'),
    renderCell: (_value: unknown, raw: Row) => <MatchCell match={comparisonRow(raw).match} />,
  },
]
