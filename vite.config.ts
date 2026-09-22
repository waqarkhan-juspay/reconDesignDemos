import { createServer } from 'node:net'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * The agentation feedback server's own port. Not something the app ever sees — it is
 * reached through the dev server at `/agentation` (see below), so the only place this
 * number appears is here and in the proxy target beside it.
 */
const AGENTATION_PORT = 4747

/**
 * TEMPORARY — agentation is hidden for now, matching SHOW_AGENTATION in src/main.tsx.
 *
 * The toolbar was already gated off there, but this file was not: the plugin still started
 * the feedback server on every `npm run dev` and the proxy was still registered, so the
 * process bound :4747 for a UI nobody could see. While this is false neither happens.
 *
 * Nothing is uninstalled and no code is deleted — flip this and SHOW_AGENTATION back
 * together to bring it all back.
 */
const SHOW_AGENTATION = false

/** Where the app talks to it: same origin as the app, so no second port to keep alive. */
const AGENTATION_BASE = '/agentation'

const isPortFree = (port: number) =>
  new Promise<boolean>((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, '127.0.0.1')
  })

/**
 * Runs the agentation feedback server alongside Vite and serves it from the app's own
 * origin.
 *
 * The toolbar in src/main.tsx polls `<endpoint>/health` every 10 seconds and cannot be
 * talked out of it — the endpoint prop is the only gate (agentation/dist/index.mjs:
 * `if (!endpoint || !mounted) return`). Previously that pointed at a hardcoded
 * localhost:4747 which nothing ever started, so every dev session accumulated a failed
 * request every 10s. Starting the server here is what makes the poll succeed rather than
 * merely fall silent.
 *
 * It goes through a proxy rather than being handed :4747 directly because the app should
 * not know a second port exists: on `/agentation` the endpoint is origin-relative, so it
 * follows the dev server wherever it is bound (the PORT override below included) and stays
 * same-origin, which keeps CORS out of it entirely.
 *
 * `startHttpServer` binds a port of its own and returns nothing, so it cannot be mounted
 * as middleware — a proxy is the only way to put it behind 9000.
 */
function agentationServer(): Plugin {
  return {
    name: 'agentation-server',
    apply: 'serve',
    async configureServer() {
      // Vite restarts this process on config changes, and a second listen on a live port
      // throws EADDRINUSE and takes the dev server down with it. A free port means ours is
      // not up yet; a busy one means it already is, and either way the proxy has a target.
      if (!(await isPortFree(AGENTATION_PORT))) return

      try {
        const { startHttpServer } = await import('agentation-mcp')
        startHttpServer(AGENTATION_PORT)
      } catch (error) {
        // Optional tooling: the app works without it, and the toolbar falls back to
        // localStorage. Worth a line rather than a crash, so a broken native build of
        // better-sqlite3 explains itself instead of just becoming a silent 502.
        console.warn(
          '[agentation] feedback server did not start; annotations stay in localStorage.',
          error instanceof Error ? error.message : error,
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(SHOW_AGENTATION ? [agentationServer()] : [])],
  server: {
    // This project runs on 9000. Vite ignores $PORT by default, so read it
    // explicitly to leave a deliberate override available; strictPort then makes
    // a busy port fail loudly instead of silently drifting to the next free one,
    // which previously left the app served from a port nobody was looking at.
    port: Number(process.env.PORT) || 9000,
    strictPort: true,
    ...(SHOW_AGENTATION ? {
    proxy: {
      [AGENTATION_BASE]: {
        target: `http://localhost:${AGENTATION_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${AGENTATION_BASE}`), ''),
        // `/sessions/:id/events` is an event stream. Without this the proxy buffers it and
        // the toolbar never receives an annotation it did not create itself.
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform'
            }
          })
        },
      },
    },
    } : {}),
  },
  resolve: {
    alias: {
      'blend-primitives': fileURLToPath(
        new URL(
          './node_modules/@juspay/blend-design-system/lib/components/Primitives',
          import.meta.url,
        ),
      ),
    },
  },
})
