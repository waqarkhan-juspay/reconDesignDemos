/**
 * The PACB Workflow's layout choices (PacbWorkflowSandbox.tsx). The design workbench tunes
 * these on DialKit; this build has no dials, so each is fixed at the one the design settled on.
 *
 * `successCard` — `footer`: every settlement card keeps its footer, the payment count on the
 *                 left and where the payouts are on the right. (`compact` drops it from green
 *                 cards.)
 * `columns`     — `side-by-side`: a settlement click opens its payments as a column beside
 *                 the list. (`drill-in` replaces the list with them.)
 * `cardGap`     — 12px between settlement cards in a day's group.
 */
export type SuccessCardStyle = 'footer' | 'compact'

export type ColumnsStyle = 'side-by-side' | 'drill-in'

const WORKFLOW_DIALS: { successCard: SuccessCardStyle; columns: ColumnsStyle; cardGap: number } = {
  successCard: 'footer',
  columns: 'side-by-side',
  cardGap: 12,
}

export function useWorkflowDials() {
  return WORKFLOW_DIALS
}
