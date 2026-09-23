import { Navigate, createBrowserRouter } from 'react-router'
import App from './App.tsx'
import Configurator from './pages/Configurator.tsx'
import CreateReportConfig from './pages/create-report-config'
import NotFound from './pages/NotFound.tsx'
import { CONFIGURATOR_PATH } from './layout/navigation.tsx'

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
