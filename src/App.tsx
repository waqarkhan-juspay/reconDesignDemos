import { NavLink, Outlet } from 'react-router'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
]

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <nav className="flex items-center gap-6 border-b border-neutral-800 px-6 py-4">
        <span className="font-semibold">Recon Demos</span>
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isActive ? 'text-neutral-100 underline underline-offset-4' : 'text-neutral-400 hover:text-neutral-100'
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <Outlet />
      </main>
    </div>
  )
}

export default App
