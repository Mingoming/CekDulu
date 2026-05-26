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

const riskDescriptions = {
  Rendah:
    "Pesan ini tidak menunjukkan banyak tanda mencurigakan dari pola teks. Tetap cek sumber bila informasinya penting.",
  "Perlu Dicek":
    "Ada beberapa tanda yang perlu diperiksa lagi sebelum pesan dipercaya atau dibagikan.",
  Mencurigakan:
    "Ada banyak tanda yang perlu diwaspadai. Sebaiknya jangan langsung dibagikan sebelum mengecek sumber resmi.",
};

function shortenSnippet(snippet) {
  if (!snippet) return "Cuplikan sumber belum tersedia.";
  if (snippet.length <= 180) return snippet;

  return `${snippet.slice(0, 180).trim()}...`;
}

function TextBlock({ title, icon, children, strong = false, tone = "" }) {
  return (
    <section>
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
  const article = result?.article;
  const domainAnalysis = result?.domainAnalysis;
  const finalDomainAnalysis = result?.finalDomainAnalysis;
  const retrieval = result?.retrieval;
  const isUrlInput = result?.urlInfo?.isUrl;
  const aiAvailable = result?.aiAvailable !== false;
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
        <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-slate-600">
          {riskDescriptions[level]}
        </p>
        <div className="mx-auto mt-3 h-3 max-w-[340px] overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${styles.meter}`}
            style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
          />
        </div>
        {!aiAvailable ? (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold leading-relaxed text-sky-800">
            Analisis AI sedang tidak tersedia. Hasil di bawah memakai
            pemeriksaan dasar dari pola teks.
          </p>
        ) : null}
      </div>

      <div className="space-y-[15px]">
        {isUrlInput ? (
          <TextBlock title="Sumber Link:" icon={<SearchIcon />}>
            <div className="space-y-2">
              <p>
                Domain akhir:{" "}
                <span className="font-bold">
                  {ai.sourceDomain ||
                    article?.domain ||
                    finalDomainAnalysis?.domain ||
                    domainAnalysis?.domain ||
                    "-"}
                </span>
              </p>
              <p>
                HTTPS:{" "}
                <span className="font-bold">
                  {(finalDomainAnalysis || domainAnalysis)?.isHttps ? "Ya" : "Tidak"}
                </span>
              </p>
              {article?.scrapeSuccess ? (
                <p>Isi artikel berhasil dibaca otomatis untuk membantu analisis.</p>
              ) : (
                <p>
                  {article?.errorReason ||
                    article?.error ||
                    "Isi artikel belum bisa dibaca otomatis. CekDulu tetap memeriksa link yang ditempel."}
                </p>
              )}
            </div>
          </TextBlock>
        ) : null}

        <TextBlock title="Klaim Utama Pesan:" icon={<ClipboardIcon />}>
          {ai.mainClaim || "Klaim utama belum dapat diambil dari teks."}
        </TextBlock>

        <TextBlock title="Ringkasan Analisis:" icon={<SearchIcon />}>
          {ai.summary ||
            ai.simpleExplanation ||
            "Ringkasan belum tersedia."}
        </TextBlock>

        <TextBlock title="Perbandingan Sumber:" icon={<SearchIcon />}>
          {ai.sourceComparison ||
            "Sumber pembanding belum tersedia. Hasil analisis dasar tetap ditampilkan."}
        </TextBlock>

        <TextBlock title="Sumber Pembanding:" icon={<ClipboardIcon />}>
          {retrieval?.sources?.length > 0 ? (
            <div className="space-y-3">
              {retrieval.sources.map((source) => (
                <article
                  key={source.url}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <h3 className="text-base font-bold leading-snug text-slate-900">
                    {source.title}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-sky-700">
                    {source.domain}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-slate-700">
                    {shortenSnippet(source.snippet)}
                  </p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-bold text-sky-700 underline decoration-sky-200 underline-offset-4 hover:text-sky-900"
                  >
                    Buka sumber
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p>
              {retrieval?.message ||
                "Sumber pembanding belum tersedia. Hasil analisis dasar tetap ditampilkan."}
            </p>
          )}
        </TextBlock>

        <TextBlock title="Tanda yang Perlu Dicek:" icon={<AlertIcon />}>
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
