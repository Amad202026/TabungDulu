import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/appStore'
import { askAI, parseAction } from '../services/groqService'
import { toast } from '../components/ui/Toast'
import { fmt } from '../utils/format'

const QUICK = [
  { label:'Kondisi keuanganku?',      icon:'account_balance_wallet' },
  { label:'Perminggu gaji 500rb',     icon:'event_repeat' },
  { label:'Saran hemat bulan ini',    icon:'tips_and_updates' },
  { label:'Tadi makan 45rb',          icon:'restaurant' },
  { label:'Hapus semua data ku',      icon:'delete_sweep' },
  { label:'Boleh beli HP 3 juta?',    icon:'shopping_bag' },
]

function freqLabel(r) {
  if (r.freq === 'daily')  return 'setiap hari'
  if (r.freq === 'weekly') return 'setiap minggu'
  return `setiap tgl ${r.day || 1}`
}

function execAction(action, S) {
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
      const currentBalance = S.getBalance();
      if (d.amount > currentBalance) {
        toast(`❌ Gagal! Saldo kamu tidak cukup untuk setor ${fmt(d.amount)}!`, 'err');
        break;
      }
      const t = S.targets.find(t => t.name.toLowerCase().includes((d.targetName || '').toLowerCase()))
      if (t) { 
        S.addToTarget(t.id, d.amount); 
        toast(`💚 ${fmt(d.amount)} masuk ke ${t.name}!`) 
      }
      else toast('Target tidak ditemukan', 'err')
      break
    }
    case 'add_target': {
      let savedAmt = d.saved || 0;
      const currentBalance = S.getBalance();
      if (savedAmt > currentBalance) {
        toast(`⚠️ Saldo tidak cukup untuk isi awal! Target dibuat dengan isi Rp 0.`, 'err');
        savedAmt = 0;
      }
      S.addTarget({ name: d.name, goal: d.goal, saved: savedAmt, icon: d.icon || 'savings' })
      toast(`🎯 Target "${d.name}" dibuat!`)
      break
    }
    case 'delete_last_transaction': S.deleteLastTransaction(); toast('🗑️ Transaksi terakhir dihapus!'); break
    case 'delete_specific_target': if (S.deleteTarget) { S.deleteTarget(d.id); toast(`🗑️ Target berhasil dihapus!`) } break
    case 'update_transaction': if (S.updateTransaction) { S.updateTransaction(d.id, d.updates); toast(`✏️ Transaksi berhasil diperbarui!`) } break
    case 'delete_specific_transaction': if (S.deleteTransaction) { S.deleteTransaction(d.id); toast(`🗑️ Transaksi berhasil dihapus!`) } break
    case 'edit_target': if (S.editTarget) { S.editTarget(d.id, d.updates); toast(`🎯 Target berhasil diperbarui!`) } break
    case 'clear_all_transactions': S.clearAllTransactions(); toast('🗑️ Semua transaksi dihapus!'); break
    case 'clear_all_targets': S.clearAllTargets(); toast('🗑️ Semua target dihapus!'); break
    case 'clear_all_recurring': S.clearAllRecurring(); toast('🗑️ Semua jadwal dihapus!'); break
    case 'clear_all_data': S.clearAllData(); toast('🧹 Semua data dihapus!'); break
    default: break
  }
}

export default function AIAdvisor() {
  const S           = useStore()
  const [inp, setInp]         = useState('')
  const [typing, setTyping]   = useState(false)
  
  // STATE UNTUK SISTEM "HEY GOOGLE"
  const [micActive, setMicActive]   = useState(false) 
  const [tabluAwake, setTabluAwake] = useState(false) 
  const [isSpeaking, setIsSpeaking] = useState(false) 
  const [isMuted, setIsMuted]       = useState(false) 
  
  const bottomRef       = useRef(null)
  const recognitionRef  = useRef(null)
  const transcriptBuf   = useRef('')
  const silenceTimer    = useRef(null)
  const isSpeakingRef   = useRef(false)
  const tabluAwakeRef   = useRef(false)
  const micActiveRef    = useRef(false)
  const sendRef         = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [S.aiChats, typing])

  useEffect(() => { sendRef.current = send }, [inp, S, isMuted])

  // --- FUNGSI TABLU NGOMONG (TEXT TO SPEECH) ---
  const speakTablu = (text, onEndCb) => {
    if (isMuted || !window.speechSynthesis) {
      if (onEndCb) onEndCb();
      return;
    }

    let cleanText = text.replace(/[*_#]/g, '').replace(/```.*/g, '');
    window.speechSynthesis.cancel(); 

    isSpeakingRef.current = true; 
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID'; 
    utterance.rate = 1.05; 

    utterance.onend = () => {
      isSpeakingRef.current = false; 
      setIsSpeaking(false);
      if (onEndCb) onEndCb();
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      if (onEndCb) onEndCb();
    };

    const voices = window.speechSynthesis.getVoices();
    const indoVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if (indoVoice) utterance.voice = indoVoice;

    window.speechSynthesis.speak(utterance);
  }

  // --- LOGIKA MIKROFON (STANDBY & AWAKE MODE) ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'id-ID';

    recog.onresult = (e) => {
      if (isSpeakingRef.current) return;

      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }

      const currentStr = (final + " " + interim).toLowerCase();

      // MODE 1: STANDBY (Nunggu dipanggil)
      if (!tabluAwakeRef.current) {
        // DETEKSI ANTI-SALAH DENGAR (Tablu, Tablo, Taplu, Taplo)
        if (/tablu|tablo|taplu|taplo|ta blu|ta blo/i.test(currentStr)) {
          tabluAwakeRef.current = true;
          setTabluAwake(true);
          transcriptBuf.current = '';
          setInp('');
          
          speakTablu("Iya, ada yang bisa dibantu?");
        }
      } 
      // MODE 2: AWAKE (Dengerin perintah setelah dipanggil)
      else {
        if (final) transcriptBuf.current += " " + final;
        setInp((transcriptBuf.current + " " + interim).trim());

        clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(() => {
          const cmd = transcriptBuf.current.trim();
          if (cmd) {
            tabluAwakeRef.current = false;
            setTabluAwake(false);
            if(sendRef.current) sendRef.current(cmd);
            transcriptBuf.current = '';
          }
        }, 2500);
      }
    };

    recog.onend = () => {
      if (micActiveRef.current && !isSpeakingRef.current) {
        try { recog.start(); } catch (err) {}
      }
    };

    recognitionRef.current = recog;

    if (micActive) {
      micActiveRef.current = true;
      try { recog.start(); toast("🎙️ Mode Voice Assistant Aktif! Panggil 'Hey Tablu'"); } catch(e){}
    } else {
      micActiveRef.current = false;
      tabluAwakeRef.current = false;
      setTabluAwake(false);
      recog.stop();
    }

    return () => { micActiveRef.current = false; recog.stop(); };
  }, [micActive]);


  // --- FUNGSI MENGIRIM PESAN ---
  const send = async (q) => {
    const msg = (q || inp).trim()
    if (!msg) return
    
    setInp('')
    transcriptBuf.current = ''
    clearTimeout(silenceTimer.current)
    
    S.addAIChat({ role: 'user', text: msg })
    setTyping(true)

    // Cek apakah pesan ketikan mengandung panggilan Tablu/Tablo
    const isCallingTablu = /tablu|tablo|taplu|taplo/i.test(msg);

    const ctx = {
      balance:      S.getBalance(),
      totalIncome:  S.getTotalIncome(),
      totalExpense: S.getTotalExpense(),
      targets:      S.targets,
      transactions: S.transactions.slice(0, 20),
      recurring:    S.recurring,
    }

    const history = S.aiChats.map(c => ({
      role: c.role === 'ai' ? 'model' : 'user',
      parts: [{ text: c.text }]
    }))

    try {
      const raw = await askAI(msg, ctx, history)
      const { actions, clean } = parseAction(raw)
      
      if (actions && actions.length > 0) {
        actions.forEach(act => execAction(act, S))
      }

      const finalReply = clean || raw;
      S.addAIChat({ role: 'ai', text: finalReply })
      
      speakTablu(finalReply, () => {
        if (micActiveRef.current) {
          try { recognitionRef.current.start(); } catch(e) {}
        }
      });

    } catch (error) {
      const errText = "Waduh, koneksi ke otak Tablu lagi putus nih. Coba bentar lagi ya!";
      S.addAIChat({ role: 'ai', text: errText })
      speakTablu(errText);
      console.error(error)
    } finally {
      setTyping(false)
    }
  }

  const fmt2 = (txt = '') =>
    txt.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')

  return (
    <div className="fade-up h-[calc(100vh-80px-64px)] lg:h-[calc(100vh-80px-48px)] flex flex-col lg:flex-row gap-5">

      {/* ── Panel chat ── */}
      <div className="flex-1 bg-surface border border-outline-variant rounded-2xl flex flex-col min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant flex items-center justify-between shrink-0 bg-surface-container-high/20">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <div>
              <p className="text-sm font-sora font-semibold text-white leading-none">Tablu</p>
              <p className="text-[10px] text-primary-container">● siap melayani</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsMuted(!isMuted); window.speechSynthesis.cancel() }}
              className={`flex items-center gap-1.5 text-xs transition-colors border px-3 py-1.5 rounded-lg ${
                isMuted ? 'border-error/50 text-error hover:bg-error/10' : 'border-outline-variant text-primary-container hover:bg-surface-container-high'
              }`}>
              <span className="material-symbols-outlined text-sm">{isMuted ? 'volume_off' : 'volume_up'}</span>
              {isMuted ? 'Bisu' : 'Suara'}
            </button>
            <button onClick={() => { S.clearAIChat(); toast('Chat direset') }}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors border border-outline-variant px-3 py-1.5 rounded-lg hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-sm">refresh</span>Reset
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4 min-h-0">
          {S.aiChats.map((c, i) => (
            <div key={i} className={`flex gap-2.5 ${c.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm border ${
                c.role === 'ai'
                  ? 'bg-surface-container-high border-outline-variant'
                  : 'bg-primary-container/20 border-primary-container/20'
              }`}>
                {c.role === 'ai' ? '🤖' : '👤'}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed border max-w-[80%] ${
                c.role === 'ai'
                  ? 'bg-surface-container border-outline-variant rounded-tl-sm text-on-surface'
                  : 'bg-surface-container-high border-outline-variant rounded-tr-sm text-white'
              }`} style={{ whiteSpace: 'pre-wrap' }}>
                {fmt2(c.text)}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-sm">🤖</div>
              <div className="bg-surface-container border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-primary-container/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-outline-variant shrink-0">
          {QUICK.map(q => (
            <button key={q.label} onClick={() => send(q.label)}
              className="shrink-0 flex items-center gap-1.5 text-[11px] bg-surface-container border border-outline-variant px-3 py-1.5 rounded-full hover:border-primary-container hover:text-primary-container transition-colors text-on-surface-variant whitespace-nowrap">
              <span className="material-symbols-outlined text-[12px]">{q.icon}</span>
              {q.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-outline-variant shrink-0 flex gap-3 items-end">
          
          {/* TOMBOL MIC (Standby Mode Toggle) */}
          <button 
            onClick={() => setMicActive(!micActive)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
              isSpeaking
                ? 'bg-surface-container-high text-on-surface-variant opacity-50'
                : tabluAwake 
                ? 'bg-primary-container text-on-primary-container border-primary-container animate-pulse'
                : micActive
                ? 'bg-success/20 text-success border-success'
                : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-white hover:border-primary-container'
            }`}
            title="Nyalakan Mode Voice Assistant"
          >
            <span className="material-symbols-outlined text-[20px]">
              {micActive || tabluAwake ? 'mic' : 'mic_none'}
            </span>
          </button>

          <textarea
            value={inp}
            onChange={e => setInp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            rows={1}
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all placeholder-on-surface-variant/50 resize-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            placeholder={
              isSpeaking ? "Tablu sedang bicara..." :
              tabluAwake ? "Tablu mendengarkan perintahmu..." :
              micActive  ? "Mode Standby (Panggil 'Hey Tablu')" :
              "Ngobrol sama Tablu... (Enter untuk kirim)"
            }
          />
          <button onClick={() => send()}
            disabled={!inp.trim() && !typing}
            className="w-11 h-11 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shrink-0 glow-sm disabled:opacity-40">
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>
    </div>
  )
}