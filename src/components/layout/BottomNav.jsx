import { NavLink } from 'react-router-dom'

const NAV = [
  {to:'/',       icon:'dashboard',   label:'Beranda'},
  {to:'/laporan',icon:'bar_chart',   label:'Laporan'},
  {to:'/target', icon:'track_changes',label:'Target'},
  {to:'/ai',     icon:'smart_toy',   label:'AI'},
  {to:'/profil', icon:'person',      label:'Profil'},
]

export default function BottomNav({ onAdd }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-outline-variant flex justify-around items-center h-16 z-50">
      {NAV.slice(0,2).map(n=>(
        <NavLink key={n.to} to={n.to} end={n.to==='/'}
          className={({isActive})=>`flex flex-col items-center gap-1 p-2 transition-colors ${isActive?'text-primary-container':'text-on-surface-variant'}`}>
          <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
          <span className="text-[10px] font-semibold">{n.label}</span>
        </NavLink>
      ))}
      <button onClick={onAdd} className="w-12 h-12 bg-primary-container rounded-full -mt-7 flex items-center justify-center text-on-primary-container glow border-4 border-background transition-transform hover:scale-105 active:scale-95">
        <span className="material-symbols-outlined font-bold text-[20px]">add</span>
      </button>
      {NAV.slice(2).map(n=>(
        <NavLink key={n.to} to={n.to}
          className={({isActive})=>`flex flex-col items-center gap-1 p-2 transition-colors ${isActive?'text-primary-container':'text-on-surface-variant'}`}>
          <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
          <span className="text-[10px] font-semibold">{n.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}