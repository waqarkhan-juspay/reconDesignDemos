import { createBrowserRouter } from 'react-router'
import App from './App.tsx'
import About from './pages/About.tsx'
import Blend from './pages/Blend.tsx'
import Configurator from './pages/Configurator.tsx'
import CreateReportConfig from './pages/create-report-config'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'blend', element: <Blend /> },
      { path: 'configurator', element: <Configurator /> },
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
