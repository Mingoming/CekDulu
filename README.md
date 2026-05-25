# CekDulu

CekDulu adalah aplikasi web satu halaman untuk membantu pengguna awam mengenali tanda-tanda berita, chat WhatsApp, caption media sosial, atau link yang mencurigakan sebelum disebarkan.

> Cek dulu sebelum sebar.

CekDulu tidak menentukan kebenaran mutlak sebuah informasi. Aplikasi ini memberi bantuan awal melalui pemeriksaan pola teks, skor risiko, dan penjelasan sederhana agar pengguna lebih berhati-hati.

## Fitur Utama

- Textarea besar untuk menempel berita, chat, caption, atau link.
- Tombol utama `Cek Sekarang`.
- Contoh input yang bisa langsung dicoba.
- Heuristic analyzer untuk mendeteksi:
  - ajakan menyebarkan,
  - bahasa provokatif,
  - huruf kapital berlebihan,
  - tanda seru berlebihan,
  - klaim kesehatan ekstrem,
  - klaim bombastis,
  - sumber tidak jelas,
  - link mencurigakan.
- Skor risiko `0-100`.
- Level risiko:
  - `Rendah`
  - `Perlu Dicek`
  - `Mencurigakan`
- Result card berisi:
  - status risiko,
  - skor,
  - ringkasan,
  - klaim utama,
  - tanda yang perlu dicek,
  - saran tindakan.
- API route `/api/analyze` untuk membuat penjelasan AI.
- Fallback hasil dasar jika analisis AI sedang tidak tersedia.
- Loading state, error state, empty state, character counter, dan disclaimer.
- Tanpa login dan tanpa database.

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- Next.js API Route
- OpenAI SDK dengan endpoint OpenAI-compatible Gemini
- Tanpa database

## Struktur Folder

```text
CekDulu/
  app/
    api/
      analyze/
        route.js
    globals.css
    layout.js
    page.jsx
  components/
    Disclaimer.jsx
    EmptyState.jsx
    ErrorState.jsx
    Header.jsx
    Icons.jsx
    InfoTabs.jsx
    InputBox.jsx
    LoadingState.jsx
    ResultCard.jsx
  lib/
    heuristicAnalyzer.js
    promptBuilder.js
  .env.example
  .gitignore
  eslint.config.mjs
  jsconfig.json
  next.config.js
  package.json
  postcss.config.js
  tailwind.config.js
  TESTING.md
```

## Cara Instalasi

Pastikan Node.js dan npm sudah tersedia, lalu jalankan:

```bash
npm install
```

## Environment Variable

Salin file `.env.example` menjadi `.env.local`.

```bash
GEMINI_API_KEY=isi_api_key_anda
GEMINI_MODEL=gemini-3-flash-preview
```

Keterangan:

- `GEMINI_API_KEY`: API key untuk memanggil model AI melalui endpoint OpenAI-compatible Gemini.
- `GEMINI_MODEL`: nama model yang digunakan oleh API route.

API key hanya dibaca di server melalui `process.env.GEMINI_API_KEY`. Jangan menaruh API key di kode frontend.

## Cara Menjalankan Lokal

Jalankan development server:

```bash
npm run dev
```

Buka aplikasi di browser:

```text
http://127.0.0.1:3000
```

## Cara Build

Jalankan build produksi:

```bash
npm run build
```

Untuk menjalankan hasil build:

```bash
npm run start
```

## Disclaimer

Hasil analisis CekDulu bukan kepastian bahwa berita benar atau hoax. Gunakan hasilnya sebagai bantuan awal untuk lebih berhati-hati.

Tetap cek sumber resmi sebelum mempercayai atau menyebarkan informasi, terutama untuk topik kesehatan, keuangan, bantuan sosial, keamanan, dan kebijakan publik.

## Future Roadmap

Beberapa pengembangan yang dapat dipertimbangkan di versi berikutnya:

- Peningkatan aturan heuristic agar deteksi pola teks lebih akurat.
- Tampilan hasil yang lebih edukatif untuk pengguna awam.
- Pengujian manual dan otomatis yang lebih lengkap.
- Optimasi aksesibilitas untuk perangkat mobile dan pengguna lansia.
- Dokumentasi deployment.
