export default function ErrorState({ message }) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-900"
    >
      <p className="text-lg font-bold">Analisis gagal</p>
      <p className="mt-1 text-base leading-relaxed">{message}</p>
    </section>
  );
}
