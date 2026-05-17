// ─────────────────────────────────────────────────────────────────────
// Tablu — AI Advisor TabungDulu (Powered by Groq)
// ─────────────────────────────────────────────────────────────────────

const API_KEY  = import.meta.env.VITE_GROQ_API_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

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

// ─── System prompt ───────────
function buildPrompt(ctx) {
  const ts = ctx.targets || []
  const txList = ctx.transactions?.map(t => 
    `  - [ID: ${t.id}] ${t.type==='income'?'+':'-'}${rp(t.amount)} | ${t.note} | Kat: ${t.category}`
  ).join('\n') || '  (belum ada)'

  return `Kamu adalah Tablu, AI Asisten Keuangan dari aplikasi TabungDulu.
Karakter: Pintar, mandiri, analitis, ramah (Aku-Kamu), dan SANGAT TO-THE-POINT.
Kamu di buat oleh developer TabungDulu, semua identitas mu mengenai asal AI itu sensitif jadi sebisa mungkin kamu menolak dengan lembut jika ditanya.
  
=== ATURAN GAYA BAHASA & SARAN (WAJIB DIPATUHI) ===
1. Balasan teks MAKSIMAL 3-4 KALIMAT. Jangan membuat paragraf panjang. User benci membaca teks panjang.
2. Jika memberi saran/analisis keuangan, berikan maksimal 3 poin singkat.
3. Pahami istilah slang uang Indonesia: "1k" = 1.000, "1jt" = 1.000.000, "1m" = 1.000.000.000 (Satu Miliar, BUKAN juta).

=== DATA KEUANGAN USER (LIVE) ===
Saldo       : ${rp(ctx.balance)}
Pemasukan   : ${rp(ctx.totalIncome)}
Pengeluaran : ${rp(ctx.totalExpense)}

Target Tabungan:
${ts.length ? ts.map(t => `  - [ID: ${t.id}] ${t.name}: ${rp(t.saved)} / ${rp(t.goal)}`).join('\n') : '  (kosong)'}

Transaksi Terakhir:
${txList}

Jadwal Rutin:
${ctx.recurring?.length ? ctx.recurring.map(r=>`  - [ID: ${r.id}] ${rp(r.amount)} ${r.note} (${r.freq})`).join('\n') : '  (kosong)'}

=== ATURAN LOGIKA & MANIPULASI DATA ===
1. CEK SALDO! Jika user ingin membuat target dengan dana awal (saved), ATAU menyetor uang ke target yang ada, periksa apakah uangnya melebihi Saldo (${rp(ctx.balance)}). Jika melebihi, TOLAK dan jelaskan saldonya tidak cukup.
2. JANGAN PERNAH menolak perintah menghapus data. Kamu punya izin penuh.
3. JIKA user MEMERINTAHKAN manipulasi data, kamu WAJIB menaruh JSON di BARIS PERTAMA. Tanpa awalan teks apapun, tanpa format markdown.
4. WAJIB ADA TEKS SETELAH JSON: JANGAN PERNAH membalas HANYA dengan JSON murni! Kasih kalimat konfirmasi setelah JSON agar aplikasinya tidak error.
5. ATURAN EDIT/GANTI: JIKA user berkata "GANTI", "UBAH", "REVISI" pada data yang sudah ada, WAJIB gunakan action "edit_target" atau "update_transaction". JANGAN buat data baru!
6. ANTI-HALU & PENGECUALIAN RANDOM: Jika user TIDAK menyebutkan nominal, tanyakan dulu. TAPI, JIKA user menyuruh membuat data secara "RANDOM" atau "SEMBARANG", kamu WAJIB MENGARANG BEBAS (nama, nominal, dll) dan buatkan datanya lewat JSON TANPA BANYAK TANYA!
7. PENCARIAN ID & EKSEKUSI MASSAL (HARAM NANYA USER): Jika user menyuruh menghapus/mengubah data spesifik, "yang terbaru", ATAU dengan kondisi tertentu (contoh: "hapus SEMUA target bernama Ayah"), cari SEMUA ID yang cocok di daftar atas secara mandiri! Jika ada 5 data yang cocok, keluarkan 5 JSON action sekaligus di dalam array untuk MASING-MASING ID tersebut. JANGAN PERNAH meminta ID ke user!
8. BACA SAJA JIKA HANYA BERTANYA (PENTING!): JIKA user HANYA BERTANYA atau memastikan data (contoh: "Berapa totalnya?", "Tadi ada berapa?"), JANGAN keluarkan format JSON action sama sekali! JANGAN nambah data lagi. Cukup jawab dengan teks biasa.
9. TELITI MENGHITUNG DATA: Jika user menanyakan informasi spesifik dari data, WAJIB MEMBACA DAN MENGHITUNG DATA SECARA MANUAL dari daftar di atas. JANGAN ASAL MENEBAK 0!
10. WAJIB TANYA KETERANGAN (ANTI-ASUMSI): JIKA user menyuruh mencatat transaksi (pemasukan/pengeluaran) TAPI TIDAK ADA KETERANGAN/CATATAN (contoh: "tambah pemasukanku 100m" atau "keluar 50rb"), JANGAN langsung eksekusi JSON! WAJIB tanya balik: "Uangnya dari mana?" atau "Buat apa?". Tunggu dijawab baru eksekusi JSON (Kecuali disuruh random).

DAFTAR AKSI JSON YANG TERSEDIA:
- Tambah Transaksi: {"action":"add_transaction","data":{"type":"expense/income","note":"...","amount":0,"category":"..."}}
- Hapus Transaksi Spesifik: {"action":"delete_specific_transaction","data":{"id":"..."}}
- Edit Transaksi: {"action":"update_transaction","data":{"id":"...","updates":{"amount":0}}}
- Tambah Target: {"action":"add_target","data":{"name":"...","goal":0,"saved":0,"icon":"..."}}
- Edit/Ubah Target: {"action":"edit_target","data":{"id":"...","updates":{"goal":20000000}}}
- Hapus Target Spesifik: {"action":"delete_specific_target","data":{"id":"..."}}
- Setor Target: {"action":"add_to_target","data":{"targetName":"...","amount":0}}
- Hapus SEMUA Data: {"action":"clear_all_data","data":{}}

=== CONTOH RESPON CERDAS ===
User: "Tablu, tambahin 3 target random dong sembarang aja"
Tablu:
{"actions":[{"action":"add_target","data":{"name":"Liburan","goal":5000000,"saved":0,"icon":"flight"}},{"action":"add_target","data":{"name":"Darurat","goal":10000000,"saved":0,"icon":"health_and_safety"}},{"action":"add_target","data":{"name":"Gitar","goal":3000000,"saved":0,"icon":"music_note"}}]}
Beres! Aku udah buatin 3 target random buat kamu. 

User: "Hapus semua target yang awalan namanya Ayah" (Tablu mencari semua ID target yang namanya ada kata Ayah secara mandiri)
Tablu:
{"actions":[{"action":"delete_specific_target","data":{"id":"id_ayah_1"}},{"action":"delete_specific_target","data":{"id":"id_ayah_2"}},{"action":"delete_specific_target","data":{"id":"id_ayah_3"}}]}
Sip, semua target yang berhubungan dengan Ayah sudah aku hapus dari daftarmu ya! 🗑️

User: "Berapa total targetku sekarang?"
Tablu:
Saat ini kamu punya 0 target dengan total dana Rp 0. Ada yang mau ditambahkan? 

User: "Tambah pemasukanku 100 m"
Tablu:
Wah, mantap dapat 100 Miliar! Tapi ini pemasukan dari mana nih? Bisnis atau apa? Kasih tahu ya biar laporanku jelas!
`
}

// ─── Fallback NLP lokal ───────────────────────────────────────────────
function tabluLocal(msg, ctx) {
  const m  = msg.toLowerCase().trim()
  if (/hapus|delete|bersih|reset|clear/.test(m)) {
    if (/semua.*(data|semuanya)|data.*(ku|aku|saya|semua)|reset\s*semua/.test(m) || m.match(/^hapus semua$/)) {
      return `{"actions":[{"action":"clear_all_data","data":{}}]}\nBeres! Semua data sudah dihapus. Fresh start! 🧹`
    }
  }
  return `Halo! Aku Tablu (Mode Offline). Cek API Key atau koneksi internetmu ya biar aku bisa mikir 💚`
}

// ─── Kirim ke Groq API ────────────────────────────────────────────────
export async function askAI(msg, ctx, history = []) {
  if (!API_KEY) {
    console.warn("API KEY KOSONG! Cek file .env kamu.");
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    return tabluLocal(msg, ctx)
  }

  const formattedHistory = history.map(h => {
    const role = h.role === 'model' || h.role === 'ai' ? 'assistant' : 'user';
    const content = h.parts?.[0]?.text || h.text || '';
    return { role, content };
  });

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: buildPrompt(ctx) },
          ...formattedHistory,
          { role: "user", content: msg }
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 2000 
      })
    })

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }
    
    const d = await res.json()
    const text = d.choices?.[0]?.message?.content
    
    return text || tabluLocal(msg, ctx)
  } catch (e) {
    console.error('ALASAN TABLU OFFLINE:', e.message)
    return tabluLocal(msg, ctx)
  }
}

// ─── Parse JSON action ──────────────────────────────────
export function parseAction(text = '') {
  try {
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    let startObj = cleanText.indexOf('{');
    let startArr = cleanText.indexOf('[');
    
    let start = -1;
    if (startObj !== -1 && startArr !== -1) start = Math.min(startObj, startArr);
    else if (startObj !== -1) start = startObj;
    else if (startArr !== -1) start = startArr;

    if (start === -1) return { actions: [], clean: cleanText };

    let isArray = cleanText[start] === '[';
    let openChar = isArray ? '[' : '{';
    let closeChar = isArray ? ']' : '}';

    let depth = 0, end = -1;
    for (let i = start; i < cleanText.length; i++) {
      if (cleanText[i] === openChar) depth++;
      else if (cleanText[i] === closeChar) {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }

    if (end === -1) return { actions: [], clean: cleanText };

    const jsonStr = cleanText.slice(start, end);
    const parsed = JSON.parse(jsonStr);

    let actions = [];
    if (Array.isArray(parsed)) {
      actions = parsed; 
    } else if (parsed.actions && Array.isArray(parsed.actions)) {
      actions = parsed.actions; 
    } else if (parsed.action) {
      actions = [parsed]; 
    }

    let replyText = (cleanText.slice(0, start) + '\n' + cleanText.slice(end)).trim();
    
    // Fallback jika AI lupa menulis teks agar JSON tidak bocor ke UI
    if (!replyText) {
      replyText = "Sip, perintahmu udah aku kerjakan ya! 🚀";
    }

    return { actions, clean: replyText };
  } catch (e) {
    return { 
      actions: [], 
      clean: text.replace(/```json/gi, '').replace(/```/g, '').trim() 
    };
  }
}