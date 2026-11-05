/**
 * Dials for the Fee Module's Pricing Rules page (src/pages/fee/index.tsx).
 *
 * `layout` is the version switch: one page, three layouts, so they can be compared on the
 * same ten rules rather than described. All three are drawn in Figma — 2268:7289, 2268:8499
 * and 2268:9641 — and each is built to its own frame rather than as a mode of the first.
 *
 * Adding a layout is two steps and no plumbing: add a row to `LAYOUTS` below, then a row to
 * `GRIDS` in index.tsx (or, for a layout that owns the whole page as the split view does, a
 * branch beside it). The switch, the bar, the persistence and the fallbacks already cover it,
 * and `GRIDS` is keyed by the layout type, so a forgotten row is a build error rather than a
 * version that silently draws the wrong screen.
 *
 * The two gaps are separate dials because the two grids were drawn with different rhythms —
 * 14px between tickets, 24px between cards — and one slider would have to be wrong for one
 * of them.
 *
 * The panel is persisted under a stable key, so the version you chose is still chosen after a
 * reload — the same bargain every other dial panel in this app makes (workflow-layout.ts).
 */

import { useDialKitController } from 'dialkit'
import { SHOW_DIALKIT } from '../../dev-tools'

/**
 * Which layout the page draws.
 *
 * `v1` — two columns of fee tickets, each with a tinted rate stub (FeeTicket.tsx).
 * `v2` — three columns of cards, no stub, the rate on its own line (FeeCard.tsx).
 * `v3` — a list of every rule beside the one you picked, opened (FeeSplit.tsx).
 */
export type FeeLayout = 'v1' | 'v2' | 'v3'

/**
 * `label` is for the dial's dropdown, which has room to say what a layout is. `short` is for
 * the floating bar on the page (VersionBar.tsx), which has room for about two words.
 */
export const LAYOUTS: { value: FeeLayout; label: string; short: string }[] = [
  { value: 'v1', label: 'Layout 1 — Ticket rows', short: 'Tickets' },
  { value: 'v2', label: 'Layout 2 — Card grid', short: 'Cards' },
  { value: 'v3', label: 'Layout 3 — Split view', short: 'Split' },
]

const DEFAULT_LAYOUT: FeeLayout = 'v1'

/**
 * Stable, so every visit shares one saved value — see workflow-layout.ts.
 *
 * The persist key carries a `-2` because the dials changed meaning: `cardGap` used to be the
 * gap between layout 1's tickets and is now layout 2's, with a different default. A browser
 * that had already stored 14 would have pinned the new grid to the old number, so the old
 * store is left behind rather than migrated. Bump it again if a dial's meaning moves again.
 */
const PANEL_ID = 'fee-layout'
const PERSIST_KEY = 'dialkit:fee-layout-2'

/** 14px, the gap Figma draws between layout 1's tickets both ways (653 → 667, 144 → 158). */
const DEFAULT_TICKET_GAP = 14
/** 24px, layout 2's (337.5 → 361.5, 203 → 227). */
const DEFAULT_CARD_GAP = 24
const GAP = { min: 0, max: 40, step: 2 }

type GapDial = [number, number, number, number]

const DIALS = {
  layout: { type: 'select' as const, options: LAYOUTS, default: DEFAULT_LAYOUT },
  ticketGap: [DEFAULT_TICKET_GAP, GAP.min, GAP.max, GAP.step] as GapDial,
  cardGap: [DEFAULT_CARD_GAP, GAP.min, GAP.max, GAP.step] as GapDial,
}

/** A stored select value if it is still one of the options, else the default. */
const pick = <T extends string>(stored: unknown, options: { value: T }[], fallback: T): T =>
  options.some(({ value }) => value === stored) ? (stored as T) : fallback

export function useFeeDials(): {
  layout: FeeLayout
  ticketGap: number
  cardGap: number
  setLayout: (next: FeeLayout) => void
} {
  const { values, setValue } = useDialKitController('Fee Layout', DIALS, {
    id: PANEL_ID,
    persist: { key: PERSIST_KEY },
  })

  /**
   * The floating bar writes back through the same dial rather than keeping a copy, so the two
   * controls cannot disagree: switch on the bar and the dial's dropdown moves with it.
   */
  const setLayout = (next: FeeLayout) => setValue('layout', next)

  // The layout is read from the store even with the dials hidden, because the bar on the page
  // is a visible control for it. The gaps are not — nothing outside the panel can change them,
  // so with the panel gone they fall back to their defaults rather than pinning a browser to
  // a number it can no longer edit.
  const layout = pick(values.layout, LAYOUTS, DEFAULT_LAYOUT)
  if (!SHOW_DIALKIT) {
    return { layout, ticketGap: DEFAULT_TICKET_GAP, cardGap: DEFAULT_CARD_GAP, setLayout }
  }
  // A stored value that is out of range falls back too.
  const gap = (stored: unknown, fallback: number) => {
    const value = Number(stored)
    return Number.isFinite(value) && value >= GAP.min && value <= GAP.max ? value : fallback
  }
  return {
    layout,
    ticketGap: gap(values.ticketGap, DEFAULT_TICKET_GAP),
    cardGap: gap(values.cardGap, DEFAULT_CARD_GAP),
    setLayout,
  }
}
