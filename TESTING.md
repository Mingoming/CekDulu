# CekDulu Manual Testing Checklist

Dokumen ini berisi checklist pengujian manual untuk memastikan fitur utama CekDulu berjalan baik tanpa perlu database atau setup tambahan selain API key.

## Persiapan

1. Jalankan dependency:

```bash
npm install
```

2. Pastikan `.env.local` tersedia:

```bash
GEMINI_API_KEY=isi_api_key_anda
GEMINI_MODEL=gemini-3-flash-preview
```

3. Jalankan aplikasi:

```bash
npm run dev
```

4. Buka:

```text
http://127.0.0.1:3000
```

## Dummy Input

### 1. Berita Normal

```text
Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) mengimbau masyarakat untuk tetap waspada terhadap potensi hujan ringan di wilayah Jabodetabek pada sore hari ini. Informasi resmi dapat dipantau melalui aplikasi InfoBMKG atau situs resmi bmkg.go.id.
```

Expected:

- Risiko cenderung rendah.
- Tidak banyak alasan mencurigakan.
- Saran tetap meminta pengguna mengecek sumber resmi.

### 2. Pesan Hoax Mencurigakan

```text
SEBARKAN!!! Rahasia besar yang media tidak berani ungkap akhirnya TERBONGKAR. Pemerintah menutupi fakta ini dari rakyat. Semua orang wajib tahu dan segera viralkan ke semua grup sebelum dihapus!!!
```

Expected:

- Risiko tinggi atau mencurigakan.
- Terdeteksi ajakan menyebarkan.
- Terdeteksi bahasa provokatif.
- Terdeteksi kapital atau tanda seru berlebihan.

### 3. Link Pendek Mencurigakan

```text
Pemerintah bagi-bagi bantuan sosial tunai 5 juta rupiah untuk semua pengguna WhatsApp. Buruan cek nama Anda sebelum ditutup: http://bit.ly/bansos-darurat-2026. Share ke grup lain agar kebagian!
```

Expected:

- Risiko minimal perlu dicek, bisa mencurigakan.
- Terdeteksi link pendek.
- Terdeteksi ajakan menyebarkan.
- Saran tidak langsung klik atau sebar.

### 4. Klaim Kesehatan Ekstrem

```text
Obat herbal ini dijamin 100% berhasil menyembuhkan kanker tanpa dokter. Cukup sekali minum sembuh total. Rahasia besar ini wajib dibagikan ke keluarga sekarang juga!!!
```

Expected:

- Risiko tinggi atau mencurigakan.
- Terdeteksi klaim kesehatan ekstrem.
- Terdeteksi klaim bombastis.
- Terdeteksi tanda seru atau ajakan menyebarkan.

### 5. Pesan Terlalu Panjang

Buat teks lebih dari 6000 karakter, misalnya salin paragraf berikut berulang kali sampai counter melewati batas:

```text
Ini adalah contoh teks panjang untuk menguji batas maksimal input CekDulu. Pengguna tidak seharusnya bisa mengirim teks yang melewati 6000 karakter karena aplikasi perlu menjaga proses analisis tetap ringan dan mudah dipahami.
```

Expected:

- Character counter menunjukkan jumlah karakter lebih dari 6000.
- Saat klik `Cek Sekarang`, aplikasi menampilkan error:

```text
Teks terlalu panjang. Batasi maksimal 6000 karakter.
```

- Request ke API tidak perlu berhasil dikirim.

## Checklist Validasi Input

- [ ] Textarea kosong lalu klik `Cek Sekarang`.
  - Expected: muncul pesan `Silakan tempel berita, chat, atau link terlebih dahulu.`
- [ ] Input hanya spasi lalu klik `Cek Sekarang`.
  - Expected: dianggap kosong dan muncul pesan validasi.
- [ ] Input normal di bawah 6000 karakter.
  - Expected: request diproses.
- [ ] Input lebih dari 6000 karakter.
  - Expected: client menolak submit dan menampilkan error panjang teks.
- [ ] Character counter bertambah saat user mengetik.
  - Expected: format counter `jumlah/6000 karakter`.
- [ ] Character counter berubah merah saat melewati 6000 karakter.

## Checklist Heuristic Analyzer

- [ ] Input berisi `sebarkan`, `viralkan`, `share`, `forward`, atau `bagikan`.
  - Expected: rule ajakan menyebarkan terdeteksi.
- [ ] Input berisi `darurat`, `hati-hati`, `pemerintah menutupi`, `media tidak berani`, atau `terbongkar`.
  - Expected: rule bahasa provokatif terdeteksi.
- [ ] Input berisi banyak huruf kapital seperti `SEBARKAN INI SEKARANG`.
  - Expected: rule huruf kapital berlebihan terdeteksi.
- [ ] Input berisi tanda seru berulang seperti `!!!`.
  - Expected: rule tanda seru berlebihan terdeteksi.
- [ ] Input berisi `menyembuhkan kanker`, `tanpa dokter`, `obat paling ampuh`, atau `sekali minum sembuh`.
  - Expected: rule klaim kesehatan ekstrem terdeteksi.
- [ ] Input berisi `100% berhasil`, `dijamin`, `rahasia besar`, atau `semua orang wajib tahu`.
  - Expected: rule klaim bombastis terdeteksi.
- [ ] Input tanpa sumber resmi atau domain yang jelas.
  - Expected: rule sumber tidak jelas terdeteksi.
- [ ] Input berisi `bit.ly`, `tinyurl`, `shortlink`, `s.id`, `cutt.ly`, `rebrand.ly`, atau `t.co`.
  - Expected: rule link mencurigakan terdeteksi.
- [ ] Skor risiko tidak pernah lebih dari 100.
- [ ] Mapping level benar:
  - `0-30`: Rendah
  - `31-60`: Perlu Dicek
  - `61-100`: Mencurigakan

## Checklist AI Fallback

Untuk menguji fallback, jalankan aplikasi tanpa `GEMINI_API_KEY` atau isi API key tidak valid.

- [ ] Submit input normal.
  - Expected: API tetap mengembalikan status 200.
- [ ] Result card tetap tampil.
  - Expected: skor dan level heuristic tetap muncul.
- [ ] Response API memiliki `aiAvailable: false`.
- [ ] Ringkasan memakai fallback explanation.
- [ ] Tidak ada raw error server/API key yang tampil di UI.
- [ ] Pesan ramah tersedia:

```text
Maaf, analisis AI sedang tidak tersedia. Kami tetap menampilkan hasil pemeriksaan dasar.
```

## Checklist Error Handling API

Gunakan DevTools, Postman, curl, atau client API lain.

- [ ] Request body invalid JSON ke `POST /api/analyze`.
  - Expected: status 400.
  - Expected body:

```json
{
  "error": "Format permintaan tidak valid."
}
```

- [ ] Request body `{}`.
  - Expected: status 400.
  - Expected: `Teks tidak boleh kosong.`
- [ ] Request body `{ "text": "" }`.
  - Expected: status 400.
  - Expected: `Teks tidak boleh kosong.`
- [ ] Request body dengan teks lebih dari 6000 karakter.
  - Expected: status 400.
  - Expected: `Teks terlalu panjang. Batasi maksimal 6000 karakter.`
- [ ] AI response gagal atau tidak bisa diparse.
  - Expected: status 200.
  - Expected: `aiAvailable: false`.
  - Expected: heuristic tetap ada.

## Checklist Loading State

- [ ] Klik `Cek Sekarang` dengan input valid.
  - Expected: tombol berubah menjadi `Sedang Mengecek...`.
- [ ] Selama loading, textarea dan tombol disabled.
- [ ] Loading state `Sedang memeriksa isi pesan...` terlihat.
- [ ] Setelah selesai, loading hilang.
- [ ] Jika request timeout, tampil pesan:

```text
Koneksi AI sedang lambat. Coba lagi sebentar lagi.
```

## Checklist Responsive Mobile UI

Uji di viewport berikut:

- [ ] 375px lebar mobile kecil.
- [ ] 390px lebar iPhone umum.
- [ ] 768px tablet.
- [ ] 1024px desktop kecil.

Expected:

- [ ] Tidak ada horizontal scroll.
- [ ] Header tetap terbaca.
- [ ] Textarea memenuhi lebar container.
- [ ] Tombol `Cek Sekarang` mudah ditekan.
- [ ] Contoh input tidak merusak layout.
- [ ] Result card tetap terbaca tanpa teks saling menumpuk.
- [ ] Character counter terlihat.
- [ ] Disclaimer tetap terbaca.

## Checklist UX Pengguna Awam

- [ ] Bahasa error mudah dipahami.
- [ ] Tidak ada istilah teknis seperti stack trace, exception, atau raw API error di UI.
- [ ] Disclaimer jelas bahwa hasil bukan kepastian benar/hoax.
- [ ] Saran tindakan mendorong cek sumber resmi.
- [ ] Warna risiko mudah dibedakan:
  - Hijau untuk rendah.
  - Kuning/coklat untuk perlu dicek.
  - Merah untuk mencurigakan.
- [ ] Tombol utama besar dan mudah ditemukan.
- [ ] Contoh input membantu user mencoba tanpa harus berpikir dulu.
- [ ] Hasil analisis langsung terlihat setelah proses selesai.

## Smoke Test Sebelum Push

Jalankan:

```bash
npm run lint
npm run build
```

Expected:

- [ ] Lint pass.
- [ ] Build pass.
