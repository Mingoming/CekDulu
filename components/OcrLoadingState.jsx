export default function OcrLoadingState() {
  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-4 text-center text-sky-800"
    >
      <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      <p className="font-bold">Sedang membaca teks dari gambar...</p>
      <p className="mt-1 text-sm text-slate-600">
        Proses ini berjalan di browser. Screenshot tidak dikirim ke server.
      </p>
    </section>
  );
}
