# CekDulu

CekDulu adalah aplikasi web satu halaman untuk membantu pengguna awam mengenali tanda-tanda berita, chat WhatsApp, caption media sosial, atau link yang mencurigakan sebelum disebarkan.

Tagline:

> Cek dulu sebelum sebar.

CekDulu tidak menentukan kebenaran mutlak sebuah informasi. Aplikasi ini memberi bantuan awal melalui analisis pola teks, skor risiko, dan penjelasan sederhana agar pengguna lebih berhati-hati.

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- Next.js API Route
- OpenAI SDK dengan endpoint OpenAI-compatible Gemini
- Tanpa database

## Fitur

- Textarea besar untuk menempel berita, chat, caption, atau link.
- Tombol utama `Cek Sekarang`.
- Heuristic analyzer untuk mendeteksi ajakan menyebarkan, bahasa provokatif, kapital berlebihan, tanda seru berlebihan, klaim kesehatan ekstrem, klaim bombastis, sumber tidak jelas, dan link mencurigakan.
- Risk score `0-100`.
- Risk level: `Rendah`, `Perlu Dicek`, dan `Mencurigakan`.
- API route `/api/analyze` untuk menghasilkan penjelasan AI.
- Result card berisi status risiko, skor, ringkasan, klaim utama, alasan mencurigakan, dan saran tindakan.
- Loading state, error state, contoh input, dan disclaimer.

## Struktur Folder

```text
app/
  api/analyze/route.js
  globals.css
  layout.js
  page.jsx
components/
  Disclaimer.jsx
  ErrorState.jsx
  Header.jsx
  Icons.jsx
  InputBox.jsx
  LoadingState.jsx
  ResultCard.jsx
lib/
  heuristicAnalyzer.js
  promptBuilder.js
references/
  PRD.md
  index.html
```

## Setup

Salin `.env.example` menjadi `.env.local`, lalu isi:

```bash
GEMINI_API_KEY=isi_api_key_anda
GEMINI_MODEL=gemini-3-flash-preview
```

API key hanya dibaca di server melalui `process.env.GEMINI_API_KEY`.

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://127.0.0.1:3000`.

## Script

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Keamanan

- Jangan commit `.env`, `.env.local`, atau file env lain yang berisi API key.
- `.env.example` aman untuk di-push karena hanya berisi nama variabel.
- Aplikasi tidak memakai database dan tidak menyimpan input pengguna.
- API key hanya dipakai di server melalui route `/api/analyze`.

## Disclaimer

Hasil analisis CekDulu bukan kepastian bahwa berita benar atau hoax. Gunakan sebagai bantuan awal dan tetap cek sumber resmi sebelum menyebarkan informasi.
