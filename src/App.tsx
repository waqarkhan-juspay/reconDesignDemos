import { Outlet } from 'react-router'
import AppShell from './layout/AppShell'

function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default App
