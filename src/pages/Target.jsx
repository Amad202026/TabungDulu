import { useState } from 'react'
import { useStore } from '../store/appStore'
import { fmt, pct } from '../utils/format'
import ProgressBar from '../components/ui/ProgressBar'
import Modal from '../components/ui/Modal'
import { toast } from '../components/ui/Toast'

const ICONS = ['laptop_mac','beach_access','emergency','smartphone','directions_car','home','flight','school','sports_esports','fitness_center','shopping_bag','favorite','savings','restaurant','work','trending_up']

function IconPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {ICONS.map(ic => (
        <button key={ic} onClick={() => onChange(ic)} type="button"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${value === ic ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
          <span className="material-symbols-outlined text-[16px]">{ic}</span>
        </button>
      ))}
    </div>
  )
}

const EMPTY_FORM = { name: '', goal: '', icon: 'savings', deadline: '' }

export default function Target() {
  const S = useStore()
  const [addOpen,  setAddOpen]  = useState(false)
  const [detail,   setDetail]   = useState(null)   // for deposit/edit/delete modal
  const [editMode, setEditMode] = useState(false)  // inside detail modal
  const [deposit,  setDeposit]  = useState('')
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  const availableBalance = S.getAvailableBalance()

  // Sync detail with live data
  const currentDetail = detail ? (S.targets.find(t => t.id === detail.id) || null) : null

  const handleAdd = () => {
    if (!form.name || !form.goal) return toast('Nama dan nominal wajib diisi!', 'err')
    const goal = parseFloat(form.goal)
    if (isNaN(goal) || goal <= 0) return toast('Nominal tidak valid!', 'err')
    S.addTarget({ name: form.name, goal, icon: form.icon, deadline: form.deadline })
    toast('Target baru dibuat! 🎯')
    setForm(EMPTY_FORM)
    setAddOpen(false)
  }

  const handleDeposit = () => {
    const amt = parseFloat(deposit)
    if (!amt || amt <= 0) return toast('Masukkan nominal yang valid!', 'err')
    if (amt > availableBalance) return toast(`Melebihi saldo tersedia (${fmt(availableBalance)})!`, 'err')
    const actual = S.addToTarget(currentDetail.id, amt)
    if (!actual) return toast('Saldo tidak cukup!', 'err')
    toast(`${fmt(actual)} masuk ke ${currentDetail.name}! 💚`)
    setDeposit('')
    setDetail(null)
  }

  const openEdit = (t) => {
    setEditForm({ name: t.name, goal: String(t.goal), icon: t.icon || 'savings', deadline: t.deadline || '' })
    setEditMode(true)
  }

  const handleEdit = () => {
    if (!editForm.name || !editForm.goal) return toast('Nama dan nominal wajib diisi!', 'err')
    const goal = parseFloat(editForm.goal)
    if (isNaN(goal) || goal <= 0) return toast('Nominal tidak valid!', 'err')
    S.updateTarget(currentDetail.id, { name: editForm.name, goal, icon: editForm.icon, deadline: editForm.deadline })
    toast('Target diperbarui! ✅')
    setEditMode(false)
    setDetail(null)
  }

  const totalSaved = S.getTotalSaved()
  const totalGoal  = S.getTotalGoal()

  return (
    <div className="space-y-8 fade-up">

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Jumlah Target',   val: S.targets.length, suffix: 'target' },
          { label: 'Total Terkumpul', val: fmt(totalSaved),  suffix: '' },
          { label: 'Total Target',    val: fmt(totalGoal),   suffix: '' },
          { label: 'Saldo Tersedia',  val: fmt(availableBalance), suffix: '' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-outline-variant rounded-2xl p-5">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-xl font-sora font-bold text-white">{s.val}<span className="text-sm text-on-surface-variant ml-1">{s.suffix}</span></p>
          </div>
        ))}
      </div>

      {availableBalance > 0 ? (
        <div className="bg-primary-container/5 border border-primary-container/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-sm">info</span>
          <p className="text-sm text-on-surface-variant">Saldo tersedia untuk ditabung: <strong className="text-primary-container">{fmt(availableBalance)}</strong></p>
        </div>
      ) : S.getTotalIncome() > 0 ? (
        <div className="bg-error/5 border border-error/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-sm">warning</span>
          <p className="text-sm text-on-surface-variant">Saldo tidak tersedia. Tambah pemasukan dahulu.</p>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-sora font-semibold text-white">Daftar Target</h3>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary-container font-bold rounded-full text-sm hover:brightness-110 active:scale-95 transition-all glow-sm">
          <span className="material-symbols-outlined text-sm">add</span>Tambah Target
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {S.targets.map(t => {
          const p = pct(t.saved, t.goal)
          return (
            <div key={t.id} onClick={() => { setDetail(t); setDeposit(''); setEditMode(false) }}
              className="bg-surface-container border border-outline-variant rounded-2xl p-5 cursor-pointer hover:border-primary-container/40 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center group-hover:border-primary-container/30 transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-[22px]">{t.icon || 'savings'}</span>
                </div>
                <span className="text-xs font-bold text-primary-container bg-primary-container/10 px-2 py-1 rounded-lg">{p}%</span>
              </div>
              <p className="font-sora font-semibold text-white mb-1">{t.name}</p>
              <p className="text-xs text-on-surface-variant mb-3">{fmt(t.saved)} dari {fmt(t.goal)}</p>
              <ProgressBar value={p} />
              <div className="flex justify-between mt-3 text-xs text-on-surface-variant">
                <span>Sisa: {fmt(t.goal - t.saved)}</span>
                {t.deadline && <span>⏰ {t.deadline}</span>}
              </div>
            </div>
          )
        })}

        <div onClick={() => setAddOpen(true)}
          className="border-2 border-dashed border-outline-variant rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary-container/40 transition-all min-h-[180px]">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[22px]">add</span>
          </div>
          <p className="text-sm text-on-surface-variant">Tambah Target Baru</p>
        </div>
      </div>

      {/* ── Modal tambah target ── */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setForm(EMPTY_FORM) }} title="Buat Target Baru">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nama Target</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors"
              placeholder="MacBook Pro, Liburan Bali..." />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Target (Rp)</label>
            <input value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} type="number"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors" placeholder="0" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Icon</label>
            <IconPicker value={form.icon} onChange={ic => setForm({ ...form, icon: ic })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Deadline (opsional)</label>
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors" />
          </div>
          <button onClick={handleAdd}
            className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm">
            Buat Target 🎯
          </button>
        </div>
      </Modal>

      {/* ── Modal detail/deposit/edit ── */}
      {currentDetail && (
        <Modal open={!!detail} onClose={() => { setDetail(null); setDeposit(''); setEditMode(false) }}
          title={editMode ? `Edit: ${currentDetail.name}` : currentDetail.name}>
          {editMode ? (
            /* Edit form */
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nama Target</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Target (Rp)</label>
                <input value={editForm.goal} onChange={e => setEditForm({ ...editForm, goal: e.target.value })} type="number"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Icon</label>
                <IconPicker value={editForm.icon} onChange={ic => setEditForm({ ...editForm, icon: ic })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Deadline</label>
                <input type="date" value={editForm.deadline} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditMode(false)}
                  className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high transition-all">
                  Batal
                </button>
                <button onClick={handleEdit}
                  className="flex-[2] py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm">
                  Simpan Perubahan ✅
                </button>
              </div>
            </div>
          ) : (
            /* Deposit form */
            <div className="space-y-5">
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-on-surface-variant">Progress</span>
                  <span className="text-primary-container font-bold">{pct(currentDetail.saved, currentDetail.goal)}%</span>
                </div>
                <ProgressBar value={pct(currentDetail.saved, currentDetail.goal)} className="mb-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Terkumpul: <strong className="text-white">{fmt(currentDetail.saved)}</strong></span>
                  <span className="text-on-surface-variant">Sisa: <strong className="text-white">{fmt(currentDetail.goal - currentDetail.saved)}</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-on-surface-variant">Saldo tersedia</span>
                <span className={`text-sm font-bold ${availableBalance > 0 ? 'text-primary-container' : 'text-error'}`}>{fmt(availableBalance)}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tambah Dana (Rp)</label>
                <input value={deposit} onChange={e => setDeposit(e.target.value)} type="number"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-2xl font-sora font-bold outline-none focus:border-primary-container transition-colors"
                  placeholder={availableBalance > 0 ? `Maks. ${fmt(availableBalance)}` : 'Saldo tidak tersedia'} />
                {deposit && parseFloat(deposit) > availableBalance && (
                  <p className="text-xs text-error mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    Melebihi saldo tersedia
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => openEdit(currentDetail)}
                  className="flex items-center gap-1.5 px-4 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high transition-all text-sm">
                  <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                </button>
                <button onClick={() => { S.deleteTarget(detail.id); setDetail(null); toast('Target dihapus') }}
                  className="px-4 py-3 bg-error/10 text-error font-bold rounded-xl border border-error/20 hover:bg-error/20 transition-all">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
                <button onClick={handleDeposit} disabled={availableBalance <= 0}
                  className="flex-1 py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  Simpan Dana 💚
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
