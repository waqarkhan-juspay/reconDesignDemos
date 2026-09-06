import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Vite ignores $PORT by default, so read it explicitly: tooling that assigns
    // a port (e.g. running several worktrees at once) can then override 9000.
    port: Number(process.env.PORT) || 9000,
  },
})
