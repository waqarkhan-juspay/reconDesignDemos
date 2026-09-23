import './suppress-blend-noise'

import {
  FOUNDATION_THEME,
  SnackbarV2,
  SnackbarV2Position,
  ThemeProvider,
} from '@juspay/blend-design-system'
import '@juspay/blend-design-system/style.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { router } from './router.tsx'
import { componentTokens } from './theme'

/**
 * The one colour the document itself needs, handed to index.css rather than written there.
 *
 * `body { background-color: var(--app-surface) }` is the consumer; see the comment on that
 * rule for why the app needs to name its own canvas at all. It is set here because this is
 * the file that already owns the document — and because rule 1 puts every colour in a token,
 * which a stylesheet cannot read.
 *
 * Before `createRoot`, so the surface is in place for the first paint rather than arriving a
 * commit later.
 */
// `!` because the token map is indexed and so types every ramp step as possibly missing;
// gray[0] is white and has shipped in every version of the foundation.
document.documentElement.style.setProperty('--app-surface', FOUNDATION_THEME.colors.gray[0]!)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider componentTokens={componentTokens}>
      <RouterProvider router={router} />
      {/* The app's one toaster — `addSnackbarV2()` is a function call, not a component, so
          something has to be mounted for it to render into. Once, here, rather than per
          screen: two hosts would mean two stacks racing for the same corner.

          Bottom *left*. Blend defaults to bottom-right, which is where this app's one
          persistent overlay lives — the config detail sheet is 600px of right-hand column,
          and the toast it raises would open underneath it. The left corner is the one that
          is free whatever is on screen.

          Inside ThemeProvider, because the toast reads SNACKBARV2 tokens like anything else
          Blend draws. */}
      <SnackbarV2 position={SnackbarV2Position.BOTTOM_LEFT} />
    </ThemeProvider>
  </StrictMode>,
)
