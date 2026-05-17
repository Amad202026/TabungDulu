import { useState, useEffect, useRef } from 'react'

// Step definitions — each references a DOM element by data-onboard attribute
const STEPS = [
  {
    target: 'add-income',
    title: 'Mulai catat pemasukan',
    desc: 'Tap di sini untuk mencatat pemasukan kamu — gaji, freelance, atau sumber lainnya. Ini yang pertama perlu dilakukan!',
    arrow: 'down',
    align: 'right',
  },
  {
    target: 'add-expense',
    title: 'Catat pengeluaran',
    desc: 'Setelah ada pemasukan, catat setiap pengeluaran agar saldo bersih kamu selalu akurat.',
    arrow: 'down',
    align: 'right',
  },
  {
    target: 'nav-target',
    title: 'Buat target tabungan',
    desc: 'Di sini kamu bisa buat target — liburan, gadget, dana darurat. Dana dari saldo bersih bisa dialokasikan ke sini.',
    arrow: 'right',
    align: 'bottom',
  },
  {
    target: 'nav-ai',
    title: 'Tanya Tablu, AI keuanganmu',
    desc: 'Tablu bisa mencatat transaksi lewat chat, analisis keuangan, dan kasih saran hemat — tinggal ngobrol!',
    arrow: 'right',
    align: 'bottom',
  },
  {
    target: 'nav-profil',
    title: 'Profil & pengaturan',
    desc: 'Kelola akun, import/export data, ganti password, dan semua pengaturan ada di sini.',
    arrow: 'right',
    align: 'bottom',
  },
]

function getRect(target) {
  const el = document.querySelector(`[data-onboard="${target}"]`)
  if (!el) return null
  return el.getBoundingClientRect()
}

function Arrow({ dir }) {
  // SVG arrow pointing toward the target
  const arrows = {
    down:  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4 L16 26 M8 18 L16 28 L24 18" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    up:    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 28 L16 6 M8 14 L16 4 L24 14" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    right: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M4 16 L26 16 M18 8 L28 16 L18 24" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    left:  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M28 16 L6 16 M14 8 L4 16 L14 24" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  }
  return arrows[dir] || null
}

export default function Onboarding({ onDone }) {
  const [step, setStep]     = useState(0)
  const [pos,  setPos]      = useState(null)
  const [rect, setRect]     = useState(null)
  const rafRef = useRef(null)

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Track target element position
  useEffect(() => {
    let cancelled = false
    function tick() {
      if (cancelled) return
      const r = getRect(s.target)
      if (r) {
        setRect(r)
        // Compute tooltip position
        const tooltipW = 280
        const tooltipH = 160
        const margin   = 16
        let x, y

        if (s.arrow === 'down') {
          // Tooltip ABOVE target, centered on it
          x = Math.max(margin, Math.min(r.left + r.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - margin))
          y = r.top - tooltipH - 14
          if (y < margin) y = r.bottom + 14
        } else if (s.arrow === 'right') {
          // Tooltip to the RIGHT of target
          x = r.right + 14
          y = r.top + r.height / 2 - tooltipH / 2
          if (x + tooltipW > window.innerWidth - margin) x = r.left - tooltipW - 14
          y = Math.max(margin, Math.min(y, window.innerHeight - tooltipH - margin))
        } else {
          x = margin
          y = r.bottom + 14
        }

        setPos({ x, y })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current) }
  }, [step, s.target])

  const next = () => { if (isLast) onDone(); else setStep(p => p + 1) }
  const prev = () => setStep(p => p - 1)

  if (!pos) return null

  // Spotlight cutout around target
  const pad = 8
  const spotX = rect ? rect.left - pad : 0
  const spotY = rect ? rect.top  - pad : 0
  const spotW = rect ? rect.width  + pad * 2 : 0
  const spotH = rect ? rect.height + pad * 2 : 0

  // Arrow direction relative to tooltip→target
  const arrowDir = s.arrow

  return (
    <>
      {/* Overlay with spotlight hole */}
      <div className="fixed inset-0 z-[90] pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect x={spotX} y={spotY} width={spotW} height={spotH} rx="14" fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#spotlight-mask)" />
          {/* Glowing border around spotlight */}
          {rect && (
            <rect x={spotX} y={spotY} width={spotW} height={spotH} rx="14"
              fill="none" stroke="#00ff88" strokeWidth="1.5" opacity="0.6" />
          )}
        </svg>
      </div>

      {/* Click-blocker for background but allow spotlight through */}
      <div className="fixed inset-0 z-[89]" onClick={onDone} />

      {/* Tooltip card */}
      <div
        className="fixed z-[91] pointer-events-auto"
        style={{ left: pos.x, top: pos.y, width: 280 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-surface border border-primary-container/30 rounded-2xl p-5 shadow-2xl"
          style={{ boxShadow: '0 0 40px rgba(0,255,136,0.12)' }}>

          {/* Arrow indicator */}
          <div className={`flex mb-3 ${arrowDir === 'down' ? 'justify-center' : arrowDir === 'right' ? 'justify-start rotate-180' : 'justify-start'}`}>
            <Arrow dir={arrowDir === 'right' ? 'left' : arrowDir} />
          </div>

          {/* Step dots */}
          <div className="flex gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'bg-primary-container w-5' : i < step ? 'bg-primary-container/40 w-3' : 'bg-outline-variant w-3'}`} />
            ))}
          </div>

          <p className="text-sm font-sora font-bold text-white mb-1.5">{s.title}</p>
          <p className="text-xs text-on-surface-variant leading-relaxed mb-4">{s.desc}</p>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={prev}
                className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:text-white hover:bg-surface-container-high transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
            )}
            <button onClick={next}
              className="flex-1 py-2 bg-primary-container text-on-primary-container text-xs font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm">
              {isLast ? 'Selesai 🚀' : 'Lanjut →'}
            </button>
            <button onClick={onDone}
              className="w-8 h-8 rounded-lg text-on-surface-variant/40 hover:text-on-surface-variant transition-all flex items-center justify-center text-xs">
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
