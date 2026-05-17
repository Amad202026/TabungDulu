import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, changePassword } from '../store/appStore'
import { fmt, initials, pct } from '../utils/format'
import { toast } from '../components/ui/Toast'
import Modal from '../components/ui/Modal'
import ProgressBar from '../components/ui/ProgressBar'
import { catIcon } from '../constants/categories'

// ── Helpers ────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-2xl p-5 flex flex-col items-center text-center gap-1">
      <p className="text-xl font-sora font-bold text-primary-container">{value}</p>
      <p className="text-xs text-on-surface-variant">{label}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 px-1">{title}</p>
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden divide-y divide-outline-variant">
        {children}
      </div>
    </div>
  )
}

function Row({ icon, label, sub, danger, right, onClick }) {
  const base = `flex items-center gap-4 w-full px-5 py-4 text-left transition-all ${onClick ? 'hover:bg-surface-container-high/50 cursor-pointer' : ''}`
  return (
    <div className={base} onClick={onClick}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'}`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-error' : 'text-white'}`}>{label}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange(!value) }}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${value ? 'bg-primary-container glow-sm' : 'bg-surface-container-highest'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

// ── Category manager ───────────────────────────────────────────────────
function CategoryModal({ open, onClose }) {
  const S = useStore()
  const [tab, setTab] = useState('income')
  const [newCat, setNewCat] = useState('')

  const add = () => {
    if (!newCat.trim()) return
    const ok = S.addCategory(tab, newCat)
    if (ok) { toast(`Kategori "${newCat.trim()}" ditambahkan!`); setNewCat('') }
    else toast('Kategori sudah ada!', 'err')
  }

  return (
    <Modal open={open} onClose={onClose} title="Kelola Kategori">
      <div className="space-y-4">
        <div className="flex rounded-xl bg-surface-container-high p-1 gap-1">
          {[['income', '💰 Pemasukan'], ['expense', '💸 Pengeluaran']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-primary-container"
            placeholder="Nama kategori baru..." />
          <button onClick={add} className="px-4 py-2.5 bg-primary-container text-on-primary-container rounded-xl text-sm font-bold hover:brightness-110">Tambah</button>
        </div>
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {S.categories[tab].map(cat => (
            <div key={cat} className="flex items-center gap-3 px-3 py-2.5 bg-surface-container rounded-xl">
              <span className="material-symbols-outlined text-on-surface-variant text-[15px]">{catIcon(cat)}</span>
              <span className="flex-1 text-sm text-white">{cat}</span>
              <button onClick={() => { S.removeCategory(tab, cat); toast(`"${cat}" dihapus`) }}
                className="text-on-surface-variant/40 hover:text-error transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => { S.resetCategories(); toast('Direset ke default!') }}
          className="w-full py-2.5 text-sm text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container-high transition-all">
          Reset ke Default
        </button>
      </div>
    </Modal>
  )
}

// ── Import / Export ────────────────────────────────────────────────────
function exportJSON(S) {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    user: S.user,
    settings: S.settings,
    categories: S.categories,
    targets: S.targets,
    transactions: S.transactions,
    recurring: S.recurring,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `TabungDulu_Backup_${new Date().toISOString().slice(0, 10)}.json`,
  })
  a.click(); URL.revokeObjectURL(a.href)
  toast('Data berhasil di-export! 💾')
}

function exportCSV(S) {
  const rows = [['Tanggal', 'Tipe', 'Keterangan', 'Kategori', 'Nominal']]
  S.transactions.forEach(t =>
    rows.push([t.date, t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', `"${t.note}"`, t.category, t.amount])
  )
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `TabungDulu_Transaksi_${new Date().toISOString().slice(0, 10)}.csv`,
  })
  a.click(); URL.revokeObjectURL(a.href)
  toast('Transaksi di-export ke CSV! 📊')
}

function ImportModal({ open, onClose }) {
  const S = useStore()
  const [dragging, setDragging] = useState(false)
  const [preview,  setPreview]  = useState(null)
  const [error,    setError]    = useState('')
  const fileRef = useRef()

  const reset = () => { setPreview(null); setError('') }

  const parseFile = (file) => {
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.version || !data.transactions) throw new Error('Format file tidak valid')
        setPreview(data)
      } catch {
        setError('File tidak valid. Pastikan file berasal dari export TabungDulu (JSON).')
        setPreview(null)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    parseFile(e.dataTransfer.files[0])
  }

  const doImport = () => {
    if (!preview) return
    // Merge or replace — kita replace semua data keuangan
    S.addTransaction && preview.transactions?.forEach(() => {}) // just to reference
    // Import directly via store internal
    const { transactions, targets, recurring, categories, settings } = preview
    useStore.setState({
      transactions: transactions || [],
      targets: (targets || []).map(t => ({ ...t, saved: t.saved || 0 })),
      recurring: recurring || [],
      categories: categories || S.categories,
      settings: { ...S.settings, ...(settings || {}) },
      nextId: Math.max(
        ...(transactions || []).map(t => t.id || 0),
        ...(targets || []).map(t => t.id || 0),
        ...(recurring || []).map(r => r.id || 0),
        0
      ) + 1,
    })
    S._persist()
    toast(`Import berhasil! ${preview.transactions?.length || 0} transaksi, ${preview.targets?.length || 0} target dipulihkan. ✅`)
    setPreview(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Import Data">
      <div className="space-y-4">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Pilih file backup <strong className="text-white">.json</strong> yang sebelumnya kamu export dari TabungDulu. Data yang ada akan digantikan.
        </p>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${dragging ? 'border-primary-container bg-primary-container/5' : 'border-outline-variant hover:border-primary-container/40'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}>
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">cloud_upload</span>
          <p className="text-sm text-on-surface-variant text-center">
            Drag & drop file JSON di sini<br />
            <span className="text-primary-container font-semibold">atau klik untuk pilih file</span>
          </p>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={e => parseFile(e.target.files[0])} />
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 text-sm text-error">{error}</div>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-primary-container/5 border border-primary-container/20 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-primary-container uppercase tracking-wider">Preview Data</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Transaksi', val: preview.transactions?.length || 0 },
                { label: 'Target',    val: preview.targets?.length || 0 },
                { label: 'Jadwal',    val: preview.recurring?.length || 0 },
              ].map(x => (
                <div key={x.label} className="bg-surface rounded-xl p-3">
                  <p className="text-lg font-sora font-bold text-white">{x.val}</p>
                  <p className="text-[10px] text-on-surface-variant">{x.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-on-surface-variant">
              Di-export pada: {new Date(preview.exportedAt).toLocaleString('id-ID')}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => { reset(); onClose() }}
            className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high transition-all text-sm">
            Batal
          </button>
          <button onClick={doImport} disabled={!preview}
            className="flex-[2] py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm">
            Pulihkan Data ✅
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main ───────────────────────────────────────────────────────────────
export default function Profil() {
  const nav = useNavigate()
  const S = useStore()

  const [editOpen,   setEditOpen]   = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [catOpen,    setCatOpen]    = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [resetOpen,  setResetOpen]  = useState(false)
  const [pwOpen,     setPwOpen]     = useState(false)
  const [form, setForm]             = useState({ name: '', email: '', phone: '' })
  const [pw,   setPw]               = useState({ old: '', new1: '', new2: '' })

  const openEdit = () => {
    setForm({ name: S.user?.name || '', email: S.user?.email || '', phone: S.user?.phone || '' })
    setEditOpen(true)
  }

  const saveProfile = () => {
    if (!form.name.trim() || !form.email.trim()) return toast('Nama dan email wajib diisi!', 'err')
    S.updateUser({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() })
    toast('Profil diperbarui! ✅')
    setEditOpen(false)
  }

  const handleChangePw = () => {
    if (!pw.old || !pw.new1 || !pw.new2) return toast('Isi semua field!', 'err')
    if (pw.new1 !== pw.new2)  return toast('Password baru tidak cocok!', 'err')
    if (pw.new1.length < 6)   return toast('Password minimal 6 karakter!', 'err')
    if (pw.new1 === pw.old)   return toast('Password baru tidak boleh sama!', 'err')
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

  const totalIn   = S.getTotalIncome()
  const totalOut  = S.getTotalExpense()
  const balance   = S.getBalance()
  const saved     = S.getTotalSaved()
  const goal      = S.getTotalGoal()
  const available = S.getAvailableBalance()

  return (
    <div className="fade-up max-w-2xl mx-auto space-y-8">

      {/* ── Profile card ── */}
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center gap-4 relative">
          <div className="absolute -top-16 -right-16 w-52 h-52 bg-primary-container/4 rounded-full blur-3xl pointer-events-none" />
          <div className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary-container font-sora font-bold text-3xl glow-sm">
            {initials(S.user?.name || 'TD')}
          </div>
          <div>
            <h2 className="text-xl font-sora font-bold text-white">{S.user?.name}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">{S.user?.email}</p>
            {S.user?.phone && <p className="text-sm text-on-surface-variant">{S.user.phone}</p>}
          </div>
          <button onClick={openEdit}
            className="flex items-center gap-2 px-5 py-2 rounded-xl border border-outline-variant text-sm text-on-surface-variant hover:text-white hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-[15px]">edit</span> Edit Profil
          </button>
        </div>

        {/* Balance row */}
        <div className="grid grid-cols-3 divide-x divide-outline-variant border-t border-outline-variant">
          {[
            { label: 'Saldo Bersih',  value: fmt(balance),  color: balance >= 0 ? 'text-primary-container' : 'text-error' },
            { label: 'Pemasukan',     value: fmt(totalIn),  color: 'text-primary-container' },
            { label: 'Pengeluaran',   value: fmt(totalOut), color: 'text-error' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 text-center">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-sm font-sora font-bold ${color} truncate`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Transaksi"      value={S.transactions.length} />
        <StatCard label="Target Aktif"   value={S.targets.length} />
        <StatCard label="Dana Terkumpul" value={fmt(saved)} />
        <StatCard label="Saldo Tersedia" value={fmt(available)} />
      </div>

      {/* Overall saving progress */}
      {goal > 0 && (
        <div className="bg-surface border border-outline-variant rounded-2xl p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-white">Progress Tabungan</p>
            <p className="text-sm font-bold text-primary-container">{pct(saved, goal)}%</p>
          </div>
          <ProgressBar value={pct(saved, goal)} />
          <div className="flex justify-between text-xs text-on-surface-variant mt-2">
            <span>Terkumpul: {fmt(saved)}</span>
            <span>Target: {fmt(goal)}</span>
          </div>
        </div>
      )}

      {/* ── Akun ── */}
      <Section title="Akun">
        <Row icon="edit"   label="Edit Profil"  sub="Ubah nama, email, nomor HP" onClick={openEdit}
          right={<span className="material-symbols-outlined text-on-surface-variant/40 text-sm">chevron_right</span>} />
        <Row icon="lock"   label="Ganti Password" sub="Ubah kata sandi akun" onClick={() => { setPw({ old:'',new1:'',new2:'' }); setPwOpen(true) }}
          right={<span className="material-symbols-outlined text-on-surface-variant/40 text-sm">chevron_right</span>} />
      </Section>

      {/* ── Notifikasi ── */}
      <Section title="Notifikasi">
        <Row icon="notifications_active" label="Pengingat Mingguan" sub="Ringkasan keuangan tiap awal minggu"
          right={<Toggle value={S.settings.notifWeekly} onChange={v => { S.updateSettings({ notifWeekly: v }); toast('Disimpan!') }} />} />
        <Row icon="track_changes" label="Alert Target" sub="Notifikasi saat target hampir tercapai"
          right={<Toggle value={S.settings.notifTarget} onChange={v => { S.updateSettings({ notifTarget: v }); toast('Disimpan!') }} />} />
      </Section>

      {/* ── Preferensi ── */}
      <Section title="Preferensi">
        <Row icon="category" label="Kelola Kategori" sub="Tambah atau hapus kategori transaksi" onClick={() => setCatOpen(true)}
          right={<span className="material-symbols-outlined text-on-surface-variant/40 text-sm">chevron_right</span>} />
        <Row icon="currency_exchange" label="Mata Uang" sub="Format tampilan nominal"
          right={
            <select value={S.settings.currency} onChange={e => { S.updateSettings({ currency: e.target.value }); toast('Mata uang disimpan!') }}
              onClick={e => e.stopPropagation()}
              className="bg-surface-container-high border border-outline-variant rounded-xl px-3 py-1.5 text-sm text-white outline-none focus:border-primary-container cursor-pointer">
              {['IDR', 'USD', 'SGD', 'MYR', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          } />
      </Section>

      {/* ── Data ── */}
      <Section title="Data & Backup">
        <Row icon="download" label="Export JSON" sub="Backup lengkap semua data (bisa di-import kembali)" onClick={() => exportJSON(S)}
          right={<span className="material-symbols-outlined text-on-surface-variant/40 text-sm">chevron_right</span>} />
        <Row icon="table_chart" label="Export CSV" sub="Riwayat transaksi dalam format spreadsheet" onClick={() => exportCSV(S)}
          right={<span className="material-symbols-outlined text-on-surface-variant/40 text-sm">chevron_right</span>} />
        <Row icon="cloud_upload" label="Import / Pulihkan" sub="Restore data dari file backup JSON" onClick={() => setImportOpen(true)}
          right={<span className="material-symbols-outlined text-on-surface-variant/40 text-sm">chevron_right</span>} />
      </Section>

      {/* ── Danger zone ── */}
      <Section title="Lainnya">
        <Row icon="school" label="Tutorial" sub="Lihat panduan cara pakai TabungDulu" onClick={() => nav('/tutorial')}
          right={<span className="material-symbols-outlined text-on-surface-variant/40 text-sm">chevron_right</span>} />
        <Row icon="delete_forever" label="Reset Semua Data" sub="Hapus semua transaksi dan target" danger onClick={() => setResetOpen(true)}
          right={<span className="material-symbols-outlined text-error/30 text-sm">chevron_right</span>} />
        <Row icon="logout" label="Keluar" sub="Logout dari akun ini" danger onClick={() => setLogoutOpen(true)}
          right={<span className="material-symbols-outlined text-error/30 text-sm">chevron_right</span>} />
      </Section>

      {/* ── Modals ── */}

      {/* Edit profil */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profil">
        <div className="space-y-4">
          <div className="flex justify-center mb-1">
            <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary-container font-sora font-bold text-xl">
              {initials(form.name || 'TD')}
            </div>
          </div>
          {[
            { key: 'name',  label: 'Nama Lengkap', ph: 'Nama kamu',         type: 'text' },
            { key: 'email', label: 'Email',         ph: 'email@kamu.com',    type: 'email' },
            { key: 'phone', label: 'Nomor HP',      ph: '+62 812 xxxx xxxx', type: 'tel' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                type={f.type} placeholder={f.ph}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors" />
            </div>
          ))}
          <button onClick={saveProfile}
            className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm">
            Simpan Perubahan
          </button>
        </div>
      </Modal>

      {/* Ganti password */}
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

      {/* Kelola kategori */}
      <CategoryModal open={catOpen} onClose={() => setCatOpen(false)} />

      {/* Import */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Reset data */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Semua Data?">
        <div className="space-y-5">
          <div className="bg-error/8 border border-error/20 rounded-xl p-5 text-center">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="text-sm text-error font-semibold">Tindakan ini tidak bisa dibatalkan!</p>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">Semua transaksi dan target akan dihapus.<br />Akun tetap ada dan bisa digunakan kembali.</p>
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

      {/* Logout */}
      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Keluar dari Akun?">
        <div className="space-y-5">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5 text-center">
            <p className="text-3xl mb-2">👋</p>
            <p className="text-sm text-white font-semibold">Sampai jumpa, {S.user?.name?.split(' ')[0]}!</p>
            <p className="text-xs text-on-surface-variant mt-1">Data kamu tetap tersimpan dan bisa diakses lagi setelah login.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setLogoutOpen(false)}
              className="flex-1 py-3 bg-surface-container-high text-white font-bold rounded-xl border border-outline-variant hover:bg-surface-container-highest transition-all">
              Batal
            </button>
            <button onClick={() => S.logout()}
              className="flex-1 py-3 bg-error/20 text-error font-bold rounded-xl border border-error/30 hover:bg-error/30 transition-all">
              Ya, Keluar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
