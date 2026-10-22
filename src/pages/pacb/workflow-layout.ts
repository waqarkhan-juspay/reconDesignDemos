import { useDialKitController } from 'dialkit'
import { SHOW_DIALKIT } from '../../dev-tools'
import type { SettlementCardLook } from './settlement-card-looks'

/**
 * Dials for the PACB Workflow sandbox (PacbWorkflowSandbox.tsx).
 *
 * `view`    — which page the sandbox shows. `current` (the default) is the page the rest of
 *             these dials tune; `v3` is "Version 3", a fresh view built from scratch
 *             (PacbWorkflowV3.tsx), which the other dials do not reach.
 *
 * `v3Card`  — Version 3 only: how its settlement cards sit on the page at rest
 *             (settlement-card-looks.ts). `plain`, the design as drawn, is
 *             the default.
 *
 * `footer`  — every settlement card keeps its footer: merchant payments on the left, where
 *             the payouts are on the right. The default.
 * `compact` — a green (all successful) card drops that footer. Nothing is left to act on, so
 *             it shrinks to its ID, amount, UTR and date; the cards that still need attention
 *             keep theirs and stand out by it.
 *
 * `columns` — what a settlement click does to the page.
 *             `side-by-side` (the default): the payments open as a column beside the list.
 *             `drill-in`: the payments replace the list, under a back button and the
 *             settlement's ID where "All Settlements" was — one column fewer, so the payment
 *             detail gets the room.
 *
 * `cardGap` — the vertical space between settlement cards in a day's group, in px. 12 by
 *             default, picked on the dial on 2026-10-09 (the list had 16 before).
 */
export type WorkflowView = 'current' | 'v3'

const VIEWS: { value: WorkflowView; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'v3', label: 'Version 3' },
]

const DEFAULT_VIEW: WorkflowView = 'current'

const V3_CARDS: { value: SettlementCardLook; label: string }[] = [
  { value: 'plain', label: 'Version 1 — Plain (as designed)' },
  { value: 'divided', label: 'Version 2 — Divider lines' },
  { value: 'outlined', label: 'Version 3 — Outlined cards' },
  { value: 'tinted', label: 'Version 4 — Tinted cards' },
  { value: 'dot', label: 'Version 5 — Status dot' },
  { value: 'amount', label: 'Version 6 — Amount first' },
  { value: 'progress', label: 'Version 7 — Progress bar' },
  { value: 'rail', label: 'Version 8 — Status rail' },
  { value: 'compact', label: 'Version 9 — Compact row' },
  { value: 'split', label: 'Version 10 — Split status' },
  { value: 'tag', label: 'Version 11 — Tag header' },
]

const DEFAULT_V3_CARD: SettlementCardLook = 'plain'

export type SuccessCardStyle = 'footer' | 'compact'

const SUCCESS_CARDS: { value: SuccessCardStyle; label: string }[] = [
  { value: 'footer', label: 'Version 1 — With footer' },
  { value: 'compact', label: 'Version 2 — Without footer' },
]

const DEFAULT_SUCCESS_CARD: SuccessCardStyle = 'footer'

export type ColumnsStyle = 'side-by-side' | 'drill-in'

const COLUMNS: { value: ColumnsStyle; label: string }[] = [
  { value: 'side-by-side', label: 'Version 1 — Side by side' },
  { value: 'drill-in', label: 'Version 2 — Drill in' },
]

const DEFAULT_COLUMNS: ColumnsStyle = 'side-by-side'

/** Stable, so every visit shares one saved value — see recon-summary-layout.ts. */
const PANEL_ID = 'pacb-workflow-layout'
const PERSIST_KEY = 'dialkit:pacb-workflow-layout'

const DEFAULT_CARD_GAP = 12
const CARD_GAP = { min: 0, max: 40, step: 2 }

const DIALS = {
  view: { type: 'select' as const, options: VIEWS, default: DEFAULT_VIEW },
  v3Card: { type: 'select' as const, options: V3_CARDS, default: DEFAULT_V3_CARD },
  successCard: { type: 'select' as const, options: SUCCESS_CARDS, default: DEFAULT_SUCCESS_CARD },
  columns: { type: 'select' as const, options: COLUMNS, default: DEFAULT_COLUMNS },
  cardGap: [DEFAULT_CARD_GAP, CARD_GAP.min, CARD_GAP.max, CARD_GAP.step] as [
    number,
    number,
    number,
    number,
  ],
}

/** A stored select value if it is still one of the options, else the default. */
const pick = <T extends string>(stored: unknown, options: { value: T }[], fallback: T): T =>
  options.some(({ value }) => value === stored) ? (stored as T) : fallback

export function useWorkflowDials(): {
  view: WorkflowView
  v3Card: SettlementCardLook
  successCard: SuccessCardStyle
  columns: ColumnsStyle
  cardGap: number
} {
  const { values } = useDialKitController('PACB Workflow', DIALS, {
    id: PANEL_ID,
    persist: { key: PERSIST_KEY },
  })
  // With the dials hidden, every stored value falls back to its default.
  if (!SHOW_DIALKIT) {
    return {
      view: DEFAULT_VIEW,
      v3Card: DEFAULT_V3_CARD,
      successCard: DEFAULT_SUCCESS_CARD,
      columns: DEFAULT_COLUMNS,
      cardGap: DEFAULT_CARD_GAP,
    }
  }
  // A stored value that is no longer an option, or out of range, falls back too.
  const gap = Number(values.cardGap)
  const gapKnown = Number.isFinite(gap) && gap >= CARD_GAP.min && gap <= CARD_GAP.max
  return {
    view: pick(values.view, VIEWS, DEFAULT_VIEW),
    v3Card: pick(values.v3Card, V3_CARDS, DEFAULT_V3_CARD),
    successCard: pick(values.successCard, SUCCESS_CARDS, DEFAULT_SUCCESS_CARD),
    columns: pick(values.columns, COLUMNS, DEFAULT_COLUMNS),
    cardGap: gapKnown ? gap : DEFAULT_CARD_GAP,
  }
}
