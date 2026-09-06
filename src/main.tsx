import './suppress-blend-noise'

import { ThemeProvider } from '@juspay/blend-design-system'
import '@juspay/blend-design-system/style.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
