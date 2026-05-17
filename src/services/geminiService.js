// ─────────────────────────────────────────────────────────────────────
// Tablu — AI Advisor TabungDulu (Smart, Restricted & Uncut Version)
// ─────────────────────────────────────────────────────────────────────

const API_KEY    = import.meta.env.VITE_GEMINI_API_KEY || ''
// Menggunakan Gemini 2.5 Flash sesuai permintaanmu
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

// ─── Format helpers ───────────────────────────────────────────────────
const rp  = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const pct = (s, g) => (g ? Math.round((s / g) * 100) : 0)

function parseAmt(s = '') {
  const lo  = s.toLowerCase().trim()
  const num = parseFloat(lo.replace(/[^0-9.]/g, ''))
  if (!num || isNaN(num)) return 0
  if (/miliar|m\b/.test(lo))   return num * 1_000_000_000
  if (/juta|jt/.test(lo))      return num * 1_000_000
  if (/ribu|rb|k\b/.test(lo))  return num * 1_000
  return num
}

function findAmt(text) {
  const hits = [...text.matchAll(/(\d[\d.,]*)\s*(miliar|juta|jt|ribu|rb|k)\b/gi)]
  if (hits.length) return parseAmt(hits[0][0])
  const raw = text.match(/\b(\d{3,})\b/)
  return raw ? parseFloat(raw[1]) : 0
}

// ─── Deteksi interval waktu ───────────────────────────────────────────
function parseInterval(text) {
  const m = text.toLowerCase()

  if (/per\s*hari|setiap\s*hari|tiap\s*hari|harian|daily/.test(m))
    return { freq: 'daily', label: 'setiap hari', day: null }

  if (/per\s*minggu|setiap\s*minggu|tiap\s*minggu|mingguan|weekly/.test(m)) {
    const days = { senin:1, selasa:2, rabu:3, kamis:4, jumat:5, sabtu:6, minggu:0 }
    const dayName = Object.keys(days).find(d => m.includes(d))
    return { freq: 'weekly', label: dayName ? `setiap ${dayName}` : 'setiap minggu', day: dayName ? days[dayName] : 1 }
  }

  if (/per\s*bulan|setiap\s*bulan|tiap\s*bulan|bulanan|monthly/.test(m))
    return { freq: 'monthly', label: 'setiap bulan', day: 1 }

  const tgl = m.match(/(?:tiap|setiap)\s+tanggal\s+(\d+)/) || m.match(/tanggal\s+(\d+)/)
  if (tgl)
    return { freq: 'monthly', label: `setiap tanggal ${tgl[1]}`, day: parseInt(tgl[1]) }

  return null
}

// ─── Tebak kategori ───────────────────────────────────────────────────
function guessExpCat(t) {
  const m = t.toLowerCase()
  if (/makan|minum|kopi|snack|resto|warung|lunch|dinner|sarapan|nasi|bakso|soto|jajan|boba/.test(m)) return 'Makanan'
  if (/bensin|grab|gojek|ojek|bus|kereta|motor|mobil|parkir|tol|bbm/.test(m))                        return 'Transport'
  if (/listrik|air|pdam|internet|wifi|tagihan|cicilan|iuran|token/.test(m))                           return 'Tagihan'
  if (/shopee|tokopedia|lazada|belanja|baju|sepatu|mall|toko/.test(m))                                return 'Belanja'
  if (/film|bioskop|netflix|spotify|game|hiburan|nonton|konser/.test(m))                              return 'Hiburan'
  if (/obat|dokter|rs|rumah sakit|klinik|apotek|vitamin/.test(m))                                     return 'Kesehatan'
  if (/kursus|buku|sekolah|kuliah|les|kampus/.test(m))                                                return 'Pendidikan'
  return 'Lainnya'
}

function guessIncCat(t) {
  const m = t.toLowerCase()
  if (/gaji|salary|slip/.test(m))               return 'Gaji'
  if (/freelance|project|klien|client/.test(m)) return 'Freelance'
  if (/bonus|thr|insentif/.test(m))             return 'Bonus'
  if (/bisnis|usaha|jualan|dagangan/.test(m))   return 'Bisnis'
  if (/investasi|dividen|saham/.test(m))        return 'Investasi'
  return 'Lainnya'
}

function cleanNote(text, type) {
  const s = text
    .replace(/tolong|dong|ya|yah|nih|deh|lah|kan|ok(e)?|please|boleh/gi, '')
    .replace(/catat|tambah|masukkan|hapus|buat|bikinin|buatin|tambahin/gi, '')
    .replace(/tadi|barusan|baru\s*saja|abis|habis/gi, '')
    .replace(/pemasukan|pengeluaran|income|expense|penghasilan|gajian/gi, '')
    .replace(/per\s*(hari|minggu|bulan)|setiap\s*(hari|minggu|bulan)|tiap\s*(hari|minggu|bulan)/gi, '')
    .replace(/(\d[\d.,]*)\s*(miliar|juta|jt|ribu|rb|k)?\b/gi, '')
    .replace(/\s+/g, ' ').trim()
  if (s.length > 2) return s.charAt(0).toUpperCase() + s.slice(1)
  return type === 'income' ? 'Pemasukan' : 'Pengeluaran'
}

// ─── System prompt Gemini (OTAK UTAMA) ────────────────────────────────
function buildPrompt(ctx) {
  const ts = ctx.targets || []
  const txList = ctx.transactions?.map(t => 
    `  - [ID: ${t.id}] ${t.type==='income'?'+':'-'}${rp(t.amount)} | Note: ${t.note} | Kat: ${t.category}`
  ).join('\n') || '  (belum ada)'

  return `Kamu adalah Tablu, AI advisor dari aplikasi keuangan TabungDulu. 
Kamu pintar mengelola uang, santai, asik diajak ngobrol, dan paham konteks pembicaraan. Gunakan bahasa Indonesia kasual (Aku-Kamu).

=== BATASAN TOPIK (SANGAT PENTING - HARUS DIPATUHI) ===
Kamu HANYA boleh membahas tentang keuangan, manajemen uang, tabungan, pengeluaran, pemasukan, tips berhemat, dan fitur aplikasi TabungDulu.
JIKA user bertanya atau mengajak ngobrol tentang hal di luar topik tersebut (misalnya: koding, politik, game, pelajaran sekolah, resep masakan, dll), kamu WAJIB MENOLAK dengan sopan dan kembalikan obrolan ke masalah keuangan.
Contoh penolakan: "Wah, kalau soal itu Tablu kurang paham nih. Tablu kan cuma asisten keuangan. Gimana kalau kita bahas target tabungan atau cek pengeluaranmu aja?"

=== DATA KEUANGAN USER (LIVE) ===
Saldo bersih    : ${rp(ctx.balance)}
Total pemasukan : ${rp(ctx.totalIncome)}
Total pengeluaran: ${rp(ctx.totalExpense)}

Daftar Target Tabungan:
${ts.length ? ts.map(t => `  - [ID: ${t.id}] ${t.name}: Terkumpul ${rp(t.saved)} dari ${rp(t.goal)} (${pct(t.saved, t.goal)}%)`).join('\n') : '  (belum ada)'}

Daftar Transaksi Terakhir (Penting untuk Edit/Hapus):
${txList}

Jadwal Rutin (Recurring):
${ctx.recurring?.length ? ctx.recurring.map(r=>`  - [ID: ${r.id}] ${rp(r.amount)} ${r.note} (${r.freq||'monthly'})`).join('\n') : '  (belum ada)'}

=== ATURAN MANIPULASI DATA ===
Jika user minta melakukan sesuatu (mencatat, menghapus, mengedit), letakkan JSON murni di BARIS PERTAMA balasanmu. 

Contoh Format JSON Aksi (PILIH SALAH SATU JIKA PERLU):
- Tambah Transaksi: {"action":"add_transaction","data":{"type":"expense","note":"Makan siang","amount":45000,"category":"Makanan"}}
- Hapus Transaksi Spesifik: {"action":"delete_specific_transaction","data":{"id":"isi_dengan_id_dari_daftar_di_atas"}}
- Edit Transaksi Spesifik: {"action":"update_transaction","data":{"id":"isi_dengan_id","updates":{"amount":50000, "note":"Beli pulsa"}}}
- Tambah Target: {"action":"add_target","data":{"name":"Beli HP","goal":3000000,"icon":"smartphone"}}
- Setor Tabungan: {"action":"add_to_target","data":{"targetName":"Beli HP","amount":100000}}
- Hapus Semua Data: {"action":"clear_all_data","data":{}}

=== PERINTAH KHUSUS ===
1. Tolak tegas (tapi santai) semua obrolan di luar keuangan.
2. Jika ditanya hal umum soal keuangan, berikan saran/analisis berdasarkan data di atas.
3. JANGAN ngasih JSON kalau user cuma nanya-nanya biasa tanpa nyuruh ubah data.
4. JSON harus murni tanpa bungkus \`\`\`json. Letakkan di paling atas.`
}

// ─── Fallback NLP lokal (Dipakai kalau API Error/Key kosong) ─────────
function tabluLocal(msg, ctx) {
  const m  = msg.toLowerCase().trim()

  if (/hapus|delete|bersih|reset|clear/.test(m)) {
    if (/semua.*(data|semuanya)|data.*(ku|aku|saya|semua)|reset\s*semua/.test(m) || m.match(/^hapus semua$/)) {
      return `{"action":"clear_all_data","data":{}}\nBeres! Semua data sudah dihapus. Fresh start! 🧹`
    }
  }

  return [
    `Halo! Aku Tablu (Mode Offline). Aku belum konek ke AI karena API Key belum ada/error.`,
    `Tapi perintah dasar seperti "hapus semua data" tetap jalan kok 💚`
  ].join('\n').trim()
}

// ─── Kirim ke Gemini API ──────────────────────────────────────────────
export async function askAI(msg, ctx, history = []) {
  if (!API_KEY) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    return tabluLocal(msg, ctx)
  }

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildPrompt(ctx) }]
        },
        contents: [
          ...history,
          { role: 'user', parts: [{ text: msg }] }
        ],
        // maxOutputTokens diubah ke 2500 agar teks tidak mudah terpotong
        generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
      })
    })

    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d    = await res.json()
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text
    
    return text || tabluLocal(msg, ctx)
  } catch (e) {
    console.warn('Gemini error, pakai Tablu lokal:', e.message)
    return tabluLocal(msg, ctx)
  }
}

// ─── Parse JSON action dari respons ──────────────────────────────────
export function parseAction(text = '') {
  try {
    let start = -1
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        const slice = text.slice(i)
        if (slice.includes('"action"')) { start = i; break }
      }
    }
    if (start === -1) return { action: null, clean: text.trim() }

    let depth = 0, end = -1
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
    }
    if (end === -1) return { action: null, clean: text.trim() }

    const actionJsonStr = text.slice(start, end)
    const action = JSON.parse(actionJsonStr)
    
    const clean  = (text.slice(0, start) + '\n' + text.slice(end))
                    .replace(/```json/gi, '')
                    .replace(/```/g, '')
                    .replace(/^\n+/, '')
                    .trim()

    return { action, clean }
  } catch {
    return { 
      action: null, 
      clean: text.replace(/```json/gi, '').replace(/```/g, '').trim() 
    }
  }
}