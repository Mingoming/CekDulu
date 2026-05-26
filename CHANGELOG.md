# Changelog

Changelog ini merangkum perubahan besar pada project CekDulu.

## MVP 1

Tahap awal CekDulu sebagai aplikasi web satu halaman.

Perubahan utama:

- Membuat project Next.js App Router.
- Membuat UI utama dengan textarea, tombol `Cek Sekarang`, loading state, error state, result card, dan disclaimer.
- Menambahkan heuristic analyzer untuk mendeteksi pola mencurigakan seperti ajakan menyebarkan, bahasa provokatif, klaim kesehatan ekstrem, klaim bombastis, kapital berlebihan, tanda seru berlebihan, sumber tidak jelas, dan link mencurigakan.
- Menambahkan skor risiko `0-100`.
- Menambahkan level risiko `Rendah`, `Perlu Dicek`, dan `Mencurigakan`.
- Menambahkan API route `/api/analyze`.
- Menambahkan AI explanation dengan fallback hasil dasar jika AI tidak tersedia.
- Menambahkan validasi input, character counter, dan timeout request client.

## MVP 2

Tahap lanjutan untuk mendukung analisis URL dan artikel.

Perubahan utama:

- Menambahkan URL detection.
- Menambahkan article scraping dengan Axios dan Cheerio.
- Menambahkan metadata extraction:
  - title artikel,
  - meta description,
  - isi artikel utama,
  - original URL,
  - final URL,
  - domain akhir.
- Menambahkan domain analysis:
  - shortlink detection,
  - suspicious domain pattern,
  - HTTPS check,
  - analisis domain awal dan domain akhir.
- Menggabungkan hasil scraping dan domain analysis ke heuristic analyzer.
- Memperbarui prompt AI agar memakai isi artikel hasil scraping jika tersedia.
- Menambahkan fallback aman jika scraping gagal.
- Menampilkan informasi sumber link secara sederhana di result card.

## Security Hardening

Tahap perbaikan keamanan untuk mengurangi risiko SSRF dan menjaga secret tetap aman.

Perubahan utama:

- Menambahkan `lib/safeUrl.js`.
- Membatasi URL hanya untuk protocol `http` dan `https`.
- Memblokir hostname lokal/internal seperti `localhost`.
- Memblokir private IPv4 range dan private IPv6 range.
- Menambahkan DNS resolving sebelum request.
- Mematikan auto redirect Axios dengan `maxRedirects: 0`.
- Menangani redirect secara manual maksimal 3 kali.
- Me-resolve `Location` redirect terhadap URL lama.
- Memvalidasi ulang URL tujuan setiap redirect.
- Menambahkan custom HTTP/HTTPS agent untuk validasi DNS lookup saat koneksi dibuat.
- Memastikan scraping failure tidak membuat API crash.
- Menjaga API key tetap server-only.
- Menambahkan multi-key fallback untuk Gemini API key.
- Memastikan error teknis tidak tampil mentah ke user.

## API Route Refactor

Tahap perapian struktur agar API route lebih kecil dan mudah dirawat.

Perubahan utama:

- Memindahkan AI client logic ke `lib/aiClient.js`.
- Memindahkan parsing response AI ke `lib/parseAiResponse.js`.
- Memindahkan orchestration analisis input ke `lib/analyzeInput.js`.
- Memindahkan fallback analysis ke `lib/fallbackAnalysis.js`.
- Menyederhanakan `app/api/analyze/route.js` agar hanya menangani:
  - parse request,
  - validasi input,
  - panggil `analyzeInput()`,
  - return response.
- Tidak mengubah heuristic scoring utama.
- Tidak mengubah UI besar.
- Tidak menambahkan database, login, scraping web-wide, atau RAG.

## MVP 3

Tahap lanjutan untuk mendukung pemeriksaan dari screenshot.

Perubahan utama:

- Menambahkan mode input `Teks/Link` dan `Screenshot`.
- Menambahkan upload screenshot dengan validasi format JPG, PNG, WEBP.
- Membatasi ukuran screenshot maksimal 5MB.
- Menambahkan preview gambar sebelum teks dianalisis.
- Menambahkan OCR client-side menggunakan Tesseract.js.
- Memastikan gambar diproses di browser dan tidak dikirim ke server.
- Menampilkan loading state khusus saat OCR berjalan.
- Menampilkan pesan ramah jika OCR gagal atau teks pada gambar tidak terbaca jelas.
- Memasukkan hasil OCR ke editor teks agar pengguna bisa mengoreksi sebelum menekan `Cek Sekarang`.
- Menggunakan hasil OCR sebagai input teks biasa pada pipeline analisis yang sudah ada.
- Tidak mengubah heuristic analyzer, scraping MVP 2, atau API route utama.

## Heuristic Polish

Tahap perapian aturan deteksi berdasarkan pengujian screenshot pesan mencurigakan.

Perubahan utama:

- Menambahkan deteksi file APK atau ajakan membuka/menginstal aplikasi dari chat.
- Menambahkan deteksi pola mengatasnamakan instansi atau urusan penting sambil meminta pengguna membuka file/aplikasi.
- Menambahkan skenario manual testing untuk pesan APK mencurigakan seperti modus surat tilang.

## OCR UX Polish

Tahap perapian pengalaman pengguna pada mode screenshot.

Perubahan utama:

- Membersihkan teks OCR lama saat pengguna memilih screenshot baru.
- Membersihkan preview dan teks OCR jika validasi file gagal.
- Membersihkan teks OCR jika proses OCR gagal atau gambar tidak terbaca jelas.
- Membersihkan preview dan state OCR saat pengguna berpindah dari mode Screenshot ke Teks/Link.
- Mencegah pesan "teks dari screenshot" muncul untuk teks manual yang bukan hasil OCR.

## MVP 4

Tahap lanjutan untuk menambahkan web retrieval dan source comparison.

Perubahan utama:

- Menambahkan claim extraction sederhana dari input teks, hasil OCR, atau hasil scraping.
- Menambahkan search query generation untuk membuat query pencarian singkat.
- Menambahkan retrieval sumber pembanding server-side memakai Gemini Grounding with Google Search.
- Menambahkan normalisasi sumber grounding ke format `title`, `url`, `domain`, dan `snippet`.
- Membatasi retrieval maksimal 5 sumber.
- Menambahkan source ranking dan menampilkan maksimal 3 sumber terbaik.
- Memprioritaskan domain pemerintah, lembaga resmi, website fact-checking, media kredibel, dan HTTPS.
- Memperbarui prompt AI agar menerima klaim utama dan sumber pembanding.
- Menambahkan penjelasan perbandingan sumber dengan bahasa netral dan tidak absolut.
- Menambahkan section `Sumber Pembanding` pada result card.
- Menambahkan fallback aman jika grounding tidak tersedia, retrieval gagal, atau sumber relevan belum ditemukan.
- Tetap tanpa database, vector DB, embeddings, full RAG, login, atau penyimpanan riwayat.

## MVP 4 Stability Polish

Tahap perapian stabilitas dan penggunaan token pada retrieval/source comparison.

Perubahan utama:

- Membungkus claim extraction, query generation, retrieval, dan source ranking dengan fallback lokal.
- Memastikan kegagalan retrieval tidak menghentikan pipeline analisis lama.
- Menambahkan fallback retrieval kosong dengan pesan ramah untuk pengguna.
- Membatasi isi artikel yang masuk ke prompt AI agar penggunaan token lebih terkendali.
- Menambahkan penanda jika artikel dipotong untuk menjaga performa.

## MVP 4 Grounding Optimization

Tahap optimasi penggunaan Gemini Grounding agar lebih hemat kuota dan lebih cepat saat local development.

Perubahan utama:

- Menambahkan `ENABLE_GROUNDING` untuk mematikan grounding saat dibutuhkan.
- Menambahkan `GROUNDING_TIMEOUT_MS` untuk membatasi waktu tunggu grounding.
- Menambahkan `GROUNDING_MAX_KEY_ATTEMPTS` untuk membatasi jumlah API key yang dicoba khusus grounding.
- Menambahkan `GROUNDING_MIN_SCORE` dan `GROUNDING_MAX_SCORE` agar grounding hanya berjalan pada skor abu-abu.
- Mengubah grounding menjadi selektif berdasarkan konteks URL/scraping dan skor heuristic.
- Melewati grounding jika URL artikel sudah berhasil dibaca lewat scraping.
- Melewati grounding jika skor heuristic sudah sangat rendah atau sangat tinggi.
- Menambahkan reason fallback yang lebih jelas seperti `grounding_disabled`, `grounding_skipped_low_score`, `grounding_skipped_high_score`, `grounding_skipped_url_scraped`, `grounding_rate_limited`, `grounding_timeout`, `grounding_failed`, dan `grounding_success`.
