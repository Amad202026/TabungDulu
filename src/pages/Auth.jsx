import { useState } from 'react'
import { useStore } from '../store/appStore'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const { login, register, authError, clearAuthError } = useStore()

  const f = (k, v) => { setForm(p => ({ ...p, [k]: v })); clearAuthError() }

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.password.trim()) return
    if (mode === 'register') {
      if (!form.name.trim()) return
      if (form.password !== form.confirm) { useStore.setState({ authError: 'Password tidak cocok!' }); return }
      if (form.password.length < 6) { useStore.setState({ authError: 'Password minimal 6 karakter!' }); return }
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    if (mode === 'login') login({ email: form.email.trim(), password: form.password })
    else register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
    setLoading(false)
  }

  const switchMode = (m) => { setMode(m); setForm({ name: '', email: '', password: '', confirm: '' }); clearAuthError() }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-4 glow-sm">
            <span className="material-symbols-outlined text-on-primary-container text-3xl">savings</span>
          </div>
          <h1 className="text-2xl font-sora font-bold text-white">TabungDulu</h1>
          <p className="text-sm text-on-surface-variant mt-1">Teman finansialmu 💚</p>
        </div>

        {/* Tab */}
        <div className="flex rounded-xl bg-surface-container-high p-1 gap-1 mb-6">
          {[['login','Masuk'],['register','Daftar']].map(([m,l]) => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'bg-primary-container text-on-primary-container glow-sm' : 'text-on-surface-variant hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nama Lengkap</label>
              <input value={form.name} onChange={e => f('name', e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors"
                placeholder="Nama kamu" />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => f('email', e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors"
              placeholder="email@kamu.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={e => f('password', e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors"
              placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Password kamu'} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Konfirmasi Password</label>
              <input type="password" value={form.confirm} onChange={e => f('confirm', e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors"
                placeholder="Ulangi password" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          )}

          {authError && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-3 text-sm text-error text-center">
              {authError}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk 🚀' : 'Daftar Sekarang 🎯'}
          </button>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-primary-container hover:underline font-semibold">
            {mode === 'login' ? 'Daftar sekarang' : 'Masuk'}
          </button>
        </p>

        {/* Demo hint */}
        {mode === 'login' && (
          <div className="mt-4 p-3 bg-surface border border-outline-variant rounded-xl text-center">
            <p className="text-[10px] text-on-surface-variant">Tidak punya akun? Daftar gratis di atas 👆</p>
            <p className="text-[10px] text-on-surface-variant/60 mt-1">Data tersimpan di browser kamu secara lokal</p>
          </div>
        )}
      </div>
    </div>
  )
}
