import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    icon: 'add_circle',
    color: 'text-primary-container bg-primary-container/10',
    title: 'Catat Pemasukan & Pengeluaran',
    desc: 'Tap tombol "Tambah Pemasukan" atau "Catat Pengeluaran" di beranda. Isi keterangan, nominal, kategori, dan tanggal. Semua data tersimpan otomatis.',
    tip: '💡 Biasakan catat setiap hari agar laporan keuanganmu akurat!',
  },
  {
    icon: 'savings',
    color: 'text-yellow-400 bg-yellow-400/10',
    title: 'Buat Target Tabungan',
    desc: 'Buka halaman Target, lalu tap "Tambah Target". Masukkan nama, nominal target, pilih icon, dan deadline. Target membantu kamu menabung dengan terarah.',
    tip: '💡 Saldo bersih kamu otomatis berkurang saat mengisi target!',
  },
  {
    icon: 'account_balance_wallet',
    color: 'text-blue-400 bg-blue-400/10',
    title: 'Pahami Saldo Bersih',
    desc: 'Saldo Bersih = Total Pemasukan − Total Pengeluaran. Saat kamu mengisi dana ke target tabungan, saldo bersih akan berkurang sesuai jumlah yang kamu alokasikan.',
    tip: '💡 Kamu tidak bisa mengisi target melebihi saldo bersih yang ada!',
  },
  {
    icon: 'bar_chart',
    color: 'text-purple-400 bg-purple-400/10',
    title: 'Pantau Laporan Keuangan',
    desc: 'Halaman Laporan menampilkan grafik pemasukan vs pengeluaran per bulan, breakdown kategori, dan riwayat transaksi lengkap. Filter berdasarkan tanggal dan kategori.',
    tip: '💡 Export data ke CSV untuk analisis lebih lanjut!',
  },
  {
    icon: 'smart_toy',
    color: 'text-green-400 bg-green-400/10',
    title: 'Tanya AI Advisor',
    desc: 'AI Advisor di beranda dan halaman AI bisa membantu kamu menganalisis keuangan, mencatat transaksi lewat chat, membuat target, dan memberi saran hemat.',
    tip: '💡 Coba ketik: "Kondisi keuanganku gimana?" atau "Catat pengeluaran makan 50rb"',
  },
  {
    icon: 'person',
    color: 'text-orange-400 bg-orange-400/10',
    title: 'Kelola Profil & Pengaturan',
    desc: 'Di halaman Profil kamu bisa edit nama, email, nomor HP, dan export data. Di Pengaturan kamu bisa atur notifikasi, mata uang, dan keamanan akun.',
    tip: '💡 Backup data secara berkala untuk keamanan!',
  },
]

export default function Tutorial() {
  const [current, setCurrent] = useState(0)
  const nav = useNavigate()
  const step = STEPS[current]
  const isLast = current === STEPS.length - 1

  return (
    <div className="fade-up space-y-8 max-w-2xl">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-sora font-bold text-white">Tutorial</h2>
        <p className="text-sm text-on-surface-variant mt-1">Panduan lengkap menggunakan TabungDulu</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 items-center">
        {STEPS.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'bg-primary-container w-8' : 'bg-outline-variant w-2 hover:bg-on-surface-variant'}`} />
        ))}
        <span className="ml-2 text-xs text-on-surface-variant">{current + 1}/{STEPS.length}</span>
      </div>

      {/* Step card */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-primary-container/5 rounded-full blur-3xl" />

        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${step.color}`}>
          <span className="material-symbols-outlined text-3xl">{step.icon}</span>
        </div>

        <h3 className="text-xl font-sora font-bold text-white mb-3">{step.title}</h3>
        <p className="text-sm text-on-surface leading-relaxed mb-6">{step.desc}</p>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <p className="text-sm text-on-surface-variant leading-relaxed">{step.tip}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={() => setCurrent(c => c - 1)} disabled={current === 0}
          className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Sebelumnya
        </button>
        {isLast ? (
          <button onClick={() => nav('/')}
            className="flex-[2] py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm">
            Mulai Sekarang 🚀
          </button>
        ) : (
          <button onClick={() => setCurrent(c => c + 1)}
            className="flex-[2] py-3 bg-primary-container text-on-primary-container font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all glow-sm flex items-center justify-center gap-2">
            Selanjutnya <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
      </div>

      {/* All steps overview */}
      <div>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-1">Semua Langkah</p>
        <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`flex items-center gap-4 w-full px-5 py-4 text-left transition-all hover:bg-surface-container-high/50 ${i < STEPS.length - 1 ? 'border-b border-outline-variant' : ''} ${i === current ? 'bg-surface-container-high/30' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${i === current ? 'bg-primary-container text-on-primary-container' : s.color}`}>
                <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${i === current ? 'text-primary-container' : 'text-white'}`}>{s.title}</p>
              </div>
              {i === current && <span className="material-symbols-outlined text-primary-container text-sm">radio_button_checked</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
