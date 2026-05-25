import Image from "next/image";

export default function ImagePreview({ imageUrl, fileName, onClear, disabled }) {
  if (!imageUrl) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-bold text-slate-600">
          {fileName || "Preview screenshot"}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="shrink-0 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Hapus
        </button>
      </div>
      <Image
        src={imageUrl}
        alt="Preview screenshot yang diunggah"
        width={640}
        height={360}
        unoptimized
        className="h-auto max-h-80 w-full rounded-lg border border-slate-200 object-contain"
      />
    </section>
  );
}
