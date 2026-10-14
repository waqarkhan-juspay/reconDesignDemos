import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  CheckboxV2,
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  InputSizeV2,
  SelectorV2Size,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  StatCardV2,
  StatCardV2Variant,
  TagV2Color,
  TextInputV2,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { ArrowLeftRight, BookCheck, Funnel, Landmark, Link, Lock, Search, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PrimitiveText } from '../../primitives'
import {
  EntryTag,
  HeaderActions,
  LedgerTitle,
  RowActions,
  StatusTag,
  TagWithNote,
} from './cells'
import { STATUS_LABEL, type EntryStatus } from './data'
import { ALL, formatCurrency, formatDate, matchesQuery, summariseLedger } from './ledger'
import {
  CELL_META,
  CELL_TEXT,
  HUG,
  SLOT_ICON_SIZE,
  STAT_ICON_SIZE,
  entryOf,
  merchantItemsFor,
  usePagedRows,
  type TableRow,
} from './table'
import { useLedgerOutlet } from './use-ledger'

const { colors } = FOUNDATION_THEME

const STATUS_FILTER_ITEMS = [
  {
    items: [
      { value: ALL, label: 'All Statuses' },
      ...(Object.keys(STATUS_LABEL) as EntryStatus[]).map((value) => ({
        value,
        label: STATUS_LABEL[value],
      })),
    ],
  },
]

const COLUMNS = [
  { field: 'date', header: 'Date / Ref ID' },
  { field: 'particulars', header: 'Particulars & Type' },
  { field: 'amount', header: 'Amount' },
  { field: 'runningBalance', header: 'Closing Balance' },
  { field: 'status', header: 'Status' },
  { field: 'reconciled', header: 'Recon' },
  { field: 'actions', header: 'Actions' },
] as const

/**
 * Version 1 — the "Advanced Ledger Module" prototype, rebuilt in Blend V2 as given: the four
 * balances in its order, the merchant and status filters in the table toolbar, a Recon
 * checkbox on every row.
 */
function LedgerV1() {
  const { entries, actions, spacing } = useLedgerOutlet()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [merchantFilter, setMerchantFilter] = useState(ALL)

  const merchantItems = useMemo(
    () => merchantItemsFor(Array.from(new Set(entries.map((entry) => entry.merchantId))).sort()),
    [entries],
  )

  const summary = useMemo(
    () => summariseLedger(entries, merchantFilter),
    [entries, merchantFilter],
  )

  /** What the table shows and what the exports write: the same rows, newest first. */
  const matchingRows = useMemo<TableRow[]>(() => {
    const needle = query.trim().toLowerCase()
    return summary.rows.filter(
      (row) =>
        (statusFilter === ALL || row.status === statusFilter) && matchesQuery(row, needle),
    )
  }, [summary.rows, query, statusFilter])

  const { data, toFirstPage, tableProps } = usePagedRows(matchingRows)

  const columns = useMemo<ColumnDefinition<Record<string, unknown>>[]>(
    () =>
      COLUMNS.map(({ field, header }) => {
        const base = { field, header, ...HUG, isSortable: false as const }

        if (field === 'date') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => {
              const row = entryOf(raw)
              return (
                // Two lines, the same shape as the Particulars cell beside it — a 20px line,
                // 4px, then a 20px row of reference and tag — so the two cells are the same
                // height and their first lines sit on one baseline. With the merchant on a
                // third line this cell was 16px taller, and DataTable centres every cell
                // vertically, so the particulars sat 8px below the date.
                <div className="flex flex-col gap-1 py-3 whitespace-nowrap">
                  <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
                    {formatDate(row.date)}
                  </PrimitiveText>
                  <div className="flex items-center gap-2">
                    <PrimitiveText {...CELL_META} color={colors.gray[500]}>
                      {row.id}
                    </PrimitiveText>
                    <EntryTag text={row.merchantId} color={TagV2Color.NEUTRAL} />
                  </div>
                </div>
              )
            },
          }
        }

        if (field === 'particulars') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => {
              const row = entryOf(raw)
              const isCredit = row.type === 'CREDIT'
              return (
                <div className="flex max-w-[420px] flex-col gap-1 py-3">
                  <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
                    {row.particulars}
                  </PrimitiveText>
                  {/* A wrapping row rather than TagGroupV2: the group is `flex-wrap: nowrap`
                      with no prop to change it (Primitives/Group/Group.tsx), and five tags in
                      a 420px column have to be able to wrap. 8 between tags, the gap
                      TagGroupV2 is given on Alerts; 4 between lines when they wrap. */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <EntryTag
                      text={isCredit ? 'Credit' : 'Debit'}
                      color={isCredit ? TagV2Color.SUCCESS : TagV2Color.ERROR}
                    />
                    <EntryTag text={row.entryType} color={TagV2Color.NEUTRAL} />
                    {row.holdAmount > 0 && (
                      <TagWithNote note={row.holdReason || 'On hold'}>
                        <EntryTag
                          text={`Held ${formatCurrency(row.holdAmount)}`}
                          color={TagV2Color.PURPLE}
                          Icon={Lock}
                        />
                      </TagWithNote>
                    )}
                    {row.reversedByEntryId && (
                      <TagWithNote note={`Reversed by ${row.reversedByEntryId}`}>
                        <EntryTag
                          text="Reversed"
                          color={TagV2Color.NEUTRAL}
                          Icon={ArrowLeftRight}
                        />
                      </TagWithNote>
                    )}
                    {row.originalEntryId && (
                      <EntryTag
                        text={`Links to ${row.originalEntryId}`}
                        color={TagV2Color.PRIMARY}
                        Icon={Link}
                      />
                    )}
                  </div>
                </div>
              )
            },
          }
        }

        if (field === 'amount' || field === 'runningBalance') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => {
              const row = entryOf(raw)
              const isAmount = field === 'amount'
              const isCredit = row.type === 'CREDIT'
              return (
                // Right-aligned with tabular figures, so the columns of money line up on the
                // decimal point. Their titles are right-aligned to match in index.css.
                <div
                  className="flex justify-end whitespace-nowrap"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  <PrimitiveText
                    {...CELL_TEXT}
                    color={
                      isAmount
                        ? isCredit
                          ? colors.green[600]
                          : colors.gray[900]
                        : colors.gray[700]
                    }
                    fontWeight={FOUNDATION_THEME.font.weight[600]}
                  >
                    {isAmount
                      ? `${isCredit ? '+' : '-'}${formatCurrency(row.amount)}`
                      : formatCurrency(row.runningBalance)}
                  </PrimitiveText>
                </div>
              )
            },
          }
        }

        if (field === 'status') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => <StatusTag status={entryOf(raw).status} />,
          }
        }

        if (field === 'reconciled') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => {
              const row = entryOf(raw)
              return (
                <div className="flex justify-center">
                  <CheckboxV2
                    checked={row.reconciled}
                    size={SelectorV2Size.MD}
                    aria-label={`${row.id} reconciled`}
                    onCheckedChange={() => actions.toggleReconciled(row.id)}
                  />
                </div>
              )
            },
          }
        }

        return {
          ...base,
          type: ColumnType.REACT_ELEMENT,
          renderCell: (_value, raw) => <RowActions row={entryOf(raw)} actions={actions} />,
        }
      }),
    [actions],
  )

  const scope = merchantFilter === ALL ? null : merchantFilter

  /** The four balances, in the prototype's order: where the period started, then where it is. */
  const statCards = [
    {
      title: 'Opening Balance',
      icon: <Landmark size={STAT_ICON_SIZE} color={colors.gray[600]} />,
      value: formatCurrency(summary.openingBalance),
      subtitle: scope ? 'Zeroed for merchant view' : 'Platform start',
    },
    {
      title: 'Available Balance',
      icon: <Wallet size={STAT_ICON_SIZE} color={colors.green[600]} />,
      value: formatCurrency(summary.availableBalance),
      subtitle: scope ? `For ${scope}` : 'Platform wide',
      helpIconText: 'Closing balance, less funds on hold and debits still in progress.',
    },
    {
      title: 'Funds on Hold',
      icon: <Lock size={STAT_ICON_SIZE} color={colors.orange[600]} />,
      value: formatCurrency(summary.totalHeld),
      subtitle: `Locked for ${scope ?? 'all accounts'}`,
    },
    {
      title: 'Closing Balance',
      icon: <BookCheck size={STAT_ICON_SIZE} color={colors.primary[600]} />,
      value: formatCurrency(summary.ledgerBalance),
      subtitle: `Total settled for ${scope ?? 'platform'}`,
    },
  ]

  return (
    // The Alerts page's container — capped at the design's 1440 frame, 24px gutters — so the
    // Reconciliation pages share one keyline.
    <div
      className="mx-auto flex w-full max-w-[1440px] flex-col px-6"
      style={{ paddingTop: spacing.aboveTitle, paddingBottom: spacing.belowTable }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <LedgerTitle gap={spacing.titleToIntro} />
        <div className="flex shrink-0 items-center gap-3">
          <HeaderActions rows={matchingRows} onNewEntry={actions.openNewEntry} />
        </div>
      </div>

      {/* Plain StatCardV2, props only, as on Alerts — `maxWidth="none"` lifts the card's own
          340px cap so four fill the row. */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ marginTop: spacing.introToCards }}
      >
        {statCards.map((card) => (
          <StatCardV2
            key={card.title}
            variant={StatCardV2Variant.NUMBER}
            title={card.title}
            titleIcon={card.icon}
            value={card.value}
            subtitle={card.subtitle}
            helpIconText={card.helpIconText}
            maxWidth="none"
          />
        ))}
      </div>

      <div
        className="flex flex-col"
        style={{ marginTop: spacing.cardsToToolbar, gap: spacing.toolbarToTable }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full sm:w-[360px]">
            <TextInputV2
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                toFirstPage()
              }}
              placeholder="Search by Particulars or ID..."
              aria-label="Search entries"
              size={InputSizeV2.SM}
              // gray[400], the placeholder's colour (rule 11).
              leftSlot={{ slot: <Search size={SLOT_ICON_SIZE} color={colors.gray[400]} /> }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[180px]">
              <SingleSelectV2
                placeholder="All Merchants"
                aria-label="Filter by merchant"
                size={SingleSelectV2Size.SM}
                variant={SingleSelectV2Variant.CONTAINER}
                triggerDimensions={{ width: '100%' }}
                items={merchantItems}
                selected={merchantFilter}
                onSelect={(next) => {
                  setMerchantFilter(next)
                  toFirstPage()
                }}
              />
            </div>
            <div className="w-[160px]">
              <SingleSelectV2
                placeholder="All Statuses"
                aria-label="Filter by status"
                size={SingleSelectV2Size.SM}
                variant={SingleSelectV2Variant.CONTAINER}
                triggerDimensions={{ width: '100%' }}
                items={STATUS_FILTER_ITEMS}
                selected={statusFilter}
                onSelect={(next) => {
                  setStatusFilter(next)
                  toFirstPage()
                }}
              />
            </div>
            {/* The prototype's period chip, which filters nothing there either: every entry
                in the ledger falls inside it. A placeholder for a date range, drawn so the
                toolbar reads as the design does. */}
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.SMALL}
              text="Past 6 Months"
              leftSlot={{ slot: <Funnel size={14} /> }}
            />
          </div>
        </div>

        {/* `ledger-table` is the hook for the money and centred columns' titles (index.css). */}
        <div className="ledger-table">
          <DataTable
            data={data}
            columns={columns}
            idField="id"
            showHeader={false}
            enableColumnManager={false}
            {...tableProps}
          />
        </div>
      </div>
    </div>
  )
}

export default LedgerV1
