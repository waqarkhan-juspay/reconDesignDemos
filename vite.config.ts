import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 9000,
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
