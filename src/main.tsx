import './suppress-blend-noise'

import { ThemeProvider } from '@juspay/blend-design-system'
import '@juspay/blend-design-system/style.css'
import { Agentation } from 'agentation'
import { DialRoot } from 'dialkit'
import 'dialkit/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { router } from './router.tsx'
import { componentTokens } from './theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider componentTokens={componentTokens}>
      <RouterProvider router={router} />
      {/* Collapsed on load. DialRoot's own default is `defaultOpen = true`, which puts an
          open panel over the top-right of every page before anyone has asked for one —
          the toolbar's launcher button is enough of an affordance. */}
      <DialRoot defaultOpen={false} />
    </ThemeProvider>
    {/* Visual feedback toolbar. Dev only — `import.meta.env.DEV` is inlined as
        `false` at build time, so the whole subtree is dropped from prod bundles.
        `endpoint` syncs annotations to the local agentation-mcp server. */}
    {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
  </StrictMode>,
)
