import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  ColumnType,
  DataTable,
  FOUNDATION_THEME,
  ModalV2,
  SelectorV2Size,
  SwitchV2,
  TabsV2,
  TabsV2List,
  TabsV2Size,
  TabsV2Trigger,
  TabsV2Variant,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { useDialKit } from 'dialkit'
import { Plus } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { FEEDBACK_EASING, MICRO_MS } from '../motion'
import { PrimitiveText, font } from '../primitives'
import { REPORT_CATEGORY_IDS, type Categorised, type ReportCategory } from '../report-config'

const { colors } = FOUNDATION_THEME

/** The page-level tabs under the title. Labels are the identity — keep them unique. */
const SECTION_TABS = [
  'Report Config',
  'SFTP Config',
  'Schedule Jobs',
  'Configuration Setup',
  'Recon Configs',
  'Query Jobs',
  'SFTP Setup',
  'Settlement Report',
]

/**
 * The filter tabs sitting above the table: the categories themselves, plus an unfiltered
 * "All". The tab label *is* the category, so nothing has to be mapped back — and the list
 * is derived from src/report-config.ts, so a category cannot exist without a tab.
 */
const ALL = 'All'
const FILTER_TABS: (typeof ALL | ReportCategory)[] = [ALL, ...REPORT_CATEGORY_IDS]

const toValue = (label: string) => label.toLowerCase().replace(/\s+/g, '-')

/**
 * `status` is deliberately absent: it is derived from the row's enabled state at render
 * time, so the toggle and the Status cell cannot drift out of sync. `actions` is absent
 * too — that column renders a control, not a value.
 */
type ReportConfigRow = Categorised & {
  id: string
  configurationName: string
  paymentEntity: string
  frequency: string
  channel: string
  createdDate: string
}

/**
 * Every column hugs its content except Configuration Name, which absorbs the slack.
 *
 * The fixed tracks the design specifies (238 / 232 / 134.5) are gone on purpose: they were
 * floors, and a floor is exactly what stops a column hugging. Blend's own type defaults are
 * floors too — TEXT is min 120 / max 250 (utils.ts getTypeBasedDefaults) — so both are
 * overridden below with `0` / `none`, leaving each column free to size to its content.
 *
 * Which column takes the leftover width is not expressible here: getColumnStyles hardcodes
 * `width: 'auto'` on every cell and ignores ColumnDefinition.width entirely. That part is
 * done in index.css against `.reports-config-table`.
 */
const COLUMNS = [
  { field: 'configurationName', header: 'Configuration Name' },
  { field: 'categorySource', header: 'Category/Source' },
  { field: 'sourceType', header: 'Source / Type' },
  { field: 'paymentEntity', header: 'Payment Entity' },
  { field: 'frequency', header: 'Frequency' },
  { field: 'channel', header: 'Channel' },
  { field: 'status', header: 'Status' },
  { field: 'createdDate', header: 'Created Date' },
  { field: 'actions', header: 'Actions' },
] as const

/** Let content decide the width — see the note above. */
const HUG = { minWidth: '0px', maxWidth: 'none' } as const

/**
 * Nine rows transcribed from the design's populated table (node 4410:25166), plus a tenth
 * written here so the set fills one page of ten. It splits the categories five and five,
 * which is also what makes the filter tabs worth clicking.
 *
 * Status is absent on purpose — it is derived from the row's enabled state (see `data`)
 * rather than transcribed, so the design's Active/Inactive/Paused values are not carried
 * over. Actions is absent for the same reason: that column renders the toggle.
 */
const rows: ReportConfigRow[] = [
  {
    id: 'row-1',
    configurationName: 'Razorpay Monthly Summary',
    categorySource: 'File Summary',
    sourceType: 'Settlement',
    paymentEntity: 'Razorpay',
    frequency: 'Monthly on 19th at 17:15 IST',
    channel: 'Email',
    createdDate: '19th Aug 2026',
  },
  {
    id: 'row-2',
    configurationName: 'Daily Settlement Report',
    categorySource: 'Reconciliation',
    sourceType: 'Overall',
    paymentEntity: 'Razorpay',
    frequency: 'Daily at 09:00 IST',
    channel: 'Email',
    createdDate: '12th Jul 2026',
  },
  {
    id: 'row-3',
    configurationName: 'Weekly Refund Summary',
    categorySource: 'Reconciliation',
    sourceType: 'Matched',
    paymentEntity: 'Razorpay',
    frequency: 'Weekly on Mon at 10:00 IST',
    channel: 'Email',
    createdDate: '5th Jun 2026',
  },
  {
    id: 'row-4',
    configurationName: 'Payment Gateway Alerts',
    categorySource: 'Reconciliation',
    sourceType: 'Mismatched',
    paymentEntity: 'Razorpay',
    frequency: 'Real-time',
    channel: 'Slack',
    createdDate: '22nd Mar 2026',
  },
  {
    id: 'row-5',
    configurationName: 'Quarterly Tax Invoice',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: 'Razorpay',
    frequency: 'Quarterly on 1st at 08:00 IST',
    channel: 'Email',
    createdDate: '1st Jan 2026',
  },
  {
    id: 'row-6',
    configurationName: 'Dispute Escalation Notify',
    categorySource: 'Reconciliation',
    sourceType: 'Mismatched',
    paymentEntity: 'Razorpay',
    frequency: 'Real-time',
    channel: 'Webhook',
    createdDate: '14th Apr 2026',
  },
  {
    id: 'row-7',
    configurationName: 'Payout Reconciliation',
    categorySource: 'Reconciliation',
    sourceType: 'Overall',
    paymentEntity: 'RazorpayX',
    frequency: 'Weekly on Fri at 18:00 IST',
    channel: 'Email',
    createdDate: '8th May 2026',
  },
  {
    id: 'row-8',
    configurationName: 'Subscription Renewal Alert',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: 'Razorpay',
    frequency: 'Daily at 07:30 IST',
    channel: 'Slack',
    createdDate: '30th Aug 2026',
  },
  {
    id: 'row-9',
    configurationName: 'Failed Payment Digest',
    categorySource: 'File Summary',
    sourceType: 'Settlement',
    paymentEntity: 'Razorpay',
    frequency: 'Daily at 11:00 IST',
    channel: 'Email',
    createdDate: '15th Feb 2026',
  },
  {
    id: 'row-10',
    configurationName: 'Chargeback File Export',
    categorySource: 'File Summary',
    sourceType: 'Transaction',
    paymentEntity: 'Razorpay',
    frequency: 'Weekly on Wed at 12:00 IST',
    channel: 'Webhook',
    createdDate: '3rd Sep 2026',
  },
]

/**
 * The page's vertical rhythm, tunable live from the DialKit panel.
 *
 * One dial per gap between the page's top-level blocks — title, section tabs, the
 * toolbar row, the table. The table is deliberately a single block: nothing here reaches
 * inside it, so row heights, header height and cell padding stay owned by Blend's tokens
 * and cannot be knocked off the design by a stray drag.
 *
 * Tuples are [value, min, max, step]. The step is 4 so every value the dial can produce
 * still lands on the 4px spacing grid (DESIGN.md §7). Defaults are 24 except the toolbar
 * to table gap, tuned down to 16 so the toolbar sits tighter to the table it belongs to.
 */
// A factory rather than five literals: it puts the range and the 4px step in one place,
// and returns a mutable tuple, which is what DialKit's DialConfig wants — `as const` here
// produces a readonly tuple and does not typecheck.
const dial = (value: number): [number, number, number, number] => [value, 0, 96, 4]

const SPACING_DIALS = {
  aboveTitle: dial(24),
  titleToTabs: dial(24),
  tabsToToolbar: dial(24),
  toolbarToTable: dial(16),
  belowTable: dial(24),
}

/**
 * Handed to index.css so the hover reveal on the column filter buttons reads its timing
 * from src/motion.ts (rule 14) rather than keeping a second copy in the stylesheet.
 */
const TABLE_MOTION = {
  '--table-feedback': `${MICRO_MS}ms`,
  '--table-feedback-ease': FEEDBACK_EASING,
} as CSSProperties

function Configurator() {
  const navigate = useNavigate()
  const [section, setSection] = useState(toValue(SECTION_TABS[0]))
  const [filter, setFilter] = useState<string>(ALL)
  const activeCategory = filter === ALL ? null : filter

  const spacing = useDialKit('Configurator spacing', SPACING_DIALS)

  /** Row id → enabled. Every row starts enabled, so every row starts "Active". */
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, true])),
  )

  /**
   * Id of the row waiting on a disable confirmation, or null. Disabling is the destructive
   * direction, so only that one asks; re-enabling applies straight away. Nothing is written
   * to `enabled` until the user confirms, so the switch stays visibly ON behind the modal
   * and a cancel needs no rollback.
   */
  const [pendingDisableId, setPendingDisableId] = useState<string | null>(null)
  const pendingRow = rows.find((row) => row.id === pendingDisableId) ?? null

  const closeConfirm = () => setPendingDisableId(null)

  const confirmDisable = () => {
    if (pendingDisableId) {
      setEnabled((previous) => ({ ...previous, [pendingDisableId]: false }))
    }
    closeConfirm()
  }

  /**
   * Both the toggle's position and the Status cell are projected from one flag, so they
   * cannot disagree. `enabled` rides along on the row because the Actions cell has to read
   * it from here — see the note on `columns` below.
   */
  const data = useMemo(
    () =>
      rows
        .filter((row) => activeCategory === null || row.categorySource === activeCategory)
        .map((row) => {
          const isEnabled = enabled[row.id] ?? true
          return {
            ...row,
            enabled: isEnabled,
            // A TAG column's value must be TagData — an object carrying `text`. That text
            // is what DataTable sorts and searches on; the chip comes from renderCell.
            status: { text: isEnabled ? 'Active' : 'Disabled' },
          }
        }),
    [enabled, activeCategory],
  )

  /**
   * Built once, deliberately. DataTable seeds `visibleColumns` from a `useState`
   * initialiser and its resync effect only notices a changed `renderCell` when the column
   * is `ColumnType.CUSTOM` (DataTable.tsx:265-274) — so for a REACT_ELEMENT column the
   * FIRST `renderCell` closure is the only one that ever runs. Rebuilding this memo per
   * toggle would therefore be silently ignored, leaving a one-way switch.
   *
   * So the cell reads its state from `row`, which is always current because `data` is a
   * prop, and writes through `setEnabled`, which React guarantees is stable.
   */
  const columns = useMemo<ColumnDefinition<Record<string, unknown>>[]>(
    () =>
      // Two of the nine columns render a control instead of a value. `base` is the shape
      // they all share, written once; each branch then adds only what makes it different.
      // Kept as three returns rather than a spread of partials because ColumnDefinition is
      // a union discriminated on `type` — a widened `type` stops it narrowing at all.
      COLUMNS.map(({ field, header }) => {
        const base = { field, header, ...HUG }

        if (field === 'status') {
          return {
            ...base,
            // TableCell has no TAG branch in 0.0.37 — ColumnType.TAG only drives sorting,
            // validation and default widths — so the chip has to come from renderCell.
            // Colour is read off `row.enabled`, the same single source of truth the toggle
            // writes to, rather than parsed back out of the label text.
            type: ColumnType.TAG,
            renderCell: (_value, row) => {
              const isEnabled = row.enabled !== false
              return (
                <TagV2
                  text={isEnabled ? 'Active' : 'Disabled'}
                  color={isEnabled ? TagV2Color.SUCCESS : TagV2Color.NEUTRAL}
                  type={TagV2Type.SUBTLE}
                  size={TagV2Size.SM}
                />
              )
            },
          }
        }

        if (field === 'actions') {
          return {
            ...base,
            // REACT_ELEMENT is the one column type that takes arbitrary JSX, and it
            // reports supportsSorting/supportsFiltering false — so this column also
            // correctly renders without the header's sort/filter menu.
            type: ColumnType.REACT_ELEMENT,
            isSortable: false,
            renderCell: (_value, row) => {
              const id = String(row.id)
              const checked = row.enabled !== false
              return (
                <SwitchV2
                  checked={checked}
                  size={SelectorV2Size.MD}
                  aria-label={`${checked ? 'Disable' : 'Enable'} ${String(row.configurationName)}`}
                  onCheckedChange={(next) => {
                    // Turning ON is not destructive, so it commits immediately. Turning
                    // OFF only opens the confirmation — `enabled` is written by
                    // confirmDisable, which is why the switch stays ON underneath.
                    if (next) {
                      setEnabled((previous) => ({ ...previous, [id]: true }))
                    } else {
                      setPendingDisableId(id)
                    }
                  }}
                />
              )
            },
          }
        }

        return { ...base, type: ColumnType.TEXT }
      }),
    [],
  )

  return (
    <div className="flex flex-col px-6" style={{ paddingTop: spacing.aboveTitle }}>
      <PrimitiveText
        as="h1"
        // heading.lg (24/32) per the updated design at node 4410:25156 — it was xl (32/38).
        {...font(FOUNDATION_THEME.font.size.heading.lg)}
        color={colors.gray[700]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        Configurator
      </PrimitiveText>

      {/* The class carries the 24px inter-tab gap the design specifies — see index.css.
          TabsV2List takes no className, so it has to be reached through this wrapper. */}
      <div className="configurator-section-tabs" style={{ marginTop: spacing.titleToTabs }}>
        <TabsV2
          variant={TabsV2Variant.UNDERLINE}
          size={TabsV2Size.MD}
          value={section}
          onValueChange={setSection}
        >
          <TabsV2List>
            {SECTION_TABS.map((label) => (
              <TabsV2Trigger key={label} value={toValue(label)}>
                {label}
              </TabsV2Trigger>
            ))}
          </TabsV2List>
        </TabsV2>
      </div>

      {/* px-6 insets the whole tab panel — toolbar and table together — 24px on each side,
          so the panel reads as content nested under the active Report Config tab and its
          two rows stay flush with each other. Only padding-left/right come from Tailwind
          here; the vertical padding below is the dial's, so the two never collide. */}
      <div
        className="flex flex-col px-6"
        style={{
          paddingTop: spacing.tabsToToolbar,
          paddingBottom: spacing.belowTable,
          gap: spacing.toolbarToTable,
        }}
      >
        <div className="flex items-center justify-between">
          <TabsV2
            variant={TabsV2Variant.FLOATING}
            size={TabsV2Size.LG}
            value={filter}
            onValueChange={setFilter}
          >
            <TabsV2List>
              {FILTER_TABS.map((label) => (
                <TabsV2Trigger key={label} value={label}>
                  {label}
                </TabsV2Trigger>
              ))}
            </TabsV2List>
          </TabsV2>

          {/* ButtonV2 sizes to its text; without this it is a flex item that can shrink
              and wrap "Create report config" onto a second line. */}
          <div className="shrink-0">
            <ButtonV2
              buttonType={ButtonV2Type.PRIMARY}
              size={ButtonV2Size.SMALL}
              text="Create report config"
              leftSlot={{ slot: <Plus size={16} /> }}
              onClick={() => navigate('/configurator/create')}
            />
          </div>
        </div>

        <div className="reports-config-table" style={TABLE_MOTION}>
          <DataTable
            data={data}
            columns={columns}
            idField="id"
            showHeader={false}
            // Columns are deliberately fixed. The Figma draws a drag handle on the first
            // header, but reordering was not wanted — and `enableColumnReordering` is what
            // gates both the grip icon and the DraggableColumnHeader wrapper
            // (TableHeader/index.tsx:841), so leaving it off removes the affordance and
            // the behaviour together. Default is already false; stated here so the
            // divergence from the design is deliberate rather than forgotten.
            enableColumnReordering={false}
            // Defaults to true, which adds a "+" column-manager button past the last
            // header cell. The design ends at column six.
            enableColumnManager={false}
            // Now that the tabs really filter, a hardcoded "20 rows / page 2" would be
            // describing data that is not there — so the footer counts what is actually
            // rendered, and resets to page 1 as the filter changes the result set.
            pagination={{
              currentPage: 1,
              pageSize: 10,
              totalRows: data.length,
              pageSizeOptions: [10, 20, 30, 40, 50],
            }}
            // Server-side pagination is what lets the footer describe a page the parent has
            // already sliced, so DataTable renders `data` as given rather than cutting it to
            // `pageSize`. That is what keeps a filtered view — five rows, say — showing all
            // five under a page size of ten instead of an empty second page.
            serverSidePagination
          />
        </div>
      </div>

      {/* Copy follows the reference dialog: a "Confirm to …" title, a body that names the
          thing in quotes and asks in plain words, and a destructive primary. `isOpen` is
          driven by the pending id, and the row name is read from `pendingRow` rather than
          held in its own state so the two cannot disagree. */}
      <ModalV2
        isOpen={pendingRow !== null}
        onClose={closeConfirm}
        title="Confirm to disable config"
        showCloseButton
        closeOnBackdropClick
        primaryAction={{
          text: 'Yes, Disable it',
          buttonType: ButtonV2Type.DANGER,
          onClick: confirmDisable,
        }}
        secondaryAction={{
          text: 'Cancel',
          buttonType: ButtonV2Type.SECONDARY,
          onClick: closeConfirm,
        }}
      >
        <PrimitiveText
          as="p"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[600]}
        >
          Are you sure you want to turn OFF the &ldquo;{pendingRow?.configurationName}&rdquo;
          config?
        </PrimitiveText>
      </ModalV2>
    </div>
  )
}

export default Configurator
