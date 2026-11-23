import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
  TooltipV2,
  TooltipV2Side,
  TagV2Color,
} from '@juspay/blend-design-system'
import {
  Check,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  LockOpen,
  Plus,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { toast } from 'sonner'
import { SLOT_ICON } from '../../icons'
import { PrimitiveText, font } from '../../primitives'
import { iconGhostButtonTokens, quietStatusTagTokens } from '../../theme'
import { STATUS_LABEL, type EntryStatus } from './data'
import { exportCsv, exportXlsx } from './export'
import type { LedgerRow } from './ledger'
import { ACTION_ICON_SIZE, LEDGER_TOASTER, STATUS_TAG, tagTextColor } from './table'
import type { LedgerActions } from './use-ledger'

const { colors } = FOUNDATION_THEME

/** The pieces both versions of the Ledger page draw the same way. */

/**
 * The page's title. No subtitle under it: the ledger switch now sits directly below and says
 * what the page holds better than a line of prose did.
 */
export function LedgerTitle() {
  return (
    <PrimitiveText
      as="h1"
      {...font(FOUNDATION_THEME.font.size.heading.lg)}
      color={colors.gray[900]}
      fontWeight={FOUNDATION_THEME.font.weight[600]}
    >
      Ledger Central
    </PrimitiveText>
  )
}

/**
 * CSV, Excel and New Entry — the exports write `rows`, which is what the table is showing.
 *
 * `showExports` is false on the Bank and comparison ledgers: exportCsv/exportXlsx write the
 * ledger's own twelve columns, which a bank line does not have. New Entry stays whatever is
 * on screen — posting an entry is a thing you do to the ledger, not to the view of it, and
 * it is most often what you want *because* of what the comparison just showed you.
 */
export function HeaderActions({
  rows,
  onNewEntry,
  showExports = true,
}: {
  rows: LedgerRow[]
  onNewEntry: () => void
  showExports?: boolean
}) {
  const handleExcel = () => {
    exportXlsx(rows).catch(() =>
      toast.error('The Excel export did not finish', {
        toasterId: LEDGER_TOASTER,
        description: 'Try again, or export as CSV instead.',
      }),
    )
  }

  return (
    <>
      {showExports && (
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
        </>
      )}
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
/**
 * A state as a tag: the word, a colour only where it is an exception, and no glyph.
 *
 * The one shape every state column on this page uses — Status, Recon Status, and Match on
 * the two bank ledgers. They are the same question asked of different things, so drawing
 * them three ways was three vocabularies for one idea.
 *
 * NEUTRAL is the quiet state and gets the token override; any other colour is an exception
 * and is left as Blend draws it. Keyed on the colour rather than on which state it is,
 * because NEUTRAL is exactly the slot quietStatusTagTokens moves — gray[950] to gray[700] —
 * so a non-neutral tag is unaffected by the provider and not worth one.
 */
export function StateTag({ text, color }: { text: string; color: TagV2Color }) {
  const tag = (
    <TagV2
      text={text}
      color={color}
      type={TagV2Type.SUBTLE}
      subType={TagV2SubType.ROUNDED}
      size={TagV2Size.SM}
    />
  )
  return color === TagV2Color.NEUTRAL ? (
    <ThemeProvider componentTokens={quietStatusTagTokens}>{tag}</ThemeProvider>
  ) : (
    tag
  )
}

export function StatusTag({ status }: { status: EntryStatus }) {
  return (
    <div className="flex justify-center whitespace-nowrap">
      <StateTag text={STATUS_LABEL[status]} color={STATUS_TAG[status]} />
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
 * None of the glyphs is colour-coded. They inherit the button's own gray[600], as every
 * other icon in the app's chrome does: a red X and a green tick in a quiet column read as
 * status rather than as the controls they are, and the row already says its status twice.
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
          // LockKeyhole against LockOpen, not Lock against LockOpen. The pair Blend's own
          // examples reach for differs only in whether the shackle is up or down, which at
          // 16px in a column of quiet glyphs is not a difference you can see without
          // comparing two rows. The keyhole gives the held state a second, larger difference
          // — a filled centre against an empty one — that reads at a glance.
          icon={
            isHeld ? <LockKeyhole size={ACTION_ICON_SIZE} /> : <LockOpen size={ACTION_ICON_SIZE} />
          }
          onClick={() => actions.openHold(row)}
        />
        {canReverse && (
          <RowAction
            label="Initiate reversal"
            icon={<Undo2 size={ACTION_ICON_SIZE} />}
            onClick={() => actions.startReversal(row)}
          />
        )}
        {row.status === 'IN_PROGRESS' && (
          <>
            <RowAction
              label="Mark completed"
              icon={<Check size={ACTION_ICON_SIZE} />}
              onClick={() => actions.setStatus(row.id, 'COMPLETED')}
            />
            <RowAction
              label="Mark failed"
              icon={<X size={ACTION_ICON_SIZE} />}
              onClick={() => actions.setStatus(row.id, 'FAILED')}
            />
          </>
        )}
      </ThemeProvider>
    </div>
  )
}
