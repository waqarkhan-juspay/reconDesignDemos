import {
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
} from '@juspay/blend-design-system'
import { useMemo } from 'react'
import { PrimitiveText, font } from '../../primitives'
import { BUCKET_TITLE, type Bucket, type ReconOutcome } from './match'
import RowsTable from './RowsTable'
import { count, formatCount, type Row, type Table } from './table'

const { colors } = FOUNDATION_THEME

const PAGE_SIZE = 10

/**
 * The rows behind one result card. A row with no partner is shown whole, as its own file
 * has it — that is what you go and look for. A mismatch is shown as the pair: the key, the
 * two amounts and the gap, since the rest of the row agreed.
 */
function rowsFor(bucket: Bucket, outcome: ReconOutcome, source: Table, target: Table) {
  if (bucket === 'missingInTarget') return { columns: source.columns, rows: outcome.missingInTarget }
  if (bucket === 'missingInSource') return { columns: target.columns, rows: outcome.missingInSource }

  const sourceAmount = `Source · ${outcome.sourceAmount}`
  const targetAmount = `Target · ${outcome.targetAmount}`
  return {
    columns: [outcome.sourceKey, sourceAmount, targetAmount, 'Difference'],
    rows: outcome.amountMismatch.map<Row>(({ key, source: mine, target: theirs, difference }) => ({
      [outcome.sourceKey]: key,
      [sourceAmount]: mine,
      [targetAmount]: theirs,
      Difference: `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${formatCount(Math.abs(difference))}`,
    })),
  }
}

type ResultRowsProps = {
  bucket: Bucket
  outcome: ReconOutcome
  source: Table
  target: Table
}

/** Opened from a result card, under the cards: what that number is made of. */
function ResultRows({ bucket, outcome, source, target }: ResultRowsProps) {
  const { columns, rows } = useMemo(
    () => rowsFor(bucket, outcome, source, target),
    [bucket, outcome, source, target],
  )
  return (
    <section aria-label={BUCKET_TITLE[bucket]} className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <PrimitiveText
          as="h2"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {BUCKET_TITLE[bucket]}
        </PrimitiveText>
        <TagV2
          text={count(rows.length, 'row')}
          size={TagV2Size.SM}
          type={TagV2Type.SUBTLE}
          color={TagV2Color.NEUTRAL}
        />
      </header>
      <RowsTable columns={columns} rows={rows} pageSize={PAGE_SIZE} />
    </section>
  )
}

export default ResultRows
