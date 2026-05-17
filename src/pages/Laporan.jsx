import { useState } from 'react'
import { useStore } from '../store/appStore'
import { fmt, fmtDate, pct } from '../utils/format'
import { catIcon } from '../constants/categories'
import { toast } from '../components/ui/Toast'
import TxnModal from '../components/ui/TxnModal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#00ff88','#00e479','#60ff99','#849585','#b9cbb9','#4a4949']

export default function Laporan() {
  const S        = useStore()
  const totalIn  = S.getTotalIncome()
  const totalOut = S.getTotalExpense()
  const balance  = totalIn - totalOut
  const [editTxn,     setEditTxn]     = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)

  const byCat = S.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc }, {})
  const catData = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, pct: pct(value, totalOut) }))

  // Bar chart from real monthly data
  const byMonth = S.transactions.reduce((acc, t) => {
    const m = t.date?.slice(0, 7) || ''
    if (!acc[m]) acc[m] = { masuk: 0, keluar: 0 }
    if (t.type === 'income') acc[m].masuk += t.amount
    else acc[m].keluar += t.amount
    return acc
  }, {})
  const barData = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([m, v]) => ({ name: new Date(m + '-01').toLocaleDateString('id-ID', { month: 'short' }), ...v }))

  const handleUndo = (txn) => {
    S.deleteTransaction(txn.id)
    toast(`↩️ "${txn.note}" dibatalkan, saldo dikembalikan`)
  }

  return (
    <div className="space-y-8 fade-up">

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Total Pemasukan',  val: fmt(totalIn),           color: 'text-primary-container', pre: '+' },
          { label: 'Total Pengeluaran', val: fmt(totalOut),          color: 'text-error',             pre: '-' },
          { label: 'Saldo Bersih',     val: fmt(Math.abs(balance)), color: balance >= 0 ? 'text-primary-container' : 'text-error', pre: balance >= 0 ? '+' : '-' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-outline-variant rounded-2xl p-6">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-2xl font-sora font-bold ${s.color}`}>{s.pre}{s.val}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-outline-variant rounded-2xl p-6">
          <h3 className="text-sm font-sora font-semibold text-white mb-5">Pemasukan vs Pengeluaran</h3>
          {barData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#b9cbb9', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#b9cbb9', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1e6).toFixed(0)}jt`} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#1f1f1f', border: '1px solid #3b4b3d', borderRadius: '12px', color: '#e2e2e2' }} />
                  <Bar dataKey="masuk"  fill="#00ff88" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="keluar" fill="#ffb4ab" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-3">
                {[{ c: '#00ff88', l: 'Pemasukan' }, { c: '#ffb4ab', l: 'Pengeluaran' }].map(x => (
                  <div key={x.l} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: x.c }} />
                    <span className="text-xs text-on-surface-variant">{x.l}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-on-surface-variant text-sm">Belum ada data transaksi</div>
          )}
        </div>

        <div className="bg-surface border border-outline-variant rounded-2xl p-6">
          <h3 className="text-sm font-sora font-semibold text-white mb-5">Distribusi Pengeluaran</h3>
          {catData.length > 0 ? (
            <div className="flex gap-4 items-center">
              <PieChart width={130} height={130}>
                <Pie data={catData} cx={60} cy={60} innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
              <div className="flex-1 space-y-2">
                {catData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-on-surface-variant truncate">{c.name}</span>
                    </div>
                    <span className="text-xs font-bold text-white shrink-0">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-on-surface-variant text-sm">Belum ada data</div>
          )}
        </div>
      </div>

      {/* Riwayat lengkap */}
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-sm font-sora font-semibold text-white">{S.transactions.length} Transaksi</h3>
          {S.transactions.length > 0 && (
            <button onClick={() => setConfirmDel(S.transactions[0])}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-error transition-colors px-3 py-1.5 rounded-lg hover:bg-error/10 border border-transparent hover:border-error/20">
              <span className="material-symbols-outlined text-sm">undo</span> Batalkan terakhir
            </button>
          )}
        </div>
        {S.transactions.length === 0
          ? <div className="p-10 text-center text-on-surface-variant text-sm">Belum ada transaksi</div>
          : <div>
              {S.transactions.map((t, idx) => {
                const inc = t.type === 'income'
                const isFirst = idx === 0
                return (
                  <div key={t.id} className={`flex items-center gap-4 px-5 py-4 border-b border-outline-variant last:border-0 hover:bg-surface-container-high/20 group transition-all ${isFirst ? 'bg-primary-container/3' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${inc ? 'bg-primary-container/10 text-primary-container' : 'bg-error/10 text-error'}`}>
                      <span className="material-symbols-outlined text-[18px]">{catIcon(t.category)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{t.note}</p>
                        {isFirst && <span className="text-[9px] bg-primary-container/10 text-primary-container px-1.5 py-0.5 rounded-full shrink-0">Terbaru</span>}
                      </div>
                      <p className="text-[10px] text-on-surface-variant">{t.category} · {fmtDate(t.date)}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${inc ? 'text-primary-container' : 'text-error'}`}>
                      {inc ? '+' : '-'}{fmt(t.amount)}
                    </p>
                    {/* Actions on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setEditTxn(t)} title="Edit"
                        className="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-white flex items-center justify-center transition-all">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button onClick={() => setConfirmDel(t)} title="Hapus"
                        className="w-7 h-7 rounded-lg bg-error/10 text-error hover:bg-error/20 flex items-center justify-center transition-all">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>

      {/* Edit modal */}
      <TxnModal open={!!editTxn} onClose={() => setEditTxn(null)} editTxn={editTxn} />

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDel(null)}>
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-base font-sora font-bold text-white mb-1">Hapus Transaksi?</p>
            <p className="text-sm text-on-surface-variant mb-1">"{confirmDel.note}"</p>
            <p className="text-sm font-bold text-primary-container mb-5">{confirmDel.type === 'income' ? '+' : '-'}{fmt(confirmDel.amount)}</p>
            <p className="text-xs text-on-surface-variant mb-5">Saldo akan dikembalikan seperti sebelum transaksi ini dicatat.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high transition-all text-sm">
                Batal
              </button>
              <button onClick={() => { handleUndo(confirmDel); setConfirmDel(null) }}
                className="flex-1 py-2.5 bg-error/15 text-error font-bold rounded-xl border border-error/20 hover:bg-error/25 transition-all text-sm">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
