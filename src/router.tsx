import { Navigate, createBrowserRouter } from 'react-router'
import App from './App.tsx'
import Alerts from './pages/alerts'
import Configurator from './pages/Configurator.tsx'
import CreateReportConfig from './pages/create-report-config'
import Ledger from './pages/ledger'
import LedgerV1 from './pages/ledger/LedgerV1.tsx'
import LedgerV2 from './pages/ledger/LedgerV2.tsx'
import NotFound from './pages/NotFound.tsx'
import {
  ALERTS_PATH,
  CONFIGURATOR_PATH,
  LEDGER_PATH,
  LEDGER_V2_PATH,
} from './layout/navigation.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      // The app lands on the Configurator. `replace` so the root never enters history —
      // otherwise Back from the Configurator returns to `/` and immediately redirects
      // forward again, trapping the user.
      { index: true, element: <Navigate to={CONFIGURATOR_PATH} replace /> },
      { path: CONFIGURATOR_PATH.slice(1), element: <Configurator /> },
      { path: ALERTS_PATH.slice(1), element: <Alerts /> },
      // A layout route: Ledger holds the entries and the dialogs, and the version renders
      // into its Outlet. Moving between v1 and v2 keeps the ledger as it was left.
      {
        path: LEDGER_PATH.slice(1),
        element: <Ledger />,
        children: [
          { index: true, element: <Navigate to={LEDGER_V2_PATH} replace /> },
          { path: 'v1', element: <LedgerV1 /> },
          { path: 'v2', element: <LedgerV2 /> },
        ],
      },
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
