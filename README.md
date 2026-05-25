# CekDulu

CekDulu adalah aplikasi web satu halaman untuk membantu pengguna awam mengenali tanda-tanda berita, chat WhatsApp, caption media sosial, atau link yang mencurigakan sebelum disebarkan.

> Cek dulu sebelum sebar.

CekDulu tidak menentukan kebenaran mutlak sebuah informasi. Aplikasi ini memberi bantuan awal melalui pemeriksaan pola teks, analisis link, skor risiko, dan penjelasan sederhana agar pengguna lebih berhati-hati.

## Fitur Utama

- Textarea besar untuk menempel berita, chat, caption, atau link.
- Mode input `Teks/Link` dan `Screenshot`.
- Upload screenshot untuk dibaca dengan OCR:
  - mendukung JPG, PNG, dan WEBP,
  - maksimal 5MB,
  - validasi format dan ukuran file,
  - preview gambar sebelum dianalisis,
  - OCR berjalan di browser sehingga gambar tidak dikirim ke server.
- Editor teks hasil OCR agar pengguna bisa memperbaiki hasil bacaan sebelum menekan `Cek Sekarang`.
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
- URL detection untuk mengenali input yang berisi link.
- Article scraping untuk membaca halaman artikel dari URL.
- Metadata extraction untuk mengambil:
  - title,
  - meta description,
  - isi artikel utama,
  - original domain,
  - final domain setelah redirect.
- Domain analysis untuk memeriksa:
  - shortlink,
  - pola domain yang perlu dicek,
  - status HTTPS,
  - domain awal dan domain akhir.
- SSRF protection dasar:
  - hanya mengizinkan `http` dan `https`,
  - memblokir hostname lokal/internal,
  - memblokir private IPv4 dan IPv6 range,
  - validasi DNS sebelum request,
  - redirect manual maksimal 3 kali,
  - validasi ulang setiap redirect.
- Fallback hasil dasar jika scraping artikel gagal.
- Fallback hasil dasar jika analisis AI sedang tidak tersedia.
- Loading state, error state, empty state, character counter, dan disclaimer.
- Tanpa login dan tanpa database.

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- Next.js API Route
- OpenAI SDK dengan endpoint OpenAI-compatible Gemini
- Axios
- Cheerio
- Tesseract.js
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
    ExtractedTextEditor.jsx
    Header.jsx
    Icons.jsx
    ImagePreview.jsx
    ImageUploadBox.jsx
    InfoTabs.jsx
    InputBox.jsx
    InputModeSelector.jsx
    LoadingState.jsx
    OcrLoadingState.jsx
    ResultCard.jsx
  lib/
    aiClient.js
    analyzeDomain.js
    analyzeInput.js
    detectUrl.js
    extractTextFromImage.js
    fallbackAnalysis.js
    heuristicAnalyzer.js
    parseAiResponse.js
    promptBuilder.js
    safeUrl.js
    scrapeArticle.js
  .env.example
  .gitignore
  CHANGELOG.md
  eslint.config.mjs
  jsconfig.json
  next.config.js
  package.json
  postcss.config.js
  tailwind.config.js
  TESTING.md
```

## Cara Kerja Singkat

1. Pengguna memilih mode `Teks/Link` atau `Screenshot`.
2. Pada mode `Teks/Link`, pengguna menempel chat, berita, caption, atau link.
3. Pada mode `Screenshot`, pengguna mengunggah gambar dan OCR membaca teks di browser.
4. Teks hasil OCR masuk ke editor dan bisa diperbaiki pengguna.
5. Aplikasi memvalidasi input sebelum dikirim ke API.
6. Jika input berisi URL, sistem mencoba membaca halaman artikel.
7. Sistem mengambil metadata artikel dan menganalisis domain awal serta domain akhir.
8. Heuristic analyzer menghitung skor risiko dari teks dan konteks artikel.
9. AI membuat ringkasan, klaim utama, tanda yang perlu dicek, dan saran tindakan.
10. Jika OCR, scraping, atau AI gagal, aplikasi menampilkan pesan ramah atau hasil pemeriksaan dasar sesuai kondisi.

## Cara Instalasi

Pastikan Node.js dan npm sudah tersedia, lalu jalankan:

```bash
npm install
```

## Environment Variable

Salin file `.env.example` menjadi `.env.local`.

```bash
GEMINI_API_KEY=isi_api_key_anda
GEMINI_API_KEYS=key_cadangan_1,key_cadangan_2,key_cadangan_3
GEMINI_MODEL=gemini-3-flash-preview
```

Keterangan:

- `GEMINI_API_KEY`: API key utama untuk memanggil model AI melalui endpoint OpenAI-compatible Gemini.
- `GEMINI_API_KEYS`: daftar API key cadangan, dipisahkan dengan koma. Jika key utama terkena limit atau gagal, server akan mencoba key berikutnya.
- `GEMINI_MODEL`: nama model yang digunakan oleh API route.

Alternatif lain, API key cadangan juga bisa ditulis sebagai variabel bernomor:

```bash
GEMINI_API_KEY_1=key_pertama
GEMINI_API_KEY_2=key_kedua
GEMINI_API_KEY_3=key_ketiga
GEMINI_API_KEY_4=key_keempat
```

API key hanya dibaca di server melalui environment variable. Jangan menaruh API key di kode frontend.

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

## Batasan Sistem

- Hasil analisis bukan kepastian bahwa berita benar atau hoax.
- Scraping bisa gagal pada website tertentu, misalnya karena website memblokir bot, memakai struktur HTML yang tidak umum, membutuhkan JavaScript, atau mengalami timeout.
- Saat ini hanya URL pertama yang terdeteksi dari input yang dianalisis.
- OCR hanya memproses satu gambar dalam sekali unggah.
- OCR bisa kurang akurat jika screenshot buram, terlalu kecil, miring, gelap, atau berisi teks yang tidak jelas.
- File screenshot hanya diproses di browser dan tidak dikirim ke backend.
- Aplikasi tidak memakai database dan tidak menyimpan riwayat pemeriksaan.
- Aplikasi belum memakai RAG, vector database, crawling web-wide, atau real-time fact checking.
- Domain analysis bersifat heuristic awal, bukan penilaian final atas kredibilitas sebuah situs.

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
