/**
 * The pieces every PACB Recon page is built from — page frame, date range, stat tile,
 * status tag, table and column helpers.
 *
 * Kept in one file so a layout experiment is a change here rather than across four pages:
 * move the date range, restyle the tiles, or change how a status reads, and every page
 * follows.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  DataTable,
  DateFormatPreset,
  DateRangePicker,
  DateRangePickerSize,
  FOUNDATION_THEME,
  SnackbarV2Variant,
  StatCardV2,
  StatCardV2Variant,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
  ThemeProvider,
  TooltipV2,
  TooltipV2Size,
  addSnackbarV2,
  type DataTableProps,
  type DateRange,
} from '@juspay/blend-design-system'
import { Copy, X } from 'lucide-react'
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { PrimitiveText, font } from '../../primitives'
import {
  compactStatCardToneTokens,
  minimalStatCardToneTokens,
  statCardToneTokens,
  type StatTone,
} from '../../theme'
import { EMPTY } from './data'
import { formatRange } from './dates'
import { PANEL_SPACING, PANEL_STYLE, type PanelSpacing } from './helpers'

const { colors } = FOUNDATION_THEME

// ─── Page frame ──────────────────────────────────────────────────────────────────────────

/** Vertical rhythm of a PACB page, in px. A page with spacing dials passes its own. */
type PacbPageSpacing = {
  /** Above the title. */
  top: number
  /** Between the title row and each block under it. */
  gap: number
  /** Below the last block. */
  bottom: number
}

const PAGE_SPACING: PacbPageSpacing = { top: 24, gap: 24, bottom: 24 }

/**
 * Title on the left, the page's controls on the right, content below — the frame all three
 * pages share. Same width cap and gutters as the Configurator, so moving between modules
 * does not shift the page's left edge.
 */
export function PacbPage({
  title,
  actions,
  children,
  spacing = PAGE_SPACING,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
  spacing?: PacbPageSpacing
}) {
  return (
    <div
      className="mx-auto flex w-full max-w-[1440px] flex-col px-6"
      style={{ paddingTop: spacing.top, paddingBottom: spacing.bottom, gap: spacing.gap }}
    >
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <PrimitiveText
          as="h1"
          {...font(FOUNDATION_THEME.font.size.heading.md)}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {title}
        </PrimitiveText>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/** A section heading inside a page — the MPR tab's "Merchant Payment Report (MPR)". */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <PrimitiveText
      as="h2"
      {...font(FOUNDATION_THEME.font.size.heading.sm)}
      color={colors.gray[800]}
      fontWeight={FOUNDATION_THEME.font.weight[600]}
    >
      {children}
    </PrimitiveText>
  )
}

// ─── Range panel ─────────────────────────────────────────────────────────────────────────

/**
 * The range on a row of its own under the page title, then the panel it scopes: the
 * Payment Info Generator's layout 7, for any page whose figures and table share one range.
 * `toolbar` is the row — the range picker on the left, and anything given `ml-auto` sits at
 * the panel's right edge. The panel's children are spaced by `cardsToTable`.
 */
export function RangePanel({
  label,
  toolbar,
  children,
  spacing = PANEL_SPACING,
}: {
  /** The panel's accessible name — what it holds, and for which period. */
  label: string
  toolbar: ReactNode
  children: ReactNode
  spacing?: PanelSpacing
}) {
  return (
    <div className="flex flex-col" style={{ gap: spacing.toolbarToPanel }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{toolbar}</div>
      <section
        aria-label={label}
        className="flex flex-col overflow-hidden"
        style={{ ...PANEL_STYLE, padding: spacing.padding, gap: spacing.cardsToTable }}
      >
        {children}
      </section>
    </div>
  )
}

// ─── Date range ──────────────────────────────────────────────────────────────────────────

/** "Sep 1 – 30, 2026 · 30 days" — the module's one way of writing a range (dates.ts). */
const RANGE_FORMAT = {
  preset: DateFormatPreset.CUSTOM,
  customFormat: ({ startDate, endDate }: DateRange) => formatRange(startDate, endDate),
}

/**
 * The page-level range. V1 `DateRangePicker` because Blend ships no V2 (AGENTS.md rule 4).
 * Presets and time columns off, as in the download panel: one pill, days only.
 */
export function RangePicker({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  // The trigger fills its container, so the container is what sizes it — without this it
  // stretches across the header and pushes the page's buttons onto a line of their own.
  return (
    <div className="w-[272px] shrink-0">
      <DateRangePicker
        value={value}
        onChange={onChange}
        size={DateRangePickerSize.LARGE}
        formatConfig={RANGE_FORMAT}
        showDateTimePicker={false}
        showPresets={false}
      />
    </div>
  )
}

// ─── Stat tile ───────────────────────────────────────────────────────────────────────────

export type Stat = {
  title: string
  value: string
  /** A line under the value — StatCardV2's `subtitle`, shown from 1024px up only. */
  subtitle?: string
  tone?: StatTone
  icon?: ReactNode
  helpIconText?: string
  /**
   * A control in the card's top-right corner — StatCardV2's `actionIcon` slot. Blend drops
   * it below 1024px (`!isSmallScreen`, StatCardV2.tsx:178), so a caller whose action must
   * stay reachable has to offer it somewhere else at that width too.
   */
  action?: ReactNode
  /**
   * The figure without the card — StatCardV2's `showBorder={false}`, which drops the border,
   * shadow and padding together (StatCardV2.tsx:146-153) — sized to its content so several
   * can sit in a row. Implies `compact`.
   */
  bare?: boolean
  /** Makes the whole figure a button — Enter and Space as well as a click. */
  onClick?: () => void
  /**
   * The value at heading/lg/semiBold, 24/32, rather than Blend's 32/38. Always on for a bare
   * figure; opt-in for a card.
   */
  compact?: boolean
  /**
   * One step smaller again — value 18/24, label 12/18, tighter padding (StatCardSize in
   * src/theme.ts). Takes precedence over `compact`.
   */
  minimal?: boolean
  /**
   * The value above the title instead of below it, each keeping its own type and colour —
   * a reorder only (`.pacb-stat-value-first` in index.css). The card's accessible name is
   * still "title, value".
   */
  valueFirst?: boolean
}

/**
 * StatCardV2 in its NUMBER variant, with the value coloured by tone — see
 * statCardToneTokens in src/theme.ts for why that needs a scoped ThemeProvider.
 */
export function StatTile({
  title,
  value,
  tone = 'neutral',
  icon,
  helpIconText,
  subtitle,
  action,
  bare = false,
  onClick,
  compact = bare,
  minimal = false,
  valueFirst = false,
}: Stat) {
  const tokens = minimal
    ? minimalStatCardToneTokens
    : compact
      ? compactStatCardToneTokens
      : statCardToneTokens
  const card = (
    <ThemeProvider componentTokens={tokens[tone]}>
      <StatCardV2
        variant={StatCardV2Variant.NUMBER}
        title={title}
        value={value}
        // blend-gap: StatCardV2 renders `titleIcon` bare (StatCardV2.tsx:192) with no colour
        // of its own, so a lucide icon's `currentColor` resolved to black. Muted here to
        // gray[500] — a step darker than the title's gray[400], so the glyph holds its shape
        // at 16px without competing with the figure. An icon given its own `color` keeps it.
        titleIcon={
          icon && (
            <span className="inline-flex" style={{ color: colors.gray[500] }}>
              {icon}
            </span>
          )
        }
        helpIconText={helpIconText}
        subtitle={subtitle}
        actionIcon={action}
        showBorder={!bare}
        // Blend caps the card at 340px (statcardV2 token `maxWidth`); the parent decides the
        // width here — a grid column for a card, the content's own width for a bare figure.
        width={bare ? 'auto' : '100%'}
        maxWidth="100%"
        // StatCardV2 spreads its remaining props onto its root *after* its own
        // `role="region"` (StatCardV2.tsx:158-161), so these make the figure itself the
        // button — focusable, announced as one, its accessible name the card's own
        // "title, value" label — rather than wrapping a region in a <button>.
        {...(onClick && {
          role: 'button',
          tabIndex: 0,
          'aria-haspopup': 'dialog' as const,
          onClick: (event: MouseEvent<HTMLDivElement>) => {
            // The help icon is a tooltip trigger of its own; a click on it is a request
            // for the explanation, not for whatever this figure opens.
            if ((event.target as HTMLElement).closest('[data-element="help-icon"]')) return
            onClick()
          },
          onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onClick()
            }
          },
        })}
      />
    </ThemeProvider>
  )

  // StatCardV2 drops `className` and `style`, so everything here lives on a wrapper.
  // `pacb-stat-left` left-aligns the card's content, which Blend centres (index.css).
  const layout = valueFirst ? 'pacb-stat-left pacb-stat-value-first' : 'pacb-stat-left'
  if (!onClick) return <div className={layout}>{card}</div>

  // A clickable card also gets the affordance: the pointer, a hover state, and a focus ring
  // on the card that holds focus. On hover a card's border steps up to gray[300] and it
  // takes a gray[50] fill; a bare figure has neither to change, so its value dims instead.
  // `!` because the card's own styled-components class is unlayered and beats Tailwind's
  // utilities layer. Colours and timing come in as custom properties (rules 1 and 14).
  const hover = bare
    ? '[&:hover_[data-element=statcard-data]]:opacity-70'
    : '[&_[role=button]:hover]:!border-[var(--stat-hover-border)] [&_[role=button]:hover]:!bg-[var(--stat-hover-bg)]'
  return (
    <div
      className={`${layout} cursor-pointer ${hover} [&_[role=button]]:![transition:border-color_var(--stat-ms)_var(--stat-ease),background-color_var(--stat-ms)_var(--stat-ease)] [&_[role=button]]:rounded-lg [&_[role=button]:focus-visible]:outline-2 [&_[role=button]:focus-visible]:outline-offset-4 [&_[role=button]:focus-visible]:outline-[var(--stat-focus)] [&_[role=button]:focus-visible]:outline-solid`}
      style={
        {
          '--stat-focus': colors.primary[500],
          '--stat-hover-border': colors.gray[300],
          '--stat-hover-bg': colors.gray[50],
          '--stat-ms': `${MICRO_MS}ms`,
          '--stat-ease': FEEDBACK_EASING,
        } as CSSProperties
      }
    >
      {card}
    </div>
  )
}

/** Tiles in equal columns across the page — the Workflow and Escrow layout. */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <StatTile key={stat.title} {...stat} />
      ))}
    </div>
  )
}


// ─── Status tag ──────────────────────────────────────────────────────────────────────────

/**
 * What colour each status reads as. Written as one table so the same word is the same colour
 * on every page — STAGED is WARNING because the product draws it orange; that is a
 * candidate to revisit, and changing it here changes it everywhere.
 */
const STATUS_COLOR: Record<string, TagV2Color> = {
  PENDING: TagV2Color.WARNING,
  HOLD: TagV2Color.WARNING,
  STAGED: TagV2Color.WARNING,
  READY: TagV2Color.PRIMARY,
  CREATED: TagV2Color.PRIMARY,
  GENERATED: TagV2Color.SUCCESS,
  SUCCESS: TagV2Color.SUCCESS,
  FAILED: TagV2Color.ERROR,
}

/** Status → tag colour for one column, where the module-wide map reads wrong in context. */
export type StatusColors = Partial<Record<string, TagV2Color>>

export function StatusTag({ status, colors }: { status: string | null; colors?: StatusColors }) {
  if (!status) return <EmptyMark />
  return (
    <TagV2
      text={status}
      type={TagV2Type.SUBTLE}
      size={TagV2Size.XS}
      color={colors?.[status] ?? STATUS_COLOR[status] ?? TagV2Color.NEUTRAL}
    />
  )
}

const EmptyMark = () => (
  <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[400]}>
    {EMPTY}
  </PrimitiveText>
)

// ─── IDs in cells ────────────────────────────────────────────────────────────────────────

/** How much of each end of an ID stays on screen. */
export const ID_KEEP_CHARS = 10

/**
 * A long ID cut to its two ends — `6d634d0c-a…3d09c07d50` — with the whole ID in a tooltip.
 *
 * A fixed cut rather than one that follows the column width (the Configurator's
 * MiddleTruncate): IDs are compared by their ends, and the same number of characters on
 * every row keeps those ends in the same place down the column. Because the cut is always
 * there, the tooltip always is too. Short values are drawn whole, with no tooltip.
 *
 * TooltipV2, not V1 (AGENTS.md rule 4). The full ID also lives in `aria-label`, so a
 * screen reader reads the ID rather than two fragments and an ellipsis.
 */
export function TruncatedId({ value, keep = ID_KEEP_CHARS }: { value: string; keep?: number }) {
  if (value.length <= keep * 2 + 1) return <>{value}</>
  return (
    <TooltipV2 content={value} size={TooltipV2Size.SM} maxWidth="none">
      <span aria-label={value} className="whitespace-nowrap">
        {value.slice(0, keep)}…{value.slice(-keep)}
      </span>
    </TooltipV2>
  )
}

/**
 * An ID with a copy glyph at the end of its cell: IDs, UTRs and file UUIDs are too long to retype, and one
 * cut in the middle cannot be selected whole, so the button is the way to take it elsewhere.
 * `truncate` cuts it to its ends (TruncatedId); off, it is drawn whole, for columns already
 * wide enough to hold it.
 *
 * An empty value is the empty mark alone — nothing to copy, so no button.
 *
 * SECONDARY + INLINE — the link button in grey rather than primary, so a glyph repeated down
 * every row reads as a utility, not a call to action. Its click stops at the button: on the
 * tables whose rows open something, the row behind it would otherwise open too.
 */
export function CopyableId({
  value,
  label,
  truncate = true,
}: {
  value: string
  label: string
  truncate?: boolean
}) {
  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => addSnackbarV2({ header: `${label} copied`, variant: SnackbarV2Variant.SUCCESS }),
      () =>
        addSnackbarV2({
          header: `Couldn't copy the ${label}`,
          description: 'The browser blocked clipboard access.',
          variant: SnackbarV2Variant.ERROR,
        }),
    )
  if (!value || value === EMPTY) return <>{EMPTY}</>
  // The full cell width with the glyph pushed to its end, so the glyphs down a column share
  // one keyline. Placed straight after the text they would follow each value's width, and in
  // a proportional face no two IDs are the same width.
  return (
    <span className="flex w-full items-center justify-between gap-1.5">
      {truncate ? <TruncatedId value={value} /> : <span className="whitespace-nowrap">{value}</span>}
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        subType={ButtonV2SubType.INLINE}
        size={ButtonV2Size.SMALL}
        leftSlot={{ slot: <Copy size={14} />, maxHeight: 14 }}
        aria-label={`Copy ${label}`}
        onClick={(event) => {
          event.stopPropagation()
          void copy()
        }}
      />
    </span>
  )
}

// ─── Full-bleed ──────────────────────────────────────────────────────────────────────────

/**
 * TEMPORARY (2026-10-01) — lets a wide table out of the page's 1440px column to span the
 * whole content area beside the sidebar, 24px in from each edge. Flip to `false` to put every
 * table back in the column; nothing else changes.
 */
export const FULL_BLEED_TABLES = true

/**
 * Widens its child to the content area's width, centred on it. The page column is centred in
 * that area (PacbPage's `mx-auto`), so the negative margin is half the difference between the
 * two. `100cqw` is the content area's width — `.pacb-full-bleed` in index.css makes it a size
 * container while one of these is on the page. A literal 100vw would run under the sidebar.
 */
export function FullBleed({ children }: { children: ReactNode }) {
  if (!FULL_BLEED_TABLES) return <>{children}</>
  return (
    <div className="pacb-full-bleed w-[calc(100cqw-48px)] ml-[calc((100%-(100cqw-48px))/2)]">
      {children}
    </div>
  )
}

// ─── Selection bar ───────────────────────────────────────────────────────────────────────

/**
 * The actions for the rows ticked in a table, drawn above the table rather than over it.
 *
 * blend-gap: DataTable's own BulkActionBar is positioned absolutely inside the table's
 * scroll box (DataTable.tsx:1585, BulkActionBar.tsx:200), which clips anything placed
 * outside it, and the bar is not exported from the package — so it can only ever sit over
 * the rows. This is the same bar composed from Blend parts, outside: the count, the actions,
 * and Deselect all at the far end. Same gray[700] fill and white count as the one it replaces.
 *
 * Rendered only while something is ticked, like Blend's.
 */
export function SelectionBar({
  count,
  actions,
  onClear,
}: {
  count: number
  actions?: ReactNode
  onClear: () => void
}) {
  return (
    <div
      role="region"
      aria-label={`${count} ${count === 1 ? 'row' : 'rows'} selected`}
      className="flex flex-wrap items-center gap-3 px-4 py-2"
      style={{ backgroundColor: colors.gray[700], borderRadius: FOUNDATION_THEME.border.radius[12] }}
    >
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[0]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        {count} selected
      </PrimitiveText>
      {actions}
      <div className="ml-auto">
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Deselect all"
          leftSlot={{ slot: <X size={14} />, maxHeight: 14 }}
          onClick={onClear}
        />
      </div>
    </div>
  )
}

// ─── Amounts in cells ────────────────────────────────────────────────────────────────────

/**
 * A money value in a table cell: ₹, right-aligned, tabular figures so the digits line up
 * down the column and the decimal points stack.
 *
 * Aligned here rather than on the column because DataTable offers no way to: the column's
 * `className` is typed but never applied, the body cell is hard-coded `text-align: left`
 * (TableBody/index.tsx:94), and header alignment is one token for every column. So the
 * header label stays left while the figures sit right.
 */
export function AmountCell({
  children,
  negative = false,
  strong = false,
}: {
  children: ReactNode
  /** A deduction: drawn with a leading minus, outside the ₹. */
  negative?: boolean
  /** A total: 600, so it reads as the answer rather than one more part. */
  strong?: boolean
}) {
  return (
    <span
      className="block w-full text-right tabular-nums"
      style={strong ? { fontWeight: FOUNDATION_THEME.font.weight[600] } : undefined}
    >
      {negative && '−'}₹{children}
    </span>
  )
}

// ─── Icon actions in cells ───────────────────────────────────────────────────────────────

/**
 * A single glyph in a table cell — download, upload. PRIMARY + INLINE is Blend's link
 * button: no fill, no padding, primary-coloured. The label goes to `aria-label`, since
 * there is no text on screen to name it.
 */
export function CellAction({
  icon,
  label,
  text,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  text?: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <ButtonV2
      buttonType={ButtonV2Type.PRIMARY}
      subType={ButtonV2SubType.INLINE}
      size={ButtonV2Size.SMALL}
      leftSlot={{ slot: icon, maxHeight: 16 }}
      text={text}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        // Cells sit inside clickable rows on some tables; the glyph is its own action.
        event.stopPropagation()
        onClick?.()
      }}
    />
  )
}

type Row = Record<string, unknown>

/**
 * DataTable with the defaults every PACB table shares. The column manager and bulk bar are
 * off: these tables' actions live in their section header, not in a bar that appears under
 * the selection.
 */
/**
 * DataTable is a `forwardRef`, which erases its row generic — the export is typed for
 * `Record<string, unknown>` rows, so a typed row's columns would not check against it. This
 * restores the generic; nothing about the runtime changes.
 */
const TypedDataTable = DataTable as unknown as <T extends Row>(
  props: DataTableProps<T>,
) => ReactElement

/**
 * The whole checkbox cell selects, not only the 16px box in it.
 *
 * blend-gap: DataTable's checkbox fills a fraction of its 52px cell (TableBody), and a
 * click on the rest of the cell is a click on the row — on a table with `onRowClick`, that
 * opens the detail sheet when the user was aiming for the box. Clicks that land in the
 * cell but miss the box are stopped before the row sees them and handed to the box.
 * The header's select-all cell gets the same.
 */
function selectFromCell(event: MouseEvent<HTMLDivElement>) {
  const target = event.target as Element
  if (target.closest('[role="checkbox"]')) return
  const cell = target.closest('tbody td:first-child, thead th:first-child')
  const box = cell?.querySelector<HTMLElement>('[role="checkbox"]')
  if (!box) return
  event.stopPropagation()
  box.click()
}

export function PacbTable<T extends Row>(props: DataTableProps<T>) {
  const table = (
    <TypedDataTable<T>
      enableColumnManager={false}
      enableColumnReordering={false}
      showBulkActionBar={false}
      showFooter={Boolean(props.pagination)}
      {...props}
    />
  )
  if (!props.enableRowSelection) return table
  // `contents`, so the wrapper adds no box of its own to the layout.
  return (
    <div
      className="contents [&_tbody_td:first-child]:cursor-pointer [&_thead_th:first-child]:cursor-pointer"
      onClickCapture={selectFromCell}
    >
      {table}
    </div>
  )
}
