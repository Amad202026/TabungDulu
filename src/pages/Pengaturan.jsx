import { useState } from 'react'
import { useStore, changePassword } from '../store/appStore'
import { toast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'

// ── Reusable sub-components ───────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${value ? 'bg-primary-container glow-sm' : 'bg-surface-container-highest'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function Row({ icon, label, sub, danger, children }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 last:border-0 border-b border-outline-variant">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'}`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-error' : 'text-white'}`}>{label}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 px-1">{title}</p>
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
export default function Pengaturan() {
  const S = useStore()
  const [resetOpen, setResetOpen] = useState(false)
  const [pwOpen,    setPwOpen]    = useState(false)
  const [pw, setPw] = useState({ old: '', new1: '', new2: '' })

  const setSetting = (key, val) => {
    S.updateSettings({ [key]: val })
    toast('Pengaturan disimpan!')
  }

  const handleChangePw = () => {
    if (!pw.old || !pw.new1 || !pw.new2) return toast('Isi semua field!', 'err')
    if (pw.new1 !== pw.new2) return toast('Password baru tidak cocok!', 'err')
    if (pw.new1.length < 6)  return toast('Password minimal 6 karakter!', 'err')
    if (pw.new1 === pw.old)  return toast('Password baru tidak boleh sama dengan yang lama!', 'err')

    const err = changePassword(S.authUser?.email, pw.old, pw.new1)
    if (err) return toast(err, 'err')

    toast('Password berhasil diubah! 🔐')
    setPw({ old: '', new1: '', new2: '' })
    setPwOpen(false)
  }

  const handleReset = () => {
    S.clearAllData()
    toast('Semua data berhasil dihapus!')
    setResetOpen(false)
  }

  return (
    <div className="fade-up max-w-2xl mx-auto space-y-8">

      <div>
        <h2 className="text-2xl font-sora font-bold text-white">Pengaturan</h2>
        <p className="text-sm text-on-surface-variant mt-1">Kelola preferensi dan keamanan akun</p>
      </div>

      {/* ── Notifikasi ── */}
      <Section title="Notifikasi">
        <Row icon="notifications_active" label="Pengingat Mingguan" sub="Ringkasan keuangan setiap awal minggu">
          <Toggle value={S.settings.notifWeekly} onChange={v => setSetting('notifWeekly', v)} />
        </Row>
        <Row icon="track_changes" label="Alert Target" sub="Notifikasi saat target hampir tercapai">
          <Toggle value={S.settings.notifTarget} onChange={v => setSetting('notifTarget', v)} />
        </Row>
      </Section>

      {/* ── Preferensi ── */}
      <Section title="Preferensi">
        <Row icon="currency_exchange" label="Mata Uang" sub="Format tampilan nominal">
          <select value={S.settings.currency} onChange={e => setSetting('currency', e.target.value)}
            className="bg-surface-container-high border border-outline-variant rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary-container cursor-pointer">
            {['IDR', 'USD', 'SGD', 'MYR', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Row>
      </Section>

      {/* ── Keamanan ── */}
      <Section title="Keamanan">
        <Row icon="lock" label="Ganti Password" sub="Ubah kata sandi akunmu">
          <button onClick={() => { setPw({ old: '', new1: '', new2: '' }); setPwOpen(true) }}
            className="px-4 py-1.5 rounded-xl border border-outline-variant text-sm text-on-surface-variant hover:text-white hover:bg-surface-container-high transition-all">
            Ubah
          </button>
        </Row>
      </Section>

      {/* ── Data ── */}
      <Section title="Data">
        <button className="w-full text-left" onClick={() => setResetOpen(true)}>
          <Row icon="delete_forever" label="Reset Semua Data" sub="Hapus semua transaksi dan target" danger>
            <span className="material-symbols-outlined text-error/40 text-sm shrink-0">chevron_right</span>
          </Row>
        </button>
      </Section>

      {/* ── App info ── */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-7 flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-primary-container/10 border border-primary-container/20 flex items-center justify-center mb-1">
          <span className="material-symbols-outlined text-primary-container text-2xl">savings</span>
        </div>
        <p className="text-base font-sora font-bold text-white">TabungDulu</p>
        <p className="text-xs text-on-surface-variant">Versi 1.0.0 · Teman Finansialmu</p>
        <p className="text-[10px] text-on-surface-variant/50 mt-1">Data tersimpan lokal di browser kamu</p>
      </div>

      {/* ── Modal ganti password ── */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Ganti Password">
        <div className="space-y-4">
          {[
            { key: 'old',  label: 'Password Lama',  ph: 'Masukkan password lama' },
            { key: 'new1', label: 'Password Baru',   ph: 'Minimal 6 karakter' },
            { key: 'new2', label: 'Konfirmasi Baru', ph: 'Ulangi password baru' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{f.label}</label>
              <input type="password" value={pw[f.key]} onChange={e => setPw({ ...pw, [f.key]: e.target.value })}
                placeholder={f.ph} onKeyDown={e => e.key === 'Enter' && handleChangePw()}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors" />
            </div>
          ))}
          <button onClick={handleChangePw}
            className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm">
            Simpan Password 🔐
          </button>
        </div>
      </Modal>

      {/* ── Modal konfirmasi reset ── */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Semua Data?">
        <div className="space-y-5">
          <div className="bg-error/8 border border-error/20 rounded-xl p-5 text-center">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="text-sm text-error font-semibold">Tindakan ini tidak bisa dibatalkan!</p>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Semua transaksi dan target akan dihapus permanen.<br />
              Akun kamu tetap ada dan bisa digunakan kembali.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setResetOpen(false)}
              className="flex-1 py-3 bg-surface-container-high text-white font-bold rounded-xl border border-outline-variant hover:bg-surface-container-highest transition-all">
              Batal
            </button>
            <button onClick={handleReset}
              className="flex-1 py-3 bg-error/15 text-error font-bold rounded-xl border border-error/25 hover:bg-error/25 transition-all">
              Ya, Hapus Semua
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
