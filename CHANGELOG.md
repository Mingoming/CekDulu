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
