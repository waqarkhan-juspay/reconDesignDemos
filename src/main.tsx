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

/**
 * TEMPORARY — the two floating buttons, hidden on 2026-09-18 to clear them out of a demo.
 * Flip back to `true` when the demo is over; nothing else about either mount changed.
 *
 * Two flags rather than one because they were asked back separately: dialkit's launcher (top
 * right) is wanted again, agentation's toolbar (bottom right) is still hidden.
 */
const SHOW_DIALKIT = true
const SHOW_AGENTATION = false

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider componentTokens={componentTokens}>
      <RouterProvider router={router} />
      {/* Collapsed on load. DialRoot's own default is `defaultOpen = true`, which puts an
          open panel over the top-right of every page before anyone has asked for one —
          the toolbar's launcher button is enough of an affordance. */}
      {SHOW_DIALKIT && <DialRoot defaultOpen={false} />}
    </ThemeProvider>
    {/* Visual feedback toolbar. Dev only — `import.meta.env.DEV` is inlined as
        `false` at build time, so the whole subtree is dropped from prod bundles.

        The endpoint is origin-relative on purpose. The toolbar polls `<endpoint>/health`
        every 10 seconds and the prop is the only gate on it (agentation/dist/index.mjs:
        `if (!endpoint || !mounted) return`), so a hardcoded localhost:4747 — which is
        what this used to be — meant a failed request every 10s for the life of the tab
        whenever nothing was listening there.

        `/agentation` is served by the dev server itself (vite.config.ts), which starts
        the feedback server and proxies to it. Being same-origin, it follows the app to
        whatever port Vite is bound to and needs no CORS. */}
    {SHOW_AGENTATION && import.meta.env.DEV && <Agentation endpoint="/agentation" />}
  </StrictMode>,
)
