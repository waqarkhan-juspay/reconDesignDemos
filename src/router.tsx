import type { ReactNode } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'
import App from './App.tsx'
import About from './pages/About.tsx'
import Alerts from './pages/alerts'
import Blend from './pages/Blend.tsx'
import Configurator from './pages/Configurator.tsx'
import CreateReportConfig from './pages/create-report-config'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'
import EscrowToOca from './pages/pacb/EscrowToOca.tsx'
import { PacbPage } from './pages/pacb/kit'
import PacbWorkflow from './pages/pacb/PacbWorkflow.tsx'
import PacbWorkflowSandbox from './pages/pacb/PacbWorkflowSandbox.tsx'
import ReconSummary from './pages/pacb/ReconSummary.tsx'
import { PACB_ROUTES } from './pages/pacb/routes.ts'
import { PLAYGROUND_ROUTES } from './pages/playground/routes.ts'
import FormUploads from './pages/playground/FormUploads.tsx'
import PaymentCards from './pages/playground/PaymentCards.tsx'
import SettlementCards from './pages/playground/SettlementCards.tsx'
import { ALERTS_PATH, CONFIGURATOR_PATH, HOME_PATH } from './layout/navigation.tsx'

/** PACB pages by their nav label — the label is the route's identity (src/pages/pacb/routes.ts). */
const PACB_PAGES: Record<string, ReactNode> = {
  'Payment Info Generator': <ReconSummary />,
  'Escrow to OCA Fund Movement': <EscrowToOca />,
  'PACB Workflow (v1)': <PacbWorkflow />,
  'PACB Workflow': <PacbWorkflowSandbox />,
}

/** Playground pages by their nav label (src/pages/playground/routes.ts). */
const PLAYGROUND_PAGES: Record<string, ReactNode> = {
  'Settlement Cards': <SettlementCards />,
  'Payment Card': <PaymentCards />,
  'Form 145/146': <FormUploads />,
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      // The app lands on the Configurator — or, on a branch with a module in progress, on
      // that module (BRANCH_LANDING in vite.config.ts). `replace` so the root never enters
      // history — otherwise Back from the landing page returns to `/` and immediately
      // redirects forward again, trapping the user.
      { index: true, element: <Navigate to={__BRANCH_LANDING__ ?? CONFIGURATOR_PATH} replace /> },
      { path: HOME_PATH.slice(1), element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'blend', element: <Blend /> },
      { path: CONFIGURATOR_PATH.slice(1), element: <Configurator /> },
      { path: ALERTS_PATH.slice(1), element: <Alerts /> },
      // A PACB route with no page of its own yet (LRS Files) falls back to the placeholder.
      ...PACB_ROUTES.map(({ label, path }) => ({
        path: path.slice(1),
        element: PACB_PAGES[label] ?? <PacbPage title={label} />,
      })),
      ...PLAYGROUND_ROUTES.map(({ label, path }) => ({
        path: path.slice(1),
        element: PLAYGROUND_PAGES[label] ?? <PacbPage title={label} />,
      })),
    ],
  },
  // Deliberately a sibling of the shell route, not a child: this flow is a full-screen
  // takeover (AGENTS.md rule 8), so it must render without SidebarV2 around it.
  {
    path: '/configurator/create',
    element: <CreateReportConfig />,
    errorElement: <NotFound />,
  },
])
