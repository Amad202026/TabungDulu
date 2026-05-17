# TabungDulu 💚

Aplikasi tabungan pribadi dengan AI Advisor yang cerdas.

## Cara Jalankan

### 1. Install dependencies
```bash
npm install
```

### 2. Setup Gemini API (opsional tapi direkomendasikan)
- Buka https://aistudio.google.com
- Klik "Get API Key" → buat key baru (GRATIS)
- Buat file `.env` di root proyek:
```
VITE_GEMINI_API_KEY=api_key_kamu
```
> Tanpa API key, AI tetap jalan dengan mode simulasi

### 3. Jalankan
```bash
npm run dev
```
Buka http://localhost:5173

---

## Fitur Batch 1 ✅
- Beranda (dashboard saldo, target, transaksi, AI mini)
- Laporan keuangan (grafik, pie chart, riwayat)
- Target tabungan (buat, isi, hapus)
- Catat transaksi (pemasukan & pengeluaran)
- AI Advisor (simulasi + Gemini jika ada key)

## Fitur Batch 2 (coming)
- AI Advisor halaman penuh
- Profil & pengaturan
- Jadwal transaksi otomatis
