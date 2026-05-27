import {
  AlertIcon,
  ClipboardIcon,
  LightIcon,
  SearchIcon,
} from "@/components/Icons";

const riskDescriptions = {
  Rendah:
    "Pesan ini tidak menunjukkan banyak tanda mencurigakan dari pola teks. Tetap cek sumber bila informasinya penting.",
  "Perlu Dicek":
    "Ada beberapa tanda yang perlu diperiksa lagi sebelum pesan dipercaya atau dibagikan.",
  Mencurigakan:
    "Ada banyak tanda yang perlu diwaspadai. Sebaiknya jangan langsung dibagikan sebelum mengecek sumber resmi.",
};

function getRiskBadgeClass(score) {
  if (score >= 61) return "bg-red-600";
  if (score >= 31) return "bg-amber-500";

  return "bg-green-600";
}

function getActionBoxClasses(score) {
  if (score >= 61) {
    return {
      box: "border-red-500 bg-red-50 text-red-950",
      icon: "text-red-700",
    };
  }

  if (score >= 31) {
    return {
      box: "border-amber-500 bg-amber-50 text-amber-950",
      icon: "text-amber-700",
    };
  }

  return {
    box: "border-green-500 bg-[#F0FDF4] text-green-900",
    icon: "text-green-700",
  };
}

function shortenSnippet(snippet) {
  if (!snippet) return "Cuplikan sumber belum tersedia.";
  if (snippet.length <= 180) return snippet;

  return `${snippet.slice(0, 180).trim()}...`;
}

function InfoBox({ title, icon, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-100 bg-[#F8FAFC] p-4 ${className}`}>
      <h2 className="font-lexend mb-2 flex items-center gap-2 text-base font-extrabold text-slate-700">
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
            {icon}
          </span>
        ) : null}
        {title}
      </h2>
      <div className="font-source text-base leading-relaxed text-slate-800 sm:text-lg">
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
  const score = heuristic.score ?? 0;
  const level = heuristic.riskLevel || "Perlu Dicek";
  const actionTone = getActionBoxClasses(score);
  const hasGroundingSources = retrieval?.sources?.length > 0;
  const suspiciousReasons =
    ai.suspiciousReasons?.length > 0
      ? ai.suspiciousReasons
      : heuristic.detectedRules?.map((rule) => rule.reason) || [];

  return (
    <article className="animate-fadeIn space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl md:p-8">
      <header className="text-center">
        <span
          className={`font-lexend inline-flex rounded-full px-6 py-3 text-xl font-black leading-tight text-white shadow-lg ${getRiskBadgeClass(
            score
          )}`}
        >
          {level}
        </span>
        <p className="font-lexend mt-3 text-lg font-extrabold text-slate-900">
          Skor Risiko Kecurigaan: {score}/100
        </p>
        <p className="font-source mx-auto mt-2 max-w-md text-base leading-relaxed text-slate-600">
          {riskDescriptions[level]}
        </p>
        <div className="mx-auto mt-4 h-3 max-w-[360px] overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getRiskBadgeClass(
              score
            )}`}
            style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
          />
        </div>
        {!aiAvailable ? (
          <p className="font-source mx-auto mt-4 max-w-md rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold leading-relaxed text-blue-900">
            Analisis AI sedang tidak tersedia. Hasil di bawah memakai
            pemeriksaan dasar dari pola teks.
          </p>
        ) : null}
      </header>

      {isUrlInput ? (
        <InfoBox title="Sumber Link" icon={<SearchIcon />}>
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
        </InfoBox>
      ) : null}

      <InfoBox title="Klaim Utama" icon={<ClipboardIcon />}>
        <p className="text-lg font-medium italic text-slate-900">
          {ai.mainClaim || "Klaim utama belum dapat diambil dari teks."}
        </p>
      </InfoBox>

      <InfoBox title="Ringkasan Analisis" icon={<SearchIcon />}>
        {ai.summary || ai.simpleExplanation || "Ringkasan belum tersedia."}
      </InfoBox>

      {hasGroundingSources ? (
        <InfoBox title="Perbandingan Sumber" icon={<SearchIcon />}>
          {ai.sourceComparison ||
            "Sumber pembanding tersedia untuk dibandingkan dengan klaim."}
        </InfoBox>
      ) : null}

      {hasGroundingSources ? (
        <InfoBox title="Sumber Pembanding" icon={<ClipboardIcon />}>
          <div className="space-y-3">
            {retrieval.sources.map((source) => (
              <article
                key={source.url}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="font-lexend text-base font-extrabold leading-snug text-slate-900">
                  {source.title}
                </h3>
                <p className="mt-1 text-sm font-bold text-[#2563EB]">
                  {source.domain}
                </p>
                <p className="mt-2 text-base leading-relaxed text-slate-700">
                  {shortenSnippet(source.snippet)}
                </p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-bold text-[#2563EB] underline decoration-blue-200 underline-offset-4 transition-colors duration-200 hover:text-blue-900"
                >
                  Buka sumber
                </a>
              </article>
            ))}
          </div>
        </InfoBox>
      ) : null}

      <InfoBox title="Mengapa Perlu Hati-Hati" icon={<AlertIcon />}>
        {suspiciousReasons.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-base sm:text-lg">
            {suspiciousReasons.map((reason, index) => (
              <li key={`${reason}-${index}`}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p>Tidak ditemukan tanda mencurigakan yang kuat dari pola teks.</p>
        )}
      </InfoBox>

      <section
        className={`rounded-xl border-l-4 p-5 text-lg font-bold leading-relaxed shadow-sm ${actionTone.box}`}
      >
        <h2 className="font-lexend mb-2 flex items-center gap-2 text-lg font-black">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ${actionTone.icon}`}
          >
            <LightIcon />
          </span>
          Saran Tindakan
        </h2>
        <p className="font-source">
          {ai.recommendedAction ||
            "Tetap cek sumber resmi sebelum percaya atau menyebarkan pesan ini."}
        </p>
      </section>
    </article>
  );
}
