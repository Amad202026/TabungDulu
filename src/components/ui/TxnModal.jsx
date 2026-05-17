import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useStore } from '../../store/appStore'
import { toast } from './Toast'
import { catIcon } from '../../constants/categories'

export default function TxnModal({ open, onClose, defaultType = 'income', editTxn = null }) {
  const S    = useStore()
  const [type, setType]         = useState(defaultType)
  const [note, setNote]         = useState('')
  const [amount, setAmount]     = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0])

  // Sync with editTxn
  useEffect(() => {
    if (editTxn) {
      setType(editTxn.type)
      setNote(editTxn.note)
      setAmount(String(editTxn.amount))
      setCategory(editTxn.category)
      setDate(editTxn.date)
    } else {
      setType(defaultType)
      setNote(''); setAmount(''); setCategory(''); setDate(new Date().toISOString().split('T')[0])
    }
  }, [open, editTxn, defaultType])

  const cats = type === 'income' ? S.categories.income : S.categories.expense

  const save = () => {
    if (!note.trim() || !amount) return toast('Harap isi keterangan dan nominal!', 'err')
    const amt = parseFloat(String(amount).replace(/\./g, ''))
    if (isNaN(amt) || amt <= 0) return toast('Nominal tidak valid!', 'err')

    if (editTxn) {
      S.updateTransaction(editTxn.id, { type, note: note.trim(), amount: amt, category: category || cats[0], date })
      toast('Transaksi diperbarui! ✅')
    } else {
      S.addTransaction({ type, note: note.trim(), amount: amt, category: category || cats[0], date })
      toast(`${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} dicatat! ✅`)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editTxn ? 'Edit Transaksi' : 'Catat Transaksi'}>
      <div className="space-y-4">
        <div className="flex rounded-xl bg-surface-container-high p-1 gap-1">
          {['income', 'expense'].map(tp => (
            <button key={tp} onClick={() => { setType(tp); setCategory('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${type === tp ? 'bg-primary-container text-on-primary-container glow-sm' : 'text-on-surface-variant hover:text-white'}`}>
              {tp === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Keterangan</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-primary-container transition-colors"
            placeholder={type === 'income' ? 'Gaji, Freelance...' : 'Makanan, Transport...'} />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nominal (Rp)</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number"
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-white text-2xl font-sora font-bold outline-none focus:border-primary-container transition-colors"
            placeholder="0" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-3 text-white text-sm outline-none focus:border-primary-container">
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tanggal</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-3 text-white text-sm outline-none focus:border-primary-container transition-colors" />
          </div>
        </div>

        <button onClick={save}
          className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-xl text-base hover:brightness-110 active:scale-95 transition-all glow-sm mt-1">
          {editTxn ? 'Simpan Perubahan' : 'Simpan Transaksi'}
        </button>
      </div>
    </Modal>
  )
}
