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

export default function InputBox({
  value,
  onChange,
  onSubmit,
  disabled,
  examples,
  maxLength,
  label = "Tempel pesan, chat, atau link di sini:",
  placeholder = "Contoh: tempel chat WhatsApp, judul berita, caption, atau link yang ingin dicek...",
  showExamples = true,
  disabledLabel = "Sedang Mengecek...",
}) {
  const characterCount = value.length;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  return (
    <form onSubmit={onSubmit}>
      <div>
        <label
          htmlFor="message"
          className="font-lexend mb-2 block text-lg font-extrabold text-slate-900"
        >
          {label}
        </label>
        <textarea
          id="message"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={7}
          aria-describedby="message-counter"
          className="font-source h-[180px] w-full resize-none rounded-2xl border-2 border-slate-200 bg-white p-5 text-lg leading-relaxed text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder={placeholder}
        />
        {maxLength ? (
          <div
            id="message-counter"
            className={`mt-2 text-right text-sm font-bold ${
              isOverLimit ? "text-red-700" : "text-slate-500"
            }`}
          >
            {characterCount}/{maxLength} karakter
            {isOverLimit
              ? ` - kurangi ${characterCount - maxLength} karakter`
              : ""}
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="font-lexend mt-[15px] w-full cursor-pointer rounded-2xl bg-[#EA580C] px-6 py-5 text-center text-xl font-black text-white shadow-xl shadow-orange-600/10 transition-all duration-150 hover:bg-[#C2410C] focus:outline-none focus:ring-4 focus:ring-orange-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none disabled:scale-100"
      >
        {disabled ? disabledLabel : "Cek Sekarang"}
      </button>

      {showExamples ? (
        <div className="mt-4 space-y-2 rounded-2xl border-2 border-dashed border-slate-200 bg-[#F8FAFC] p-4">
          <p className="font-lexend text-sm font-bold text-slate-500">
            Klik contoh di bawah untuk mencoba:
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
                  className={`group flex min-h-14 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-base text-slate-700 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${tone.border}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-3 w-3 shrink-0 rounded-full ${tone.dot}`}
                  />
                  <span className="min-w-0 truncate">
                    <span className={`font-lexend font-extrabold ${tone.text}`}>
                      {example.label}
                    </span>
                    <span className="font-source font-normal text-slate-600">
                      {" "}
                      ({example.description})
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </form>
  );
}
