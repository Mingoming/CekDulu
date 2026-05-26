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
  - perbandingan sumber,
  - sumber pembanding,
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
- Claim extraction sederhana untuk mengambil klaim utama dari input, OCR, atau hasil scraping.
- Search query generation untuk membuat query pencarian singkat.
- Web retrieval dengan Gemini Grounding with Google Search untuk mencari maksimal 5 sumber pembanding.
- Grounding berjalan selektif agar tidak selalu memakai kuota pencarian.
- Source ranking untuk memilih maksimal 3 sumber terbaik berdasarkan domain resmi, fact-checking, media kredibel, dan HTTPS.
- Semantic retrieval memory sederhana dengan Gemini Embedding API dan local JSON vector store.
- Cosine similarity manual untuk mengambil maksimal 3 konteks memory yang mirip.
- Fallback hasil lama jika grounding/retrieval gagal atau sumber pembanding belum tersedia.
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
- Gemini Grounding with Google Search
- Gemini Embedding API
- Local JSON vector store
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
    embeddings/
      cosineSimilarity.js
      generateEmbedding.js
      saveSourceVectors.js
      searchVectors.js
      vectorStore.js
    heuristicAnalyzer.js
    parseAiResponse.js
    promptBuilder.js
    retrieval/
      extractClaim.js
      generateSearchQuery.js
      normalizeGroundingSources.js
      rankSources.js
      retrieveSources.js
    safeUrl.js
    scrapeArticle.js
  .env.example
  data/
    vectors/
      sources.json
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
8. Sistem mengambil klaim utama dan membuat query pencarian singkat.
9. Heuristic analyzer menghitung skor risiko dari teks dan konteks artikel.
10. Jika grounding aktif dan dibutuhkan, server memakai Gemini Grounding with Google Search untuk mencari sumber pembanding dan memilih 3 sumber terbaik.
11. Sistem mencari konteks semantic memory dari sumber yang pernah tersimpan di local vector store.
12. Jika grounding sukses, sumber valid disimpan sebagai vector memory untuk request berikutnya.
13. AI membuat ringkasan, klaim utama, perbandingan sumber, tanda yang perlu dicek, dan saran tindakan.
14. Jika OCR, scraping, retrieval, embedding, vector memory, atau AI gagal, aplikasi menampilkan pesan ramah atau hasil pemeriksaan dasar sesuai kondisi.

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
GEMINI_GROUNDING_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
ENABLE_GROUNDING=true
GROUNDING_TIMEOUT_MS=5000
GROUNDING_MAX_KEY_ATTEMPTS=1
GROUNDING_MIN_SCORE=35
GROUNDING_MAX_SCORE=65
```

Keterangan:

- `GEMINI_API_KEY`: API key utama untuk memanggil model AI melalui endpoint OpenAI-compatible Gemini.
- `GEMINI_API_KEYS`: daftar API key cadangan, dipisahkan dengan koma. Jika key utama terkena limit atau gagal, server akan mencoba key berikutnya.
- `GEMINI_MODEL`: nama model yang digunakan oleh API route.
- `GEMINI_GROUNDING_MODEL`: nama model Gemini yang digunakan untuk grounding Google Search. Jika kosong, aplikasi memakai `GEMINI_MODEL`.
- `GEMINI_EMBEDDING_MODEL`: nama model Gemini yang digunakan untuk embedding semantic memory.
- `ENABLE_GROUNDING`: isi `false` untuk mematikan grounding, misalnya saat local development.
- `GROUNDING_TIMEOUT_MS`: batas waktu grounding dalam milidetik. Default `5000`.
- `GROUNDING_MAX_KEY_ATTEMPTS`: jumlah maksimal API key yang dicoba untuk grounding. Default `1` agar tidak membuang waktu saat beberapa key masih berada dalam project/quota pool yang sama.
- `GROUNDING_MIN_SCORE`: skor minimum agar grounding dipanggil. Default `35`.
- `GROUNDING_MAX_SCORE`: skor maksimum agar grounding dipanggil. Default `65`.

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
- Retrieval hanya mengambil maksimal 5 sumber dan hanya menampilkan maksimal 3 sumber terbaik.
- Semantic memory memakai file lokal `data/vectors/sources.json`, bukan database.
- Vector memory hanya menyimpan sumber grounding yang valid, bukan gambar OCR atau secret.
- Similarity search memakai threshold `0.7` dan mengambil maksimal 3 konteks.
- Grounding tidak selalu dipanggil. Sistem bisa melewati grounding jika dimatikan lewat env, URL sudah berhasil dibaca lewat scraping, skor heuristic di bawah `GROUNDING_MIN_SCORE`, atau skor heuristic di atas `GROUNDING_MAX_SCORE`.
- Retrieval bisa gagal jika Gemini Grounding tidak tersedia, API key terkena limit, koneksi lambat, atau sumber yang relevan belum ditemukan.
- Embedding atau vector store bisa gagal; jika terjadi, pipeline lama tetap berjalan tanpa memory retrieval.
- Jika grounding tidak tersedia, UI menampilkan pesan ramah: `Sumber pembanding belum tersedia. Hasil analisis dasar tetap ditampilkan.`
- Multi-key fallback Gemini hanya efektif menambah kuota jika API key berasal dari project/quota pool yang berbeda.
- Aplikasi tidak memakai database dan tidak menyimpan riwayat pemeriksaan.
- Aplikasi memakai Gemini Embedding API dan local JSON vector store sederhana untuk semantic memory.
- Aplikasi belum memakai full RAG framework, vector database, crawling web-wide, atau real-time fact checking.
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
