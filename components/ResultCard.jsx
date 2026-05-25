import {
  AlertIcon,
  ClipboardIcon,
  LightIcon,
  SearchIcon,
} from "@/components/Icons";

const riskStyles = {
  Rendah: {
    border: "border-t-[#16a34a]",
    badge: "bg-[#16a34a] text-white",
    score: "text-slate-500",
    advice: "border-l-emerald-600 bg-emerald-50",
    meter: "bg-[#16a34a]",
  },
  "Perlu Dicek": {
    border: "border-t-[#ca8a04]",
    badge: "bg-[#ca8a04] text-white",
    score: "text-slate-500",
    advice: "border-l-amber-500 bg-amber-50",
    meter: "bg-[#ca8a04]",
  },
  Mencurigakan: {
    border: "border-t-[#dc2626]",
    badge: "bg-[#dc2626] text-white",
    score: "text-slate-500",
    advice: "border-l-red-600 bg-red-50",
    meter: "bg-[#dc2626]",
  },
};

function TextBlock({ title, icon, children, strong = false, tone = "" }) {
  return (
    <section className="mb-[15px]">
      <h2 className="mb-1 flex items-center gap-2 text-[1.1rem] font-bold text-slate-600">
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sky-700">
            {icon}
          </span>
        ) : null}
        {title}
      </h2>
      <div
        className={`rounded-lg bg-slate-50 px-[15px] py-3 text-[1.1rem] leading-relaxed text-slate-900 ${
          strong ? "font-bold" : ""
        } ${tone}`}
      >
        {children}
      </div>
    </section>
  );
}

export default function ResultCard({ result }) {
  const heuristic = result?.heuristic || {};
  const ai = result?.analysis || {};
  const level = heuristic.riskLevel || "Perlu Dicek";
  const styles = riskStyles[level] || riskStyles["Perlu Dicek"];
  const score = heuristic.score ?? 0;
  const suspiciousReasons =
    ai.suspiciousReasons?.length > 0
      ? ai.suspiciousReasons
      : heuristic.detectedRules?.map((rule) => rule.reason) || [];

  return (
    <article
      className={`rounded-[20px] border-t-8 bg-white p-6 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.05)] sm:p-7 ${styles.border}`}
    >
      <div className="mb-5 border-b-2 border-slate-100 pb-[15px] text-center">
        <span
          className={`mb-1 inline-flex rounded-full px-5 py-2 text-[1.4rem] font-bold leading-tight ${styles.badge}`}
        >
          {level}
        </span>
        <p className={`text-[1.1rem] font-medium ${styles.score}`}>
          Skor Risiko Kecurigaan: {score}/100
        </p>
        <div className="mx-auto mt-3 h-3 max-w-[340px] overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${styles.meter}`}
            style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
          />
        </div>
      </div>

      <div>
        <TextBlock title="Klaim Utama Pesan:" icon={<ClipboardIcon />}>
          {ai.mainClaim || "Klaim utama belum dapat diambil dari teks."}
        </TextBlock>

        <TextBlock title="Ringkasan Analisis:" icon={<SearchIcon />}>
          {ai.summary ||
            ai.simpleExplanation ||
            "Ringkasan belum tersedia."}
        </TextBlock>

        <TextBlock title="Mengapa Perlu Hati-Hati?" icon={<AlertIcon />}>
          {suspiciousReasons.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {suspiciousReasons.map((reason, index) => (
                <li key={`${reason}-${index}`}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p>Tidak ditemukan tanda mencurigakan yang kuat dari pola teks.</p>
          )}
        </TextBlock>

        <TextBlock
          title="Saran Tindakan:"
          icon={<LightIcon />}
          strong
          tone={`border-l-[5px] ${styles.advice}`}
        >
          {ai.recommendedAction ||
            "Tetap cek sumber resmi sebelum percaya atau menyebarkan pesan ini."}
        </TextBlock>
      </div>
    </article>
  );
}
