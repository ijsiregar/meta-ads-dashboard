# Meta Ads Dashboard

Dashboard monitoring Meta Ads dengan auto-sync ke Google Sheet.

## Fitur
- Real-time data dari Meta Ads API
- Metrik: Spend, Impressions, Reach, CTR, CPC, CPM, Frequency, Pesan WA
- Alert frequency tinggi (audience fatigue)
- Grafik tren harian Spend & CTR
- Tabel per campaign
- Auto-sync ke Google Sheet via Google Apps Script

## Deploy ke Vercel

### 1. Upload ke GitHub

```bash
# Di terminal lokal kamu
cd meta-ads-dashboard
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/meta-ads-dashboard.git
git push -u origin main
```

### 2. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → Sign up dengan GitHub
2. Klik **New Project** → Import repo `meta-ads-dashboard`
3. Framework: **Vite** (auto-detected)
4. Klik **Deploy**
5. Selesai — dapat URL `https://nama-project.vercel.app`

### 3. Setup Google Apps Script (Auto-sync)

1. Buka [script.google.com](https://script.google.com)
2. New Project → paste isi file `src/google-apps-script.js`
3. Isi `META_ACCESS_TOKEN` dan `AD_ACCOUNT_ID` di baris atas
4. Klik **Run** → `authorizeScript` (untuk grant permission)
5. Klik ikon jam (Triggers) → **Add Trigger**:
   - Function: `dailySync`
   - Event: Time-driven → Day timer → 7am–8am (WIB)
6. Simpan

Data akan otomatis masuk ke Google Sheet setiap hari jam 07.00.

## Development Lokal

```bash
npm install
npm run dev
```

## Konfigurasi

Masukkan token dan Ad Account ID via tombol ⚙ Konfigurasi di dashboard.
Token disimpan di localStorage browser — tidak dikirim ke server manapun.

## Keamanan

- Token hanya tersimpan di browser lokal (localStorage)
- Semua request langsung ke Meta Graph API dari browser
- Untuk produksi, pertimbangkan proxy backend agar token tidak exposed di client
