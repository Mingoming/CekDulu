export default function ExtractedTextEditor({ hasText }) {
  if (!hasText) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base leading-relaxed text-emerald-900">
      Teks dari screenshot sudah masuk ke kolom editor. Silakan periksa dan
      rapikan jika ada bagian yang salah terbaca, lalu tekan Cek Sekarang.
    </div>
  );
}
