import { useEffect, useState } from 'react'
let _cb = null
export const toast = (msg, type='ok') => _cb?.(msg,type)

export default function Toast() {
  const [t, setT] = useState(null)
  useEffect(() => {
    _cb = (msg,type) => { setT({msg,type}); setTimeout(()=>setT(null),3000) }
    return () => { _cb = null }
  },[])
  if (!t) return null
  return (
    <div className={`fixed bottom-24 lg:bottom-8 right-4 lg:right-8 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl z-[200] flex items-center gap-2 fade-up ${t.type==='err'?'bg-error-container text-white':'bg-primary-container text-on-primary-container glow'}`}>
      <span className="material-symbols-outlined text-sm">{t.type==='err'?'error':'check_circle'}</span>
      {t.msg}
    </div>
  )
}