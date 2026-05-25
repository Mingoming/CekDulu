export default function ErrorState({ message }) {
  return (
    <section
      role="alert"
      className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-5 text-red-950"
    >
      <p className="text-lg font-bold">Belum bisa memeriksa pesan</p>
      <p className="mt-1 text-base leading-relaxed">
        {message || "Coba periksa kembali teks Anda, lalu tekan tombol cek sekali lagi."}
      </p>
    </section>
  );
}
