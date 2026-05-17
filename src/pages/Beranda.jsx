import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/appStore'
import { fmt, pct, fmtDate } from '../utils/format'
import { catIcon } from '../constants/categories'
import ProgressBar from '../components/ui/ProgressBar'
import { askAI, parseAction } from '../services/geminiService'
import { toast } from '../components/ui/Toast'

export default function Beranda({ onIncome, onExpense }) {
  const nav   = useNavigate()
  const S     = useStore()
  const totalIn   = S.getTotalIncome()
  const totalOut  = S.getTotalExpense()
  const balance   = S.getBalance()        // income - expense
  const available = S.getAvailableBalance() // income - expense - saved
  const saved     = S.getTotalSaved()
  const goal      = S.getTotalGoal()
  const progress  = pct(saved, goal)

  const [inp, setInp]     = useState('')
  const [typing, setTyping] = useState(false)

  const sendAI = async (q) => {
    const msg = q || inp.trim()
    if (!msg) return
    setInp('')
    S.addAIChat({ role:'user', text:msg })
    setTyping(true)
    const ctx = { balance, available, totalIncome:totalIn, totalExpense:totalOut, totalSaved:saved, totalGoal:goal, progress, targets:S.targets }
    const res = await askAI(msg, ctx)
    const { action, clean } = parseAction(res)

    if (action) {
      const d = action.data || {}
      switch (action.action) {
        case 'add_transaction':
          S.addTransaction(d)
          toast(`${d.type === 'income' ? '📈' : '📉'} ${d.note} ${fmt(d.amount)} dicatat!`)
          break
        case 'add_recurring':
          S.addRecurring(d)
          toast(`🔄 Jadwal "${d.note}" disimpan!`)
          break
        case 'add_to_target': {
          const t = S.targets.find(t => t.name.toLowerCase().includes((d.targetName||'').toLowerCase()))
          if (t) { S.addToTarget(t.id, d.amount); toast(`💚 ${fmt(d.amount)} masuk ke ${t.name}!`) }
          break
        }
        case 'add_target':
          S.addTarget({ name:d.name, goal:d.goal, saved:0, icon:d.icon||'savings' })
          toast(`🎯 Target "${d.name}" dibuat!`)
          break
        case 'delete_last_transaction':
          S.deleteLastTransaction(); toast('↩️ Transaksi terakhir dibatalkan!'); break
        case 'delete_specific_transaction':
          S.deleteTransaction(d.id); toast('🗑️ Transaksi dihapus!'); break
        case 'update_transaction':
          S.updateTransaction(d.id, d.updates); toast('✏️ Transaksi diperbarui!'); break
        case 'update_target':
        case 'edit_target':
          S.updateTarget(d.id, d.updates || d); toast('🎯 Target diperbarui!'); break
        case 'delete_specific_target':
          S.deleteTarget(d.id); toast('🗑️ Target dihapus!'); break
        case 'clear_all_transactions':
          S.clearAllTransactions(); toast('🗑️ Semua transaksi dihapus!'); break
        case 'clear_all_targets':
          S.clearAllTargets(); toast('🗑️ Semua target dihapus!'); break
        case 'clear_all_recurring':
          S.clearAllRecurring(); toast('🗑️ Semua jadwal dihapus!'); break
        case 'clear_all_data':
          S.clearAllData(); toast('🧹 Semua data dihapus!'); break
        default: break
      }
    }
    S.addAIChat({ role:'ai', text: clean || res })
    setTyping(false)
  }

  const recentChats = S.aiChats.slice(-5)

  return (
    <div className="space-y-8 fade-up">

      {/* ── Kartu saldo utama ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-7 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-primary-container/5 rounded-full blur-3xl group-hover:bg-primary-container/10 transition-all" />
          <p className="text-[10px] font-bold text-primary-container uppercase tracking-widest mb-2">SALDO BERSIH</p>
          <h2 className="text-4xl lg:text-5xl font-sora font-bold text-white tracking-tight mb-1">{fmt(balance)}</h2>
          <p className="text-sm text-on-surface-variant mb-5">Tersedia untuk ditabung: <strong className="text-primary-container">{fmt(available)}</strong></p>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Target total: {fmt(goal)}</span>
              <span className="text-primary-container font-bold">{progress}% Tercapai</span>
            </div>
            <ProgressBar value={progress} />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-5 border-t border-outline-variant">
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Pemasukan</p>
              <p className="text-lg font-bold text-primary-container font-sora">+{fmt(totalIn)}</p>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Pengeluaran</p>
              <p className="text-lg font-bold text-error font-sora">-{fmt(totalOut)}</p>
            </div>
          </div>
        </div>

        {/* Aksi cepat */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-6 flex flex-col gap-3">
          <p className="text-sm font-sora font-semibold text-white mb-1">Aksi Cepat</p>
          {[
            { label:'Tambah Pemasukan', icon:'add_circle', color:'text-primary-container bg-primary-container/10 border-primary-container/20 hover:bg-primary-container/20', fn:onIncome },
            { label:'Catat Pengeluaran',icon:'remove_circle',color:'text-error bg-error/10 border-error/20 hover:bg-error/20', fn:onExpense },
            { label:'Isi Target',       icon:'savings',    color:'text-on-surface-variant bg-surface-container-high border-outline-variant hover:bg-surface-container-highest', fn:()=>nav('/target') },
            { label:'Lihat Laporan',    icon:'bar_chart',  color:'text-on-surface-variant bg-surface-container-high border-outline-variant hover:bg-surface-container-highest', fn:()=>nav('/laporan') },
          ].map(a=>(
            <button key={a.label} onClick={a.fn}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${a.color}`}>
              <span className="material-symbols-outlined text-[20px]">{a.icon}</span>
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Target Tabungan ── */}
      <section>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-lg font-sora font-semibold text-white">Target Tabungan</h3>
            <p className="text-sm text-on-surface-variant">Wujudkan impianmu satu per satu</p>
          </div>
          <button onClick={()=>nav('/target')} className="text-sm text-primary-container hover:underline flex items-center gap-1">
            Lihat semua <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {S.targets.slice(0,3).map(t=>{
            const p = pct(t.saved,t.goal)
            return (
              <div key={t.id} onClick={()=>nav('/target')}
                className="bg-surface border border-outline-variant rounded-2xl p-5 cursor-pointer hover:border-primary-container/40 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:bg-primary-container group-hover:text-on-primary-container transition-all">
                    <span className="material-symbols-outlined text-[20px]">{t.icon||'savings'}</span>
                  </div>
                  <span className="text-xs font-bold text-primary-container">{p}%</span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{t.name}</p>
                <p className="text-xs text-on-surface-variant mb-3">{fmt(t.saved)} dari {fmt(t.goal)}</p>
                <ProgressBar value={p} />
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Transaksi + AI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-7">

        {/* Transaksi terbaru */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-sora font-semibold text-white">Riwayat Transaksi</h3>
            <button onClick={()=>nav('/laporan')} className="text-sm text-primary-container hover:underline">Lihat semua →</button>
          </div>
          <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden">
            {S.transactions.length===0
              ? <div className="p-10 text-center text-on-surface-variant text-sm">Belum ada transaksi. Yuk catat!</div>
              : S.transactions.slice(0,6).map(t=>{
                const inc = t.type==='income'
                return (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-4 border-b border-outline-variant last:border-0 hover:bg-surface-container-high/30 transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${inc?'bg-primary-container/10 text-primary-container':'bg-error/10 text-error'}`}>
                      <span className="material-symbols-outlined text-[18px]">{catIcon(t.category)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{t.note}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{t.category} · {fmtDate(t.date)}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${inc?'text-primary-container':'text-error'}`}>
                      {inc?'+':'-'}{fmt(t.amount)}
                    </p>
                  </div>
                )
              })
            }
          </div>
        </div>

        {/* AI mini chat */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-sora font-semibold text-white mb-5">AI Advisor</h3>
          <div className="bg-surface border border-outline-variant rounded-2xl flex flex-col" style={{height:'370px'}}>
            {/* header */}
            <div className="px-4 py-3 border-b border-outline-variant flex items-center gap-3 bg-surface-container-high/30">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-container text-sm">smart_toy</span>
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary-container rounded-full border-2 border-surface blink" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">TabungDulu Advisor</p>
                <p className="text-[10px] text-primary-container">Online</p>
              </div>
            </div>
            {/* messages */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin">
              {recentChats.map((c,i)=>(
                <div key={i} className={`flex gap-2 ${c.role==='user'?'flex-row-reverse':''}`}>
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${c.role==='ai'?'bg-surface-container-high border border-outline-variant text-on-surface-variant':'bg-primary-container text-on-primary-container'}`}>
                    <span className="material-symbols-outlined text-xs">{c.role==='ai'?'smart_toy':'person'}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[85%] border ${c.role==='ai'?'bg-surface-container border-outline-variant rounded-tl-none text-on-surface':'bg-surface-container-high border-outline-variant rounded-tr-none text-on-surface'}`}
                    style={{whiteSpace:'pre-wrap'}}>
                    {c.text.replace(/\*\*(.*?)\*\*/g,'$1')}
                  </div>
                </div>
              ))}
              {typing&&(
                <div className="flex gap-1 pl-9">
                  {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-primary-container/60 rounded-full animate-bounce" style={{animationDelay:`${i*.2}s`}} />)}
                </div>
              )}
            </div>
            {/* chips */}
            <div className="px-3 py-1.5 flex gap-2 overflow-x-auto scrollbar-hide border-t border-outline-variant">
              {['Kondisi tabungan?','Saran hemat','Info target'].map(q=>(
                <button key={q} onClick={()=>sendAI(q)}
                  className="shrink-0 text-[10px] bg-surface-container border border-outline-variant px-2.5 py-1.5 rounded-full hover:border-primary-container transition-colors text-on-surface-variant whitespace-nowrap">
                  {q}
                </button>
              ))}
            </div>
            {/* input */}
            <div className="p-3 border-t border-outline-variant flex gap-2">
              <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendAI()}
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl text-xs py-2 px-3 text-white outline-none focus:border-primary-container transition-colors placeholder-on-surface-variant/50"
                placeholder="Tanyakan apa saja..." />
              <button onClick={()=>sendAI()}
                className="w-8 h-8 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}