import { useLocation } from 'react-router-dom'
import { useStore } from '../../store/appStore'

const TITLES = {
  '/laporan':  'Laporan',
  '/target':   'Target Tabungan',
  '/ai':       'AI Advisor',
  '/profil':   'Profil',
  '/tutorial': 'Tutorial',
}

export default function TopBar({ onIncome, onExpense }) {
  const loc   = useLocation()
  const user  = useStore(s => s.user)
  const h     = new Date().getHours()
  const greet = h < 12 ? 'Pagi' : h < 17 ? 'Siang' : 'Malam'
  const title = loc.pathname === '/'
    ? `Selamat ${greet}, ${user?.name?.split(' ')[0] || ''}`
    : (TITLES[loc.pathname] || 'TabungDulu')

  return (
    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-6 lg:px-8 shrink-0 sticky top-0 z-40">
      <div>
        <h2 className="text-lg font-sora font-semibold text-white">{title}</h2>
        {loc.pathname === '/' && <p className="text-xs text-on-surface-variant hidden lg:block">Yuk pantau keuanganmu hari ini.</p>}
      </div>
      <div className="flex gap-2">
        <button
          data-onboard="add-expense"
          onClick={onExpense}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high transition-all text-xs font-medium text-on-surface-variant">
          <span className="material-symbols-outlined text-sm">remove</span>&nbsp;Pengeluaran
        </button>
        <button
          data-onboard="add-income"
          onClick={onIncome}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold hover:brightness-110 active:scale-95 transition-all text-xs glow-sm">
          <span className="material-symbols-outlined text-sm">add</span>&nbsp;Pemasukan
        </button>
      </div>
    </header>
  )
}
