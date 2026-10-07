/**
 * The PACB Recon module's pages, in nav order. The sidebar (src/layout/navigation.tsx) and
 * the router (src/router.tsx) both read this list, so a page cannot be linked without being
 * routed or routed without being linked.
 *
 * `label` is also the sidebar item's identity — Blend's NavbarItem has no `id` in 0.0.37 —
 * so keep them unique.
 */
export const PACB_BASE_PATH = '/pacb'

export type PacbRoute = { label: string; path: string }

export const PACB_ROUTES: PacbRoute[] = [
  { label: 'LRS Files', path: `${PACB_BASE_PATH}/lrs-files` },
  // Labelled by the page it opens, Payment Info Generator (formerly Recon Summary). The path
  // keeps the module's original name for it, so existing links and the PACB branch landing
  // (vite.config.ts) still resolve.
  { label: 'Payment Info Generator', path: `${PACB_BASE_PATH}/generate-payment-info` },
  {
    label: 'Escrow to OCA Fund Movement',
    path: `${PACB_BASE_PATH}/escrow-to-oca-fund-movement`,
  },
  { label: 'PACB Workflow', path: `${PACB_BASE_PATH}/workflow` },
  // A scratch copy of the workflow page to tinker with (PacbWorkflowSandbox.tsx).
  { label: 'PACB Workflow (Sandbox)', path: `${PACB_BASE_PATH}/workflow-sandbox` },
]
