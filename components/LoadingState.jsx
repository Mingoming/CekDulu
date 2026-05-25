export default function LoadingState() {
  return (
    <section
      aria-live="polite"
      className="rounded-[20px] bg-white px-5 py-7 text-center text-sky-700 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.05)]"
    >
      <div className="mx-auto mb-2.5 h-[35px] w-[35px] animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      <p className="text-[1.2rem] font-bold">CekDulu sedang memeriksa pesan...</p>
      <p className="mx-auto mt-1 max-w-sm text-base leading-relaxed text-slate-600">
        Mohon tunggu sebentar. Kami membaca pola teks dan menyiapkan saran yang mudah dipahami.
      </p>
    </section>
  );
}
