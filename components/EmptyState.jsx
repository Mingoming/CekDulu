import { SearchIcon } from "@/components/Icons";

export default function EmptyState() {
  return (
    <section className="rounded-[20px] border border-dashed border-slate-300 bg-white/80 px-5 py-6 text-center text-slate-700">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <SearchIcon className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Belum ada hasil pemeriksaan</h2>
      <p className="mx-auto mt-2 max-w-md text-base leading-relaxed">
        Tempel pesan, berita, atau link di kolom atas. Setelah itu tekan
        tombol Cek Sekarang untuk melihat skor risiko dan saran sederhana.
      </p>
    </section>
  );
}
