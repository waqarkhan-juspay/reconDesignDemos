import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  InputSizeV2,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  SnackbarV2Variant,
  StatCardV2,
  StatCardV2Variant,
  TabsV2,
  TabsV2List,
  TabsV2Size,
  TabsV2Trigger,
  TabsV2Variant,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  TextInputV2,
  ThemeProvider,
  addSnackbarV2,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import {
  ArrowLeftRight,
  BookCheck,
  CircleCheck,
  CircleDashed,
  Clock,
  Funnel,
  Link,
  Lock,
  Search,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { PrimitiveText } from '../../primitives'
import { countTabsTokens } from '../../theme'
import { EntryTag, HeaderActions, LedgerTitle, RowActions, StatusTag, TagWithNote } from './cells'
import { ENTRY_KINDS } from './data'
import {
  ALL,
  formatCurrency,
  formatDate,
  matchesQuery,
  summariseLedger,
  type LedgerRow,
} from './ledger'
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

/**
 * Only a completed entry has moved money, so only a completed entry can be reconciled — an
 * in-progress debit has nothing on a statement to match yet, and a failed one never will.
 */
const isPosted = (row: LedgerRow) => row.status === 'COMPLETED'
const isUnreconciled = (row: LedgerRow) => isPosted(row) && !row.reconciled

/**
 * The views over the table, reconciling first: the page lives under Reconciliation, and the
 * rows still to reconcile are the ones it is opened for. On Hold and In Progress are the
 * other two lists someone works down. They replace V1's status select — In Progress is the
 * status anyone filters for, and Completed is most of All.
 */
const VIEWS = [
  { label: 'All', matches: () => true },
  { label: 'Unreconciled', matches: isUnreconciled },
  { label: 'On Hold', matches: (row: LedgerRow) => row.holdAmount > 0 },
  { label: 'In Progress', matches: (row: LedgerRow) => row.status === 'IN_PROGRESS' },
] as const

type View = (typeof VIEWS)[number]['label']

const KIND_LABEL = Object.fromEntries(ENTRY_KINDS.map(({ value, label }) => [value, label]))

const COLUMNS = [
  { field: 'date', header: 'Date / Ref ID' },
  { field: 'particulars', header: 'Particulars & Type' },
  { field: 'amount', header: 'Amount' },
  { field: 'runningBalance', header: 'Balance After' },
  { field: 'status', header: 'Status' },
  { field: 'reconciled', header: 'Recon' },
  { field: 'actions', header: 'Actions' },
] as const

/**
 * A row as V2's table sees it: the ledger row, plus whether to draw its merchant. The cells
 * are built once (see `columns`), so anything they draw from the page's state has to arrive
 * on the row rather than be closed over.
 */
type V2Row = TableRow & { showMerchant: boolean }

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

/**
 * Version 2 — the prototype with the review's top changes applied:
 *
 * 1. The balances add up on screen. Available leads, and its subtitle is the sum that makes
 *    it; the in-progress debits that sum needs are a card of their own. Opening Balance is
 *    folded into the ledger card, where it is the starting point of the figure beside it.
 * 2. Merchant scope sits in the header, above the cards it changes, not in the table toolbar
 *    under them. Scoped to one merchant, the rows stop repeating its name.
 * 3. Reconciling leads: views with counts, and rows selected in bulk to mark reconciled.
 * 4. Direction is said once — the sign and the colour of the amount. The Credit / Debit tag
 *    is gone, and the entry type is plain text, so the only tags left on a row are the
 *    exceptions: held, reversed, a reversal.
 * 5. Rows that never posted look it: their amount greyed (struck through when failed), no
 *    balance after them, nothing to reconcile.
 */
function LedgerV2() {
  const { entries, actions, spacing } = useLedgerOutlet()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('All')
  const [merchantFilter, setMerchantFilter] = useState(ALL)

  const merchantItems = useMemo(
    () => merchantItemsFor(Array.from(new Set(entries.map((entry) => entry.merchantId))).sort()),
    [entries],
  )

  const summary = useMemo(
    () => summariseLedger(entries, merchantFilter),
    [entries, merchantFilter],
  )

  /** Merchant and search narrow everything, the views included — so their counts agree. */
  const searchedRows = useMemo<V2Row[]>(() => {
    const needle = query.trim().toLowerCase()
    return summary.rows
      .filter((row) => matchesQuery(row, needle))
      .map((row) => ({ ...row, showMerchant: merchantFilter === ALL }))
  }, [summary.rows, query, merchantFilter])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map(({ label, matches }) => [label, searchedRows.filter(matches).length]),
      ) as Record<View, number>,
    [searchedRows],
  )

  const matchingRows = useMemo(() => {
    const { matches } = VIEWS.find(({ label }) => label === view) ?? VIEWS[0]
    return searchedRows.filter(matches)
  }, [searchedRows, view])

  const { data, toFirstPage, tableProps } = usePagedRows(matchingRows)

  /**
   * DataTable holds its row selection itself and has no prop to clear it. So the table is
   * keyed on what it is showing: a new view, merchant or search is a fresh table with nothing
   * selected — a selection you can no longer see should not be acted on — and `cleared`
   * bumps the key after a bulk action has used the selection up.
   */
  const [cleared, setCleared] = useState(0)
  const tableKey = `${view}|${merchantFilter}|${query}|${cleared}`
  const [selection, setSelection] = useState({ key: tableKey, ids: [] as string[] })
  const selectedIds = selection.key === tableKey ? selection.ids : []

  const reconcileSelected = (reconciled: boolean) => {
    actions.setReconciled(selectedIds, reconciled)
    addSnackbarV2({
      header: `${plural(selectedIds.length, 'entry', 'entries')} marked ${
        reconciled ? 'reconciled' : 'unreconciled'
      }`,
      variant: SnackbarV2Variant.SUCCESS,
    })
    setCleared((count) => count + 1)
  }

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
                // V1's two-line shape. The second line keeps its 20px when the merchant tag
                // is dropped, so the reference alone does not pull it 2px shorter than the
                // Particulars cell beside it and off its baseline.
                <div className="flex flex-col gap-1 py-3 whitespace-nowrap">
                  <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
                    {formatDate(row.date)}
                  </PrimitiveText>
                  <div className="flex min-h-5 items-center gap-2">
                    <PrimitiveText {...CELL_META} color={colors.gray[500]}>
                      {row.id}
                    </PrimitiveText>
                    {raw.showMerchant === true && (
                      <EntryTag text={row.merchantId} color={TagV2Color.NEUTRAL} />
                    )}
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
              return (
                <div className="flex max-w-[420px] flex-col gap-1 py-3">
                  <PrimitiveText {...CELL_TEXT} color={colors.gray[900]}>
                    {row.particulars}
                  </PrimitiveText>
                  {/* The entry type as plain text, so the only tags on the line are the
                      exceptions — and they stand out because they are the only colour. */}
                  <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
                    <PrimitiveText {...CELL_META} color={colors.gray[500]}>
                      {KIND_LABEL[row.entryType] ?? row.entryType}
                    </PrimitiveText>
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

        if (field === 'amount') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => {
              const row = entryOf(raw)
              const isCredit = row.type === 'CREDIT'
              const posted = isPosted(row)
              return (
                // Posted: credits green, debits ink. Not posted: grey, because the money has
                // not moved — and struck through once it has failed, because it never will.
                <div
                  className={`flex justify-end whitespace-nowrap ${
                    row.status === 'FAILED' ? 'line-through' : ''
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  <PrimitiveText
                    {...CELL_TEXT}
                    color={
                      !posted ? colors.gray[500] : isCredit ? colors.green[600] : colors.gray[900]
                    }
                    fontWeight={FOUNDATION_THEME.font.weight[600]}
                  >
                    {`${isCredit ? '+' : '-'}${formatCurrency(row.amount)}`}
                  </PrimitiveText>
                </div>
              )
            },
          }
        }

        if (field === 'runningBalance') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => {
              const row = entryOf(raw)
              return (
                <div
                  className="flex justify-end whitespace-nowrap"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {isPosted(row) ? (
                    <PrimitiveText
                      {...CELL_TEXT}
                      color={colors.gray[700]}
                      fontWeight={FOUNDATION_THEME.font.weight[600]}
                    >
                      {formatCurrency(row.runningBalance)}
                    </PrimitiveText>
                  ) : (
                    // A dash, not a repeat of the row below's balance: that figure would
                    // read as this entry having landed on it.
                    <>
                      <span aria-hidden>
                        <PrimitiveText {...CELL_TEXT} color={colors.gray[400]}>
                          —
                        </PrimitiveText>
                      </span>
                      <span className="sr-only">Not posted</span>
                    </>
                  )}
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
              if (!isPosted(row)) {
                return (
                  <>
                    <span aria-hidden>
                      <PrimitiveText {...CELL_TEXT} color={colors.gray[400]}>
                        —
                      </PrimitiveText>
                    </span>
                    <span className="sr-only">Nothing to reconcile</span>
                  </>
                )
              }
              // A state, not a control: rows are reconciled by selecting them. Done is quiet
              // — a green check and grey text — and still-to-do carries the colour, since it
              // is the one that needs a person.
              return (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  {row.reconciled ? (
                    <CircleCheck size={14} color={colors.green[600]} aria-hidden />
                  ) : (
                    <CircleDashed size={14} color={colors.orange[600]} aria-hidden />
                  )}
                  <PrimitiveText
                    {...CELL_META}
                    color={row.reconciled ? colors.gray[500] : colors.gray[700]}
                  >
                    {row.reconciled ? 'Reconciled' : 'Unreconciled'}
                  </PrimitiveText>
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

  /**
   * Read left to right, the cards are the sum: Available = Ledger − On Hold − Pending. The
   * first card spells it out, so nobody has to find the in-progress debit to make the
   * numbers agree.
   */
  const statCards = [
    {
      title: 'Available Balance',
      icon: <Wallet size={STAT_ICON_SIZE} color={colors.green[600]} />,
      value: formatCurrency(summary.availableBalance),
      subtitle: `${formatCurrency(summary.ledgerBalance)} − ${formatCurrency(
        summary.totalHeld,
      )} held − ${formatCurrency(summary.pendingDebits)} pending`,
      helpIconText:
        'What can be spent now: the ledger balance, less funds on hold and debits still in progress.',
    },
    {
      title: 'Ledger Balance',
      icon: <BookCheck size={STAT_ICON_SIZE} color={colors.primary[600]} />,
      value: formatCurrency(summary.ledgerBalance),
      subtitle: scope
        ? `Net of ${scope}'s completed entries`
        : `From ${formatCurrency(summary.openingBalance)} opening`,
    },
    {
      title: 'On Hold',
      // Purple, the held tag's colour in the table, so the card and the rows it counts match.
      icon: <Lock size={STAT_ICON_SIZE} color={colors.purple[600]} />,
      value: formatCurrency(summary.totalHeld),
      subtitle:
        summary.heldCount > 0
          ? `${plural(summary.heldCount, 'entry', 'entries')} held`
          : 'Nothing held',
    },
    {
      title: 'Pending Debits',
      // Orange, the In Progress tag's colour.
      icon: <Clock size={STAT_ICON_SIZE} color={colors.orange[600]} />,
      value: formatCurrency(summary.pendingDebits),
      subtitle:
        summary.pendingCount > 0
          ? `${plural(summary.pendingCount, 'debit', 'debits')} in progress`
          : 'Nothing in progress',
    },
  ]

  return (
    <div
      className="mx-auto flex w-full max-w-[1440px] flex-col px-6"
      style={{ paddingTop: spacing.aboveTitle, paddingBottom: spacing.belowTable }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <LedgerTitle gap={spacing.titleToIntro} />
        <div className="flex flex-wrap items-center gap-3">
          {/* The page's scope, above everything it changes — the four cards included. Its own
              row on a phone, so the three buttons wrap together under it rather than one of
              them sitting beside the select. */}
          <div className="w-full sm:w-[180px]">
            <SingleSelectV2
              placeholder="All Merchants"
              aria-label="Merchant"
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
          <HeaderActions rows={matchingRows} onNewEntry={actions.openNewEntry} />
        </div>
      </div>

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
          {/* Hugs its tabs, as on Alerts; scrolls inside itself rather than pushing the page
              sideways on a phone. */}
          <div className="w-fit max-w-full shrink-0 overflow-x-auto">
            <ThemeProvider componentTokens={countTabsTokens}>
              <TabsV2
                variant={TabsV2Variant.BOXED}
                size={TabsV2Size.LG}
                value={view}
                onValueChange={(next) => {
                  setView(next as View)
                  toFirstPage()
                }}
              >
                <TabsV2List>
                  {VIEWS.map(({ label }) => (
                    <TabsV2Trigger
                      key={label}
                      value={label}
                      rightSlot={
                        <TagV2
                          text={String(counts[label])}
                          aria-label={plural(counts[label], 'entry', 'entries')}
                          color={TagV2Color.NEUTRAL}
                          type={TagV2Type.SUBTLE}
                          subType={TagV2SubType.ROUNDED}
                          size={TagV2Size.XS}
                        />
                      }
                    >
                      {label}
                    </TabsV2Trigger>
                  ))}
                </TabsV2List>
              </TabsV2>
            </ThemeProvider>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="w-full sm:w-[320px]">
              <TextInputV2
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  toFirstPage()
                }}
                placeholder="Search by Particulars or ID..."
                aria-label="Search entries"
                size={InputSizeV2.SM}
                leftSlot={{ slot: <Search size={SLOT_ICON_SIZE} color={colors.gray[400]} /> }}
              />
            </div>
            {/* Still the prototype's inert period chip — see V1. */}
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.SMALL}
              text="Past 6 Months"
              leftSlot={{ slot: <Funnel size={14} /> }}
            />
          </div>
        </div>

        {/* `ledger-table-v2` is the hook for the money and status columns' titles (index.css). */}
        <div className="ledger-table-v2">
          <DataTable
            key={tableKey}
            data={data}
            columns={columns}
            idField="id"
            showHeader={false}
            enableColumnManager={false}
            enableRowSelection
            rowSelectionConfig={{
              isDisabled: (row) => !isPosted(entryOf(row)),
              disabledText: () => 'Only completed entries can be reconciled',
            }}
            onRowSelectionChange={(ids) => setSelection({ key: tableKey, ids })}
            bulkActions={{
              // Off: the selection is for reconciling, and the page's own exports already
              // write what the table shows.
              showExport: false,
              customActions: (
                <>
                  <ButtonV2
                    buttonType={ButtonV2Type.SECONDARY}
                    size={ButtonV2Size.SMALL}
                    text="Mark unreconciled"
                    onClick={() => reconcileSelected(false)}
                  />
                  <ButtonV2
                    buttonType={ButtonV2Type.PRIMARY}
                    size={ButtonV2Size.SMALL}
                    text="Mark reconciled"
                    onClick={() => reconcileSelected(true)}
                  />
                </>
              ),
            }}
            {...tableProps}
          />
        </div>
      </div>
    </div>
  )
}

export default LedgerV2
