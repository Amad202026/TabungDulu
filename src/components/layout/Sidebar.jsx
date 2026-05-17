import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/appStore'
import { initials } from '../../utils/format'

const NAV = [
  { to: '/',        icon: 'dashboard',     label: 'Beranda',    id: 'nav-beranda' },
  { to: '/laporan', icon: 'bar_chart',     label: 'Laporan',    id: 'nav-laporan' },
  { to: '/target',  icon: 'track_changes', label: 'Target',     id: 'nav-target'  },
  { to: '/ai',      icon: 'smart_toy',     label: 'AI Advisor', id: 'nav-ai'      },
  { to: '/tutorial',icon: 'school',        label: 'Tutorial',   id: 'nav-tutorial' },
  { to: '/profil',  icon: 'person',        label: 'Profil',     id: 'nav-profil'  },
]

export default function Sidebar() {
  const user   = useStore(s => s.user)
  const logout = useStore(s => s.logout)
  const nav    = useNavigate()

  return (
    <aside className="hidden lg:flex flex-col w-[272px] bg-surface border-r border-outline-variant fixed left-0 top-0 h-screen z-50 shrink-0">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-xl font-sora font-bold text-primary-container tracking-tight">TabungDulu</h1>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-[2px] mt-1 font-semibold">Teman Finansialmu</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            data-onboard={item.id}
            className={({ isActive }) =>
              `flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary-container text-on-primary-container font-bold glow-sm' : 'text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`
            }>
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-outline-variant space-y-2">
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high cursor-pointer hover:bg-surface-container-highest transition-colors"
          onClick={() => nav('/profil')}>
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs shrink-0 font-sora">
            {initials(user?.name || 'TD')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-primary-container font-semibold truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-error/70 hover:text-error hover:bg-error/10 transition-all">
          <span className="material-symbols-outlined text-[16px]">logout</span> Keluar
        </button>
      </div>
    </aside>
  )
}
