import { useDialKit } from 'dialkit'
import { Outlet } from 'react-router'
import AppShell from './layout/AppShell'
import { FEEDBACK_MS, OVERLAY_MS, PAGE_MS } from './motion'

function App() {
  // Registers the panel that DialRoot displays. DialRoot renders nothing until
  // something calls useDialKit, so this is what makes the toolbar appear.
  // Values are published as CSS custom properties, so anything styled with
  // var(--page-ms) etc. retunes live without a reload. See motion.ts.
  const motion = useDialKit('Motion', {
    pageMs: [PAGE_MS, 0, 1000],
    feedbackMs: [FEEDBACK_MS, 0, 1000],
    overlayMs: [OVERLAY_MS, 0, 1000],
  })

  return (
    <div
      style={
        {
          display: 'contents',
          '--page-ms': `${motion.pageMs}ms`,
          '--feedback-ms': `${motion.feedbackMs}ms`,
          '--overlay-ms': `${motion.overlayMs}ms`,
        } as React.CSSProperties
      }
    >
      <AppShell>
        <Outlet />
      </AppShell>
    </div>
  )
}

export default App
