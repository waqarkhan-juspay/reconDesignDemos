/**
 * The PACB Recon module's pages, in nav order. The sidebar (src/layout/navigation.tsx) and
 * the router (src/router.tsx) both read this list, so a page cannot be linked without being
 * routed or routed without being linked.
 *
 * `label` is also the sidebar item's identity — Blend's NavbarItem has no `id` in 0.0.37 —
 * so keep them unique.
 *
 * `description` is the page's subtitle under its title (PacbPage), one line saying what the
 * page is for. Written here so a new page cannot ship without one.
 */
export const PACB_BASE_PATH = '/pacb'

export type PacbRoute = {
  label: string
  path: string
  description: string
}

export const PACB_ROUTES: PacbRoute[] = [
  {
    label: 'LRS Files',
    path: `${PACB_BASE_PATH}/lrs-files`,
    description: 'Remittance files exchanged with the bank under the LRS, by day.',
  },
  // Labelled by the page it opens, Payment Info Generator (formerly Recon Summary). The path
  // keeps the module's original name for it, so existing links still resolve.
  {
    label: 'Payment Info Generator',
    path: `${PACB_BASE_PATH}/generate-payment-info`,
    description: 'Reconciled settlements, marked ready and turned into payment instructions.',
  },
  {
    label: 'Escrow to OCA Fund Movement',
    path: `${PACB_BASE_PATH}/escrow-to-oca-fund-movement`,
    description: 'What moved from escrow to the OCA account in the period, and what is waiting.',
  },
  // PacbWorkflowSandbox.tsx — built in the workbench as a sandbox, hence the file's name.
  {
    label: 'PACB Workflow',
    path: `${PACB_BASE_PATH}/workflow`,
    description: 'Settlements and their merchant payouts, from escrow to the payment report.',
  },
]

/** A PACB route's subtitle, by its label — for a page that draws its own title. */
export const routeDescription = (label: string) =>
  PACB_ROUTES.find((route) => route.label === label)?.description ?? ''
