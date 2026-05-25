export default function LoadingState() {
  return (
    <section
      aria-live="polite"
      className="px-5 py-[30px] text-center text-[1.2rem] font-bold text-sky-600"
    >
      <div className="mx-auto mb-2.5 h-[35px] w-[35px] animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      <p>Sedang memeriksa isi pesan...</p>
    </section>
  );
}
