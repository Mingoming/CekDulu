export default function ImageUploadBox({ onFileSelect, disabled }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-[15px]">
      <label
        htmlFor="screenshot-upload"
        className="block text-lg font-bold text-slate-900"
      >
        Upload screenshot
      </label>
      <p className="mt-1 text-base leading-relaxed text-slate-600">
        Pilih gambar JPG, PNG, atau WEBP. Maksimal 5MB. Gambar dibaca di browser
        dan tidak dikirim ke server.
      </p>
      <input
        id="screenshot-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelect(file);
          event.target.value = "";
        }}
        className="mt-4 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-base text-slate-700 file:mr-4 file:cursor-pointer file:border-0 file:bg-sky-600 file:px-4 file:py-3 file:text-base file:font-bold file:text-white hover:file:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </section>
  );
}
