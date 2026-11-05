/**
 * The Pricing Rules page's layout choices (src/pages/fee/index.tsx).
 *
 * The design workbench tunes the spacing on DialKit; this build has no dials, so each gap is
 * fixed at the one the design settled on.
 *
 * The layout itself is not a dial. It is switched from the bar at the bottom of the page
 * (VersionBar.tsx), so it stays state the page owns — the one thing here that a reader of
 * this build can still change.
 *
 * `ticketGap` — 14px between layout 1's tickets, both ways (Figma 653 → 667, 144 → 158).
 * `cardGap`   — 24px between layout 2's cards (337.5 → 361.5, 203 → 227).
 */

import { useState } from 'react'

/**
 * Which layout the page draws.
 *
 * `v1` — two columns of fee tickets, each with a tinted rate stub (FeeTicket.tsx).
 * `v2` — three columns of cards, no stub, the rate on its own line (FeeCard.tsx).
 * `v3` — a list of every rule beside the one you picked, opened (FeeSplit.tsx).
 */
export type FeeLayout = 'v1' | 'v2' | 'v3'

/**
 * `label` is the long form, for a control with room to say what a layout is. `short` is for
 * the floating bar on the page, which has room for about two words.
 */
export const LAYOUTS: { value: FeeLayout; label: string; short: string }[] = [
  { value: 'v1', label: 'Layout 1 — Ticket rows', short: 'Tickets' },
  { value: 'v2', label: 'Layout 2 — Card grid', short: 'Cards' },
  { value: 'v3', label: 'Layout 3 — Split view', short: 'Split' },
]

const DEFAULT_LAYOUT: FeeLayout = 'v1'

const GAPS = { ticketGap: 14, cardGap: 24 }

export function useFeeDials(): {
  layout: FeeLayout
  ticketGap: number
  cardGap: number
  setLayout: (next: FeeLayout) => void
} {
  const [layout, setLayout] = useState<FeeLayout>(DEFAULT_LAYOUT)
  return { layout, setLayout, ...GAPS }
}
