# ToonGod 18+ Webtoon Scraper & API 🔞

Scraper dan REST API TypeScript khusus komik dewasa / manhwa 18+ dari [ToonGod](https://www.toongod.org) berbasis **TypeScript**, **Cheerio**, **Express**, siap dijalankan di **Cloudflare Workers** dan **Vercel**.

> [!IMPORTANT]
> **Mode Khusus 18+**: Seluruh request, feed homepage, katalog, dan pencarian otomatis difilter khusus untuk konten **18+ Adult Webtoon** (konten non-18+ otomatis disingkirkan).

---

## 📁 Struktur Folder Proyek

```
C:\Users\HP\Desktop\toongod\
├── .env                  # Konfigurasi lokal (Port, Cookie Cloudflare, User-Agent)
├── .env.example          # Template konfigurasi environment
├── package.json          # Dependensi & script (Lokal, Cloudflare Workers, Vercel)
├── tsconfig.json         # Konfigurasi TypeScript
├── vercel.json           # Konfigurasi rewrite & routing Vercel
├── wrangler.toml         # Konfigurasi Cloudflare Workers & Assets
├── api/
│   └── index.ts          # Serverless Function Entry Point untuk Vercel
├── public/
│   ├── index.html        # Interactive API Dashboard Web UI
│   └── main.js           # Client-side script UI dashboard
├── src/
│   ├── config.ts         # Loader konfigurasi & dynamic env updater
│   ├── client.ts         # HTTP Client (Axios + Fetch fallback + Cookie bypass)
│   ├── types.ts          # Definisi interface TypeScript
│   ├── scraper.ts        # Core logika scraping Cheerio untuk tema Madara (WP-Manga)
│   ├── app.ts            # Definisi route & Express app
│   ├── server.ts         # Entry point local server Express (app.listen)
│   ├── worker.ts         # Entry point Cloudflare Workers (fetch handler)
│   ├── embeddedUi.ts     # Embedded UI dashboard fallback untuk Cloudflare Workers
│   └── index.ts          # CLI tester untuk uji coba scraping di terminal
└── README.md
```

---

## 🚀 Pilihan Deployment & Menjalankan

Proyek ini telah dikonfigurasi secara modular sehingga dapat berjalan di 3 platform sekaligus tanpa saling mengganggu:

### 1. ⚡ Menjalankan di Cloudflare Workers (Worker CF)

Cloudflare Workers mengeksekusi scraper di jaringan edge global Cloudflare yang super cepat dan gratis.

#### Cara Menguji Lokal (Cloudflare Workers Dev):
```bash
npm run cf:dev
```
Aplikasi akan berjalan di `http://localhost:8787` lengkap dengan UI Dashboard dan semua endpoint API.

#### Cara Deploy ke Cloudflare Workers:
1. Pastikan kamu sudah login ke akun Cloudflare di CLI:
   ```bash
   npx wrangler login
   ```
2. Deploy langsung:
   ```bash
   npm run cf:deploy
   ```
3. Worker kamu akan langsung aktif di URL seperti: `https://toongod-scraper.<username>.workers.dev`

#### Mengatur Environment Variables di Cloudflare Workers:
Bisa diatur melalui file [wrangler.toml](file:///c:/Users/HP/Desktop/toongod/wrangler.toml) atau via Cloudflare Dashboard:
- Buka **Cloudflare Dashboard** -> **Workers & Pages** -> Pilih `toongod-scraper`.
- Masuk ke **Settings** -> **Variables and Secrets**.
- Tambahkan:
  - `COOKIE`: Isi dengan cookie browser terbaru (`cf_clearance=...`).
  - `USER_AGENT`: User agent browser kamu.
  - `BASE_URL`: `https://www.toongod.org` (opsional, default sudah ada).
- Atau via CLI secret:
  ```bash
  npx wrangler secret put COOKIE
  ```

---

### 2. ▲ Menjalankan di Vercel

Vercel mengeksekusi aplikasi sebagai Serverless Function Node.js melalui file [api/index.ts](file:///c:/Users/HP/Desktop/toongod/api/index.ts) dan [vercel.json](file:///c:/Users/HP/Desktop/toongod/vercel.json).

#### Cara Menguji Lokal (Vercel Dev):
```bash
npm run vercel:dev
```
Aplikasi akan berjalan di `http://localhost:3000`.

#### Cara Deploy ke Vercel:
##### Opsi A: Lewat Vercel CLI
```bash
npm run vercel:deploy
```

##### Opsi B: Lewat GitHub / Vercel Dashboard
1. Push repositori ini ke GitHub / GitLab.
2. Buka [vercel.com](https://vercel.com) -> Klik **Add New Project**.
3. Import repositori kamu.
4. Pada bagian **Environment Variables**, tambahkan:
   - `COOKIE`: Nilai cookie `cf_clearance=...`
   - `USER_AGENT`: Nilai User-Agent browser kamu
   - `BASE_URL`: `https://www.toongod.org`
5. Klik **Deploy**. Selesai! Dashboard dan endpoint `/api/*` langsung aktif.

---

### 3. 💻 Menjalankan Server Lokal (Express)

Jika kamu ingin menjalankan server biasa di komputer kamu:
```bash
npm run dev:api
```
Buka browser di **`http://localhost:4000`**.

---

## 🌐 Daftar Endpoint REST API

Semua endpoint berikut tersedia sama persis di **Lokal**, **Cloudflare Workers**, dan **Vercel**:

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/` | Web Dashboard UI Dokumentasi & Testing Interaktif 18+ |
| `GET` | `/api/info` | Spesifikasi format metadata JSON API 18+ |
| `GET` | `/api/home` | Feed 18+ Homepage (Trending & Latest 18+ Releases) |
| `GET` | `/api/webtoons` | Katalog Komik Khusus 18+ (`?page=1&orderby=latest\|trending\|views\|rating`) |
| `GET` | `/api/search` | Mencari komik dewasa 18+ berdasarkan keyword (`?q=secret&page=1`) |
| `GET` | `/api/detail/:slug` | Mengambil detail info komik 18+ & seluruh daftar chapternya |
| `GET` | `/api/chapter/:slug/:chapterSlug` | Mengambil list URL gambar chapter untuk reader |
| `GET` | `/api/genres` | Mengambil daftar genre komik dewasa yang tersedia |

### Opsi Parameter Query:
- `page`: Nomor halaman (contoh: `1`, `2`)
- `orderby`: Urutan sorting:
  - `latest` (Terbaru diperbarui)
  - `alphabet` (Sesuai alfabet A-Z)
  - `rating` (Rating tertinggi)
  - `trending` (Sedang tren)
  - `views` (Paling banyak dilihat)
  - `new-manga` (Komik rilisan baru)
- `genre`: Filter slug genre tertentu (contoh: `action`, `romance`)
- `status`: Status rilis (`ongoing`, `completed`)

---

## 🍪 Panduan Lengkap Memperbarui Cookie (Cloudflare Bypass)

Jika API mengembalikan pesan error `Cloudflare 403 Forbidden`, itu menandakan token cookie `cf_clearance` dari ToonGod telah kedaluwarsa (*expired*). Berikut panduan lengkap untuk mengambil cookie baru dan memperbaruinya di masing-masing platform:

### 1. Cara Mengambil Cookie Baru dari Browser

1. Buka browser kamu (Chrome, Brave, atau Edge), lalu akses: **`https://www.toongod.org`** (atau `https://www.toongod.org/home/`).
2. Pastikan web terbuka normal dan verifikasi Cloudflare ("Checking your browser...") lolos.
3. Tekan **`F12`** pada keyboard (atau klik kanan di layar $\rightarrow$ pilih **Inspect**).
4. Klik tab **Network** di menu atas DevTools.
5. Tekan **`F5`** (Refresh halaman).
6. Di daftar request paling atas, klik request utama (biasanya bernama **`toongod.org`** atau **`home/`**).
7. Di panel sebelah kanan, buka tab **Headers** $\rightarrow$ scroll ke bagian **Request Headers**.
8. Cari baris **`cookie:`**, lalu **salin (copy)** seluruh teks nilainya (terutama bagian `cf_clearance=...`).

> [!TIP]
> **Cara Cepat Alternatif**:
> Di DevTools (`F12`), buka tab **Application** $\rightarrow$ klik menu **Cookies** di kolom kiri $\rightarrow$ pilih `https://www.toongod.org`. Kamu bisa langsung menyalin nilai dari baris **`cf_clearance`**.

---

### 2. Cara Memperbarui Cookie di Setiap Platform

#### 💻 A. Untuk Server Lokal
1. Buka file [`.env`](file:///c:/Users/HP/Desktop/toongod/.env).
2. Ganti nilai pada baris `COOKIE`:
   ```env
   COOKIE="UGVyc2lzdFN0b3JhZ2U=%7B%7D; cf_clearance=ISI_COOKIE_BARU_KAMU_DI_SINI"
   ```
3. Simpan file (`Ctrl + S`), lalu restart server (`npm run dev:api`).

#### ⚡ B. Untuk Cloudflare Workers (Paling Cepat & Praktis)
* **Opsi 1 (Via Terminal - Langsung aktif tanpa redeploy):**
  Jalankan perintah ini di terminal:
  ```bash
  npx wrangler secret put COOKIE
  ```
  Lalu *paste* cookie baru dan tekan **Enter**. Cloudflare Workers langsung ter-update otomatis dalam hitungan detik!

* **Opsi 2 (Via Dashboard Cloudflare):**
  1. Buka [dash.cloudflare.com](https://dash.cloudflare.com).
  2. Masuk ke **Workers & Pages** $\rightarrow$ pilih worker **`toongod-scraper`**.
  3. Buka tab **Settings** $\rightarrow$ **Variables and Secrets**.
  4. Edit variabel `COOKIE` dengan nilai cookie baru $\rightarrow$ klik **Save and Deploy**.

#### ▲ C. Untuk Vercel
1. Buka dashboard [vercel.com](https://vercel.com) $\rightarrow$ klik proyek kamu.
2. Buka tab **Settings** $\rightarrow$ pilih menu **Environment Variables** di kolom kiri.
3. Cari variabel bernama **`COOKIE`** $\rightarrow$ klik **Edit**.
4. Tempelkan (*paste*) nilai cookie yang baru $\rightarrow$ klik **Save**.
5. Buka tab **Deployments**, klik ikon titik tiga (**...**) pada deployment terakhir $\rightarrow$ pilih **Redeploy** agar environment variable baru segera aktif.
