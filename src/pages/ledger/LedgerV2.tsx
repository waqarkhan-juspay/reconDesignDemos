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
  Landmark,
  Link,
  LockKeyhole,
  Scale,
  Search,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { PrimitiveText } from '../../primitives'
import { countTabsTokens } from '../../theme'
import {
  BANK_LINES,
  buildComparison,
  type ComparisonRow,
  type MatchState,
  matchesBankQuery,
  matchesComparisonQuery,
  summariseBank,
} from './bank'
import { BANK_COLUMNS, COMPARISON_COLUMNS } from './bank-columns'
import {
  EntryTag,
  HeaderActions,
  LedgerTitle,
  RowActions,
  StateTag,
  StatusTag,
  TagWithNote,
} from './cells'
import { ENTRY_KINDS } from './data'
import {
  ALL,
  formatCurrency,
  formatDate,
  matchesQuery,
  summariseLedger,
  type LedgerRow,
} from './ledger'
import { PeriodFilter, openingRange, withinRange } from './period'
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
 * The three ledgers the page shows, in the order the switch lists them: what the bank says,
 * what we posted, and the two held against each other.
 *
 * RECONCILED is the default because it is the page as it stood before the switch existed —
 * adding a ledger should not change what /ledger opens on.
 */
const SOURCES = [
  { value: 'BANK', label: 'Bank Ledger', Icon: Landmark },
  { value: 'RECONCILED', label: 'Reconciled Ledger', Icon: BookCheck },
  { value: 'COMPARE', label: 'Bank v/s Reconciled', Icon: Scale },
] as const

type Source = (typeof SOURCES)[number]['value']

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

/**
 * The Bank's views. A statement has no status and nothing on hold — those are things we do
 * to an entry, not things a bank records — so the only question worth filtering on is
 * whether our ledger has caught up with it.
 */
const BANK_VIEWS = [
  { label: 'All', matches: () => true },
  {
    label: 'Exceptions',
    matches: (row: { match: MatchState }) => row.match !== 'MATCHED',
  },
] as const

/** The comparison's views: all four outcomes a reconciliation has, exceptions first. */
const COMPARE_VIEWS = [
  { label: 'All', matches: () => true },
  { label: 'Amount differs', matches: (row: ComparisonRow) => row.match === 'AMOUNT_DIFFERS' },
  { label: 'Bank only', matches: (row: ComparisonRow) => row.match === 'BANK_ONLY' },
  { label: 'Ledger only', matches: (row: ComparisonRow) => row.match === 'LEDGER_ONLY' },
  { label: 'Matched', matches: (row: ComparisonRow) => row.match === 'MATCHED' },
] as const

const KIND_LABEL = Object.fromEntries(ENTRY_KINDS.map(({ value, label }) => [value, label]))

const COLUMNS = [
  { field: 'date', header: 'Ref ID / Date' },
  { field: 'merchantId', header: 'Merchant' },
  { field: 'particulars', header: 'Particulars & Type' },
  { field: 'amount', header: 'Amount' },
  { field: 'runningBalance', header: 'Balance After' },
  { field: 'status', header: 'Status' },
  { field: 'reconciled', header: 'Recon Status' },
  { field: 'actions', header: 'Actions' },
] as const

/** A row as V2's table sees it. */
type V2Row = TableRow

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
  // A string rather than one union: the three ledgers do not offer the same views, and the
  // switch resets this to 'All' — which every one of them has — whenever the ledger changes.
  const [view, setView] = useState<string>('All')
  const [merchantFilter, setMerchantFilter] = useState(ALL)
  const [source, setSource] = useState<Source>('RECONCILED')
  /**
   * Seeded once, from the data rather than from the clock — see `openingRange`. `useState`'s
   * initialiser runs on the first render only, so the range does not move under the user
   * when an entry is added mid-session.
   */
  const [period, setPeriod] = useState(() => openingRange(entries, BANK_LINES))

  const merchantItems = useMemo(
    () => merchantItemsFor(Array.from(new Set(entries.map((entry) => entry.merchantId))).sort()),
    [entries],
  )

  const summary = useMemo(
    () => summariseLedger(entries, merchantFilter),
    [entries, merchantFilter],
  )

  /**
   * The other two ledgers, scoped by the same merchant select. Both are derived from the live
   * `entries`, so an entry recorded or reversed here moves the bank's match state and the
   * comparison's delta in the same breath — three views of one ledger, never three copies.
   */
  const bank = useMemo(
    () => summariseBank(BANK_LINES, entries, merchantFilter),
    [entries, merchantFilter],
  )
  const comparison = useMemo(
    () => buildComparison(entries, BANK_LINES, merchantFilter),
    [entries, merchantFilter],
  )

  /**
   * Merchant, period and search narrow everything, the views included — so their counts
   * agree with the rows under them.
   *
   * The period lands here rather than inside the summarisers on purpose. A row's "Balance
   * After" and the cards' closing balance are cumulative from the account's opening balance,
   * so recomputing them over a window would report the window's own arithmetic as the
   * account's — "Closing Balance" for September, with August's money missing. Narrowing
   * afterwards leaves every figure true and simply shows fewer rows, which is also how the
   * search box behaves.
   */
  const searchedRows = useMemo<V2Row[]>(() => {
    const needle = query.trim().toLowerCase()
    return summary.rows.filter((row) => withinRange(row.date, period) && matchesQuery(row, needle))
  }, [summary.rows, query, period])

  /** The same narrowing, for the bank's own lines and for the pairs. */
  const searchedBankRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return bank.rows.filter(
      (row) => withinRange(row.date, period) && matchesBankQuery(row, needle),
    )
  }, [bank.rows, query, period])

  const searchedComparisonRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return comparison.rows.filter(
      (row) => withinRange(row.date, period) && matchesComparisonQuery(row, needle),
    )
  }, [comparison.rows, query, period])

  /**
   * The current ledger's views, their counts and the rows the table will show.
   *
   * Built in one place because the three ledgers do not share a row type: `select` is generic
   * so each branch unifies on its own, and only the result — labels, counts, rows — is widened
   * for the table. Doing it the other way round, with one union of three row types, puts a
   * cast in every cell instead of one here.
   */
  const { viewLabels, counts, matchingRows } = useMemo(() => {
    const select = <T,>(
      list: readonly { label: string; matches: (row: T) => boolean }[],
      rows: T[],
    ) => {
      const active = list.find(({ label }) => label === view) ?? list[0]
      return {
        viewLabels: list.map(({ label }) => label),
        counts: Object.fromEntries(
          list.map(({ label, matches }) => [label, rows.filter(matches).length]),
        ) as Record<string, number>,
        matchingRows: rows.filter(active.matches) as unknown as TableRow[],
      }
    }
    if (source === 'BANK') return select(BANK_VIEWS, searchedBankRows)
    if (source === 'COMPARE') return select(COMPARE_VIEWS, searchedComparisonRows)
    return select(VIEWS, searchedRows)
  }, [source, view, searchedRows, searchedBankRows, searchedComparisonRows])

  const { data, toFirstPage, tableProps } = usePagedRows(matchingRows)

  /**
   * Reconciling in bulk belongs to the reconciled ledger: a bank line is not ours to mark,
   * and a comparison row may be a pair, a bank line alone or an entry alone — three different
   * things for one checkbox to mean.
   */
  const canReconcileInBulk = source === 'RECONCILED'

  /**
   * DataTable holds its row selection itself and has no prop to clear it. So the table is
   * keyed on what it is showing: a new view, merchant or search is a fresh table with nothing
   * selected — a selection you can no longer see should not be acted on — and `cleared`
   * bumps the key after a bulk action has used the selection up.
   */
  const [cleared, setCleared] = useState(0)
  const tableKey = `${source}|${view}|${merchantFilter}|${query}|${cleared}`
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

  const reconciledColumns = useMemo<ColumnDefinition<Record<string, unknown>>[]>(
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
                // The reference leads: it is what a row is looked up and talked about by,
                // and several rows share a date. The date is the subtext under it.
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
          }
        }

        if (field === 'merchantId') {
          return {
            ...base,
            type: ColumnType.REACT_ELEMENT,
            renderCell: (_value, raw) => (
              // Plain text, not the tag it used to be: a tag earns its border by being an
              // exception among plain rows, and a column where every row has one is just a
              // column of borders.
              <div className="whitespace-nowrap">
                <PrimitiveText {...CELL_TEXT} color={colors.gray[700]}>
                  {entryOf(raw).merchantId}
                </PrimitiveText>
              </div>
            ),
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
                          Icon={LockKeyhole}
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
              // A state, not a control: rows are reconciled by selecting them. Reconciled
              // is quiet and still-to-do carries the colour, since it is the one that needs
              // a person — the same tag the Status column beside it uses.
              return (
                <div className="flex whitespace-nowrap">
                  <StateTag
                    text={row.reconciled ? 'Reconciled' : 'Unreconciled'}
                    color={row.reconciled ? TagV2Color.NEUTRAL : TagV2Color.WARNING}
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

  /**
   * The Bank's and the comparison's columns are static — neither cell needs `actions`.
   *
   * Scoped to one merchant, the Merchant column is dropped rather than drawn with the same
   * value repeated down it. Dropping the column is what replaced hiding a tag inside the
   * date cell: one decision in one place, for all three ledgers.
   */
  const columns = useMemo(() => {
    const all =
      source === 'BANK'
        ? BANK_COLUMNS
        : source === 'COMPARE'
          ? COMPARISON_COLUMNS
          : reconciledColumns
    return merchantFilter === ALL ? all : all.filter((column) => column.field !== 'merchantId')
  }, [source, reconciledColumns, merchantFilter])

  const scope = merchantFilter === ALL ? null : merchantFilter

  /**
   * Read left to right, the cards are the sum: Available = Ledger − On Hold − Pending. The
   * first card spells it out, so nobody has to find the in-progress debit to make the
   * numbers agree.
   */
  const reconciledCards = [
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
      icon: <LockKeyhole size={STAT_ICON_SIZE} color={colors.purple[600]} />,
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

  /**
   * The Bank's own figures. Four cards again, so the row does not reflow as you switch — but
   * they are the statement's questions, not the ledger's: what cleared in, what cleared out,
   * where it left the balance, and how much of it we have not accounted for.
   */
  const bankCards = [
    {
      title: 'Bank Closing Balance',
      icon: <Landmark size={STAT_ICON_SIZE} color={colors.primary[600]} />,
      value: formatCurrency(bank.closingBalance),
      subtitle: scope
        ? `Net of ${scope}'s cleared lines`
        : `From ${formatCurrency(bank.openingBalance)} opening`,
      helpIconText:
        'Every line on the statement applied in date order. A statement records only what has already cleared, so there is nothing pending here.',
    },
    {
      title: 'Credits',
      icon: <CircleCheck size={STAT_ICON_SIZE} color={colors.green[600]} />,
      value: formatCurrency(bank.credits),
      subtitle: 'Money in, as the bank recorded it',
    },
    {
      title: 'Debits',
      icon: <Clock size={STAT_ICON_SIZE} color={colors.gray[600]} />,
      value: formatCurrency(bank.debits),
      subtitle: 'Money out, as the bank recorded it',
    },
    {
      title: 'Unmatched Lines',
      icon: <CircleDashed size={STAT_ICON_SIZE} color={colors.orange[600]} />,
      value: String(bank.unmatchedCount),
      subtitle:
        bank.unmatchedCount > 0
          ? `${plural(bank.unmatchedCount, 'line', 'lines')} with nothing posted against them`
          : 'Every line is in the ledger',
    },
  ]

  /**
   * The comparison's figures, and they are the sum the page exists to show: the two closing
   * balances, what they differ by, and how many rows explain it. Difference leads, because
   * it is the only one of the four anybody is actually asking about.
   */
  const comparisonCards = [
    {
      title: 'Difference',
      icon: <Scale size={STAT_ICON_SIZE} color={colors.orange[600]} />,
      value: formatCurrency(comparison.difference),
      subtitle: `${formatCurrency(comparison.bankClosing)} bank − ${formatCurrency(
        comparison.ledgerClosing,
      )} ledger`,
      helpIconText:
        'Bank closing less ledger closing. Everything below this row is a reason the two disagree.',
    },
    {
      title: 'Bank Closing',
      icon: <Landmark size={STAT_ICON_SIZE} color={colors.primary[600]} />,
      value: formatCurrency(comparison.bankClosing),
      subtitle: 'Every cleared line applied',
    },
    {
      title: 'Ledger Closing',
      icon: <BookCheck size={STAT_ICON_SIZE} color={colors.primary[600]} />,
      value: formatCurrency(comparison.ledgerClosing),
      subtitle: 'Completed entries only',
    },
    {
      title: 'Rows to Explain',
      icon: <TriangleAlert size={STAT_ICON_SIZE} color={colors.orange[600]} />,
      value: String(comparison.unmatchedCount),
      subtitle:
        comparison.unmatchedCount > 0
          ? `${plural(comparison.unmatchedCount, 'row', 'rows')} that are not a clean pair`
          : 'Every row is a clean pair',
    },
  ]

  const statCards =
    source === 'BANK' ? bankCards : source === 'COMPARE' ? comparisonCards : reconciledCards

  return (
    <div
      className="mx-auto flex w-full max-w-[1440px] flex-col px-6"
      style={{ paddingTop: spacing.aboveTitle, paddingBottom: spacing.belowTable }}
    >
      <LedgerTitle />

      {/*
        The ledger switch. UNDERLINE rather than the BOXED strip in the toolbar below,
        because the two are not the same kind of control and should not look it: this one
        changes which ledger you are reading — the cards, the columns and the views all
        follow it — while the boxed tabs filter whatever it chose. A second boxed strip 24px
        above the first would read as one row of tabs that had wrapped.

        Switching resets the view to 'All', which is the one view all three ledgers share;
        keeping 'On Hold' selected on a bank statement would show an empty table and no
        reason for it.
      */}
      <div
        className="flex flex-wrap items-center justify-between gap-4"
        style={{ marginTop: spacing.introToCards }}
      >
        <div className="w-fit max-w-full overflow-x-auto">
          <TabsV2
            variant={TabsV2Variant.UNDERLINE}
            size={TabsV2Size.LG}
            value={source}
            onValueChange={(next) => {
              setSource(next as Source)
              setView('All')
              toFirstPage()
            }}
          >
            <TabsV2List>
              {SOURCES.map(({ value, label, Icon }) => (
                <TabsV2Trigger
                  key={value}
                  value={value}
                  leftSlot={<Icon size={SLOT_ICON_SIZE} />}
                >
                  {label}
                </TabsV2Trigger>
              ))}
            </TabsV2List>
          </TabsV2>
        </div>

        {/*
          The page's scope and its actions, at the far end of the switch's own row rather
          than up beside the title. They belong to whichever ledger the switch chose — the
          merchant scopes all three, and which buttons show depends on the tab — so sitting
          on that line says so. It also keeps the title line to the title.

          items-center on the row, which is not the obvious choice but is the right one.
          The tab strip is taller than it looks — 8px of list padding above, then a 39px
          trigger whose own 12px bottom padding is the gutter the active underline sits in —
          so aligning the two boxes by their tops throws the buttons 8px above the labels.
          Centring both in the 48px row lands them within half a pixel of the labels instead.
        */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Its own row on a phone, so the buttons wrap together under it rather than one
              of them sitting beside the select. */}
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
          <HeaderActions
            rows={matchingRows as unknown as LedgerRow[]}
            onNewEntry={actions.openNewEntry}
            showExports={source === 'RECONCILED'}
          />
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
                  setView(next)
                  toFirstPage()
                }}
              >
                <TabsV2List>
                  {viewLabels.map((label) => (
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
                placeholder={
                  source === 'BANK'
                    ? 'Search by Narration or Bank Ref...'
                    : 'Search by Particulars or ID...'
                }
                aria-label="Search entries"
                size={InputSizeV2.SM}
                leftSlot={{ slot: <Search size={SLOT_ICON_SIZE} color={colors.gray[400]} /> }}
              />
            </div>
            <PeriodFilter
              value={period}
              onChange={(next) => {
                setPeriod(next)
                toFirstPage()
              }}
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
            enableRowSelection={canReconcileInBulk}
            rowSelectionConfig={
              canReconcileInBulk
                ? {
                    isDisabled: (row) => !isPosted(entryOf(row)),
                    disabledText: () => 'Only completed entries can be reconciled',
                  }
                : undefined
            }
            onRowSelectionChange={(ids) => setSelection({ key: tableKey, ids })}
            bulkActions={
              canReconcileInBulk
                ? {
                    // Off: the selection is for reconciling, and the page's own exports
                    // already write what the table shows.
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
                  }
                : undefined
            }
            {...tableProps}
          />
        </div>
      </div>
    </div>
  )
}

export default LedgerV2
