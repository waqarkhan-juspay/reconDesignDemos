import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // This project runs on 9000. Vite ignores $PORT by default, so read it
    // explicitly to leave a deliberate override available; strictPort then makes
    // a busy port fail loudly instead of silently drifting to the next free one,
    // which previously left the app served from a port nobody was looking at.
    port: Number(process.env.PORT) || 9000,
    strictPort: true,
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
