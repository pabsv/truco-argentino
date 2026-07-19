import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Jugar', icon: '🎴', end: true },
  { to: '/stats', label: 'Stats', icon: '📊', end: false },
  { to: '/roster', label: 'Jugadores', icon: '👥', end: false },
]

export function TabBar() {
  return (
    <nav
      className="flex-shrink-0 bg-green-900 border-t border-green-700 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition-colors ${
              isActive ? 'text-yellow-400' : 'text-green-300 hover:text-green-100'
            }`
          }
        >
          <span className="text-lg leading-none">{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
