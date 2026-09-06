import { ThemeProvider } from '@juspay/blend-design-system'
import '@juspay/blend-design-system/style.css'
import { Agentation } from 'agentation'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
    {/* Visual feedback toolbar. Dev only — `import.meta.env.DEV` is inlined as
        `false` at build time, so the whole subtree is dropped from prod bundles.
        `endpoint` syncs annotations to the local agentation-mcp server. */}
    {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
  </StrictMode>,
)
