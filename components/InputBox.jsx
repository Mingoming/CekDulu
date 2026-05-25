const toneClasses = {
  red: {
    dot: "bg-red-600",
    border: "hover:border-red-200",
    text: "text-red-700",
  },
  yellow: {
    dot: "bg-amber-500",
    border: "hover:border-amber-200",
    text: "text-amber-700",
  },
  green: {
    dot: "bg-emerald-600",
    border: "hover:border-emerald-200",
    text: "text-emerald-700",
  },
};

export default function InputBox({ value, onChange, onSubmit, disabled, examples }) {
  return (
    <form onSubmit={onSubmit}>
      <div>
        <label
          htmlFor="message"
          className="mb-2 block text-lg font-bold text-slate-900"
        >
          Tempel Pesan/Chat/Link Di Sini:
        </label>
        <textarea
          id="message"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={7}
          className="h-[180px] w-full resize-y rounded-xl border-2 border-slate-300 bg-white px-[15px] py-[15px] text-lg leading-relaxed text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Tempel chat WhatsApp, caption, judul berita, atau link berita di sini..."
        />
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="mt-[15px] w-full cursor-pointer rounded-xl border-0 bg-sky-600 px-6 py-[18px] text-center text-[1.3rem] font-bold text-white shadow-[0_4px_6px_-1px_rgba(2,132,199,0.3)] transition-colors duration-200 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
      >
        {disabled ? "Sedang Mengecek..." : "Cek Sekarang"}
      </button>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-[15px]">
        <p className="mb-2 text-sm font-bold text-slate-500">
          Klik contoh di bawah untuk langsung mencoba:
        </p>
        <div className="grid gap-2">
          {examples?.map((example) => {
            const tone = toneClasses[example.tone] || toneClasses.green;

            return (
              <button
                key={example.label}
                type="button"
                disabled={disabled}
                onClick={() => onChange(example.text)}
                className={`group flex min-h-12 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 ${tone.border}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-3 w-3 shrink-0 rounded-full ${tone.dot}`}
                />
                <span className="min-w-0 truncate">
                  <span className={`font-bold ${tone.text}`}>{example.label}</span>
                  <span className="font-normal text-slate-600">
                    {" "}
                    ({example.description})
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
