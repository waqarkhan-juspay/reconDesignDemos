import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  SnackbarV2Variant,
  TagV2,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
  TooltipV2,
  TooltipV2Side,
  addSnackbarV2,
  type TagV2Color,
} from '@juspay/blend-design-system'
import {
  Check,
  FileSpreadsheet,
  FileText,
  Lock,
  LockOpen,
  Plus,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { SLOT_ICON } from '../../icons'
import { PrimitiveText, font } from '../../primitives'
import { iconGhostButtonTokens } from '../../theme'
import { STATUS_LABEL, type EntryStatus } from './data'
import { exportCsv, exportXlsx } from './export'
import type { LedgerRow } from './ledger'
import { ACTION_ICON_SIZE, STATUS_TAG, tagTextColor } from './table'
import type { LedgerActions } from './use-ledger'

const { colors } = FOUNDATION_THEME

/** The pieces both versions of the Ledger page draw the same way. */

/** The page's title and the line under it. */
export function LedgerTitle({ gap }: { gap: number }) {
  return (
    <div className="flex flex-col" style={{ gap }}>
      <PrimitiveText
        as="h1"
        {...font(FOUNDATION_THEME.font.size.heading.lg)}
        color={colors.gray[900]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        Ledger Central
      </PrimitiveText>
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
        Clearing, Reconciliation &amp; Settlements Module
      </PrimitiveText>
    </div>
  )
}

/** CSV, Excel and New Entry — the exports write `rows`, which is what the table is showing. */
export function HeaderActions({
  rows,
  onNewEntry,
}: {
  rows: LedgerRow[]
  onNewEntry: () => void
}) {
  const handleExcel = () => {
    exportXlsx(rows).catch(() =>
      addSnackbarV2({
        header: 'The Excel export did not finish',
        description: 'Try again, or export as CSV instead.',
        variant: SnackbarV2Variant.ERROR,
      }),
    )
  }

  return (
    <>
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        text="CSV"
        aria-label="Export as CSV"
        leftSlot={{ slot: <FileText size={14} /> }}
        onClick={() => exportCsv(rows)}
      />
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        text="Excel"
        aria-label="Export as Excel"
        leftSlot={{ slot: <FileSpreadsheet size={14} /> }}
        onClick={handleExcel}
      />
      <ButtonV2
        buttonType={ButtonV2Type.PRIMARY}
        size={ButtonV2Size.SMALL}
        text="New Entry"
        leftSlot={{ slot: <Plus size={14} /> }}
        onClick={onNewEntry}
      />
    </>
  )
}

/** A small tag with an optional icon tinted to its label. */
export function EntryTag({
  text,
  color,
  Icon,
}: {
  text: string
  color: TagV2Color
  Icon?: LucideIcon
}) {
  return (
    <TagV2
      text={text}
      color={color}
      type={TagV2Type.SUBTLE}
      subType={TagV2SubType.SQUARICAL}
      size={TagV2Size.XS}
      leftSlot={Icon ? { slot: <Icon {...SLOT_ICON} color={tagTextColor(color)} /> } : undefined}
    />
  )
}

/**
 * A tag with something more to say on hover — why funds are held, what reversed an entry.
 * The span is focusable and carries the same words, so the reason is not hover-only.
 */
export function TagWithNote({ note, children }: { note: string; children: ReactElement }) {
  return (
    <TooltipV2 content={note} side={TooltipV2Side.TOP}>
      <span tabIndex={0} aria-label={note} className="inline-flex cursor-help">
        {children}
      </span>
    </TooltipV2>
  )
}

/** The status pill. nowrap: the column hugs its content, and "In Progress" would otherwise
 * break inside its own tag on a narrow screen. */
export function StatusTag({ status }: { status: EntryStatus }) {
  const { color, Icon } = STATUS_TAG[status]
  return (
    <div className="flex justify-center whitespace-nowrap">
      <TagV2
        text={STATUS_LABEL[status]}
        color={color}
        type={TagV2Type.SUBTLE}
        subType={TagV2SubType.ROUNDED}
        size={TagV2Size.SM}
        leftSlot={{
          slot: (
            <Icon
              {...SLOT_ICON}
              color={tagTextColor(color)}
              // The prototype's spinner, kept for anyone who has not asked the OS for less
              // motion.
              className={status === 'IN_PROGRESS' ? 'motion-safe:animate-spin' : undefined}
            />
          ),
        }}
      />
    </div>
  )
}

/**
 * One of a row's icon actions, named by its tooltip.
 *
 * A ghost — secondary INLINE with no text, under iconGhostButtonTokens — rather than
 * IconButton: 32px and borderless, so a column of them reads as quiet actions beside the
 * row's figures rather than a stack of boxes (the Alerts row actions' reasoning). The
 * `aria-label` is the tooltip's words, so a screen reader and a pointer get the same name.
 */
function RowAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <TooltipV2 content={label} side={TooltipV2Side.TOP}>
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        subType={ButtonV2SubType.INLINE}
        size={ButtonV2Size.SMALL}
        leftSlot={{ slot: icon }}
        aria-label={label}
        onClick={onClick}
      />
    </TooltipV2>
  )
}

/**
 * A row's actions. Hold first, because every row has it: it stays in one place down the
 * column and the actions only some rows have follow it.
 *
 * 4px apart — the buttons are borderless, so each one's 8px of padding already spaces the
 * glyphs; a wider gap split the row's actions into separate islands.
 */
export function RowActions({ row, actions }: { row: LedgerRow; actions: LedgerActions }) {
  const isHeld = row.holdAmount > 0
  const canReverse =
    row.status === 'COMPLETED' && !row.reversedByEntryId && row.entryType !== 'Reversal'
  return (
    <div className="flex items-center gap-1">
      <ThemeProvider componentTokens={iconGhostButtonTokens}>
        <RowAction
          label={isHeld ? 'Manage hold' : 'Place on hold'}
          icon={
            isHeld ? (
              <Lock size={ACTION_ICON_SIZE} color={colors.purple[600]} />
            ) : (
              <LockOpen size={ACTION_ICON_SIZE} />
            )
          }
          onClick={() => actions.openHold(row)}
        />
        {canReverse && (
          <RowAction
            label="Initiate reversal"
            icon={<Undo2 size={ACTION_ICON_SIZE} color={colors.primary[600]} />}
            onClick={() => actions.startReversal(row)}
          />
        )}
        {row.status === 'IN_PROGRESS' && (
          <>
            <RowAction
              label="Mark completed"
              icon={<Check size={ACTION_ICON_SIZE} color={colors.green[600]} />}
              onClick={() => actions.setStatus(row.id, 'COMPLETED')}
            />
            <RowAction
              label="Mark failed"
              icon={<X size={ACTION_ICON_SIZE} color={colors.red[600]} />}
              onClick={() => actions.setStatus(row.id, 'FAILED')}
            />
          </>
        )}
      </ThemeProvider>
    </div>
  )
}
