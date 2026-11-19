/**
 * Dials for the Fee Module's Pricing Rules page (src/pages/fee/index.tsx).
 *
 * `layout` is the version switch: one page, five layouts, so they can be compared on the
 * same twenty rules rather than described. Four are drawn in Figma — 2268:7289, 2268:8499,
 * 2268:9641 and 2321:8333 — and each is built to its own frame rather than as a mode of the
 * first. The fifth is 2321:8333 again with its pager, which the frame explores and layout 4
 * does not take.
 *
 * The dial is the only way to change it. Paged tickets — layout 5 — is what the page is, and
 * the other four are alternatives kept for comparison rather than choices to put in front of a
 * reader, so they live in the panel with the rest of the design workbench, not on the page.
 *
 * Adding a layout is two steps and no plumbing: add a row to `LAYOUTS` below, then a row to
 * `GRIDS` in index.tsx (or, for a layout that owns the whole page as the split view does, a
 * branch beside it). The switch, the persistence and the fallbacks already cover it, and
 * `GRIDS` is keyed by the layout type, so a forgotten row is a build error rather than a
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
import { useState } from 'react'
import { SHOW_DIALKIT } from '../../dev-tools'

/**
 * Which layout the page draws.
 *
 * `v1` — two columns of fee tickets, each with a tinted rate stub (FeeTicket.tsx).
 * `v2` — three columns of cards, no stub, the rate on its own line (FeeCard.tsx).
 * `v3` — a list of every rule beside the one you picked, opened (FeeSplit.tsx).
 * `v4` — the ticket again, its body a list of scopes rather than a description (FeeGroup.tsx).
 * `v5` — layout 4 with a pager where the kebab sits, one method at a time (FeeGroup.tsx).
 */
export type FeeLayout = 'v1' | 'v2' | 'v3' | 'v4' | 'v5'

/** The dial's dropdown has room to say what each layout is, so the labels are the long form. */
const LAYOUTS: { value: FeeLayout; label: string }[] = [
  { value: 'v1', label: 'Layout 1 — Ticket rows' },
  { value: 'v2', label: 'Layout 2 — Card grid' },
  { value: 'v3', label: 'Layout 3 — Split view' },
  { value: 'v4', label: 'Layout 4 — Grouped tickets' },
  { value: 'v5', label: 'Layout 5 — Paged tickets' },
]

const DEFAULT_LAYOUT: FeeLayout = 'v5'

/**
 * Stable, so every visit shares one saved value — see workflow-layout.ts.
 *
 * The persist key carries a `-3` because a stored value beats `DEFAULT_LAYOUT`, so moving the
 * default is only half the change: a browser that had already chosen layout 1 would still open
 * on it, which is exactly what changing the default was meant to stop. The old store is left
 * behind rather than migrated. Two reasons to bump it again, then — a dial whose meaning moves
 * (`-2` was `cardGap` changing which grid it spaced), or a default that has to reach a browser
 * which has already stored the old one.
 */
const PANEL_ID = 'fee-layout'
const PERSIST_KEY = 'dialkit:fee-layout-3'

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

export function useFeeDials(): { layout: FeeLayout; ticketGap: number; cardGap: number } {
  const { values } = useDialKitController('Fee Layout', DIALS, {
    id: PANEL_ID,
    persist: { key: PERSIST_KEY },
  })
  // With the dials hidden, every stored value falls back to its default. Nothing on the page
  // can change them any more, so a browser that last chose the split view would otherwise be
  // pinned to it with no UI left to choose Tickets again.
  if (!SHOW_DIALKIT) {
    return { layout: DEFAULT_LAYOUT, ticketGap: DEFAULT_TICKET_GAP, cardGap: DEFAULT_CARD_GAP }
  }
  // A stored value that is no longer an option, or out of range, falls back too.
  const gap = (stored: unknown, fallback: number) => {
    const value = Number(stored)
    return Number.isFinite(value) && value >= GAP.min && value <= GAP.max ? value : fallback
  }
  return {
    layout: pick(values.layout, LAYOUTS, DEFAULT_LAYOUT),
    ticketGap: gap(values.ticketGap, DEFAULT_TICKET_GAP),
    cardGap: gap(values.cardGap, DEFAULT_CARD_GAP),
  }
}

// ─── The rule, opened (src/pages/fee/FeeTree.tsx) ────────────────────────────────────────

/**
 * Which way a rule's configuration tree grows.
 *
 * `down` — the merchant on top, each level a row under the last. Reads like an org chart:
 *   the shape of the configuration is legible before any of the detail is.
 * `right` — the merchant on the left, each level a column to its right. Reads like a file
 *   tree: it costs no horizontal room per level, so a deep rule stays on one screen.
 */
export type TreeDirection = 'down' | 'right'

/**
 * The same configuration, read as something other than a tree.
 *
 * These are not five layouts of the tree. A tree answers *what is the shape of this* and is
 * poor at the four questions people actually arrive with, so each of these is one of those
 * questions (fee-views.ts) — which is why they are named for what they let you do rather than
 * for how they are drawn.
 *
 * `table`    — every charge at once, searchable and sortable.  *What does X cost?*
 * `outline`  — the configuration top to bottom, nothing sideways. *What is all of it?*
 * `coverage` — the catalogue against this merchant's rules.    *What is NOT priced?*
 * `compare`  — two groups on one set of rows.                  *How do these two differ?*
 * `summary`  — the figures, then where they come from.         *What am I looking at?*
 */
export type FlatView = 'table' | 'outline' | 'coverage' | 'compare' | 'summary'

export type FeeView = TreeDirection | FlatView

/**
 * Its own panel rather than a dial on the Fee Layout one, because it belongs to a different
 * page — the panel appears where the thing it changes is.
 *
 * **Unlike every other dial in this app, this one is not the only way to change its value.**
 * The layouts on the Pricing Rules page are design alternatives, which is why they stay in
 * the workbench; these are seven readings of one configuration, and choosing between them is
 * the reader's job, not the designer's. So the page carries its own switcher (FeeTree.tsx)
 * and this panel mirrors it — one store, two controls, nothing to drift.
 *
 * Which is also why the labels are named rather than numbered like `LAYOUTS` above. A layout
 * number is a thing to point at in review; these have names the page itself uses, and a dial
 * reading "View 5" beside a tab reading "Coverage" would be two names for one thing.
 */
const VIEWS: { value: FeeView; label: string }[] = [
  { value: 'down', label: 'Tree — top to bottom' },
  { value: 'right', label: 'Tree — left to right' },
  { value: 'table', label: 'Table — every charge, searchable' },
  { value: 'outline', label: 'Outline — read it in order' },
  { value: 'coverage', label: 'Coverage — what is not priced' },
  { value: 'compare', label: 'Compare — two groups side by side' },
  { value: 'summary', label: 'Summary — the figures first' },
]

const DEFAULT_VIEW: FeeView = 'down'
const TREE_PANEL_ID = 'fee-tree'

/**
 * `-2` because the dial was renamed: it used to be `direction` with two options and is now
 * `view` with seven. A browser holding the old store would read `values.view` as undefined and
 * silently fall back anyway, so the bump buys clarity rather than correctness — the old key is
 * left behind rather than migrated, the same bargain the layout panel makes above.
 */
const TREE_PERSIST_KEY = 'dialkit:fee-tree-2'

const TREE_DIALS = {
  view: { type: 'select' as const, options: VIEWS, default: DEFAULT_VIEW },
}

/**
 * The view, and the one way to change it — whichever control the change came from.
 *
 * With the dials shown, the store is the state: the panel and the page's switcher both write
 * to it, so it persists and neither can disagree with the other. With them hidden the store
 * is unreadable (the dial would have nothing to read it back with), and the page's switcher
 * still has to work — so a plain `useState` stands in. The hook is created either way, since
 * hooks cannot be conditional, and the page is told nothing about which one it got.
 */
export function useFeeView(): { view: FeeView; setView: (next: FeeView) => void } {
  const { values, setValue } = useDialKitController('Fee Rule', TREE_DIALS, {
    id: TREE_PANEL_ID,
    persist: { key: TREE_PERSIST_KEY },
  })
  const [local, setLocal] = useState<FeeView>(DEFAULT_VIEW)
  if (!SHOW_DIALKIT) return { view: local, setView: setLocal }
  return {
    view: pick(values.view, VIEWS, DEFAULT_VIEW),
    setView: (next) => setValue('view', next),
  }
}
