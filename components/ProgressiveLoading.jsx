const stageItems = [
  {
    id: "input_processing",
    label: "Membaca input",
    threshold: 20,
  },
  {
    id: "risk_analysis",
    label: "Memeriksa tanda-tanda mencurigakan",
    threshold: 40,
  },
  {
    id: "retrieval_reading",
    label: "Membaca artikel atau tautan",
    threshold: 60,
  },
  {
    id: "retrieval_comparing",
    label: "Membandingkan informasi",
    threshold: 75,
  },
  {
    id: "report_generation",
    label: "Menyusun hasil analisis",
    threshold: 85,
  },
];

function getItemState(item, progress, status) {
  if (status === "completed" || progress >= 100) return "done";
  if (progress >= item.threshold) return "done";

  const currentItem = [...stageItems]
    .reverse()
    .find((stageItem) => progress >= stageItem.threshold - 15);

  return currentItem?.id === item.id ? "active" : "pending";
}

function StageIcon({ state }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
        ✓
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-xs font-black text-white">
        ...
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-black text-slate-400">
      -
    </span>
  );
}

export default function ProgressiveLoading({ progressState }) {
  const progress = Math.min(Math.max(progressState?.progress || 5, 0), 100);
  const status = progressState?.status || "running";
  const message = progressState?.message || "Menyiapkan analisis";
  const isReportTakingLong = Boolean(progressState?.isReportTakingLong);

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/60"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-lexend text-base font-extrabold text-slate-900">
            CekDulu sedang menganalisis
          </p>
          <p className="font-source mt-1 text-sm font-semibold text-slate-600">
            {message}
          </p>
          {isReportTakingLong ? (
            <p className="font-source mt-2 max-w-md text-sm font-bold leading-relaxed text-amber-700">
              AI sedang menyusun hasil. Jika terlalu lama, kami akan menampilkan
              hasil dasar.
            </p>
          ) : null}
        </div>
        <span className="font-lexend shrink-0 text-lg font-black text-sky-700">
          {progress}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        <div
          className="h-full rounded-full bg-sky-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {stageItems.map((item) => {
          const state = getItemState(item, progress, status);

          return (
            <li key={item.id} className="flex items-center gap-3">
              <StageIcon state={state} />
              <span
                className={`font-source text-base font-bold leading-snug ${
                  state === "pending" ? "text-slate-400" : "text-slate-800"
                }`}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

