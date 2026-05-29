export const AI_UNAVAILABLE_MESSAGE =
  "Maaf, analisis AI sedang tidak tersedia. Kami tetap menampilkan hasil pemeriksaan dasar.";

export const fallbackAnalysis = {
  summary:
    "Analisis AI belum tersedia, tetapi pola teks tetap sudah diperiksa dengan aturan dasar CekDulu.",
  mainClaim: "Klaim utama belum dapat diringkas otomatis.",
  riskLevel: "Perlu Dicek",
  simpleExplanation:
    "Gunakan skor risiko dan alasan yang terdeteksi sebagai bantuan awal.",
  sourceComparison:
    "Sumber pembanding belum tersedia. Hasil analisis dasar tetap ditampilkan.",
  suspiciousReasons: [],
  recommendedAction:
    "Jangan langsung menyebarkan. Cek sumber resmi, cari pembanding dari media tepercaya, dan tanyakan pada pihak berwenang bila menyangkut kesehatan, uang, atau keselamatan.",
};

function getFirstText(source, keys) {
  for (const key of keys) {
    const value = source?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getFirstStringArray(source, keys) {
  for (const key of keys) {
    const value = source?.[key];

    if (!Array.isArray(value)) continue;

    const cleanedItems = value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    if (cleanedItems.length > 0) {
      return cleanedItems;
    }
  }

  return [];
}

function buildSummaryFallback(mainClaim) {
  if (!mainClaim || mainClaim === fallbackAnalysis.mainClaim) {
    return fallbackAnalysis.summary;
  }

  return `Pesan ini memuat klaim utama: "${mainClaim}". Analisis AI belum memberi ringkasan lengkap, tetapi pola risikonya tetap diperiksa dengan aturan dasar CekDulu.`;
}

export function normalizeAnalysis(
  analysis,
  heuristic,
  sourceDomain = "",
  context = {}
) {
  const heuristicReasons = heuristic.detectedRules.map((rule) => rule.reason);
  const mainClaim =
    getFirstText(analysis, [
      "mainClaim",
      "claim",
      "klaimUtama",
      "klaim_utama",
      "klaim",
    ]) ||
    context.claim ||
    fallbackAnalysis.mainClaim;
  const suspiciousReasons =
    getFirstStringArray(analysis, [
      "suspiciousReasons",
      "reasons",
      "warningReasons",
      "alasanKecurigaan",
      "alasan_kehati_hatian",
      "alasanKehatiHatian",
    ]) || heuristicReasons;

  return {
    summary:
      getFirstText(analysis, ["summary", "ringkasan", "ringkasanAnalisis"]) ||
      buildSummaryFallback(mainClaim),
    mainClaim,
    riskLevel: heuristic.riskLevel,
    simpleExplanation:
      getFirstText(analysis, [
        "simpleExplanation",
        "explanation",
        "penjelasan",
        "penjelasanSederhana",
      ]) || fallbackAnalysis.simpleExplanation,
    sourceComparison:
      getFirstText(analysis, [
        "sourceComparison",
        "comparison",
        "perbandinganSumber",
        "perbandingan_sumber",
      ]) ||
      context.sourceComparison ||
      fallbackAnalysis.sourceComparison,
    suspiciousReasons:
      suspiciousReasons.length > 0 ? suspiciousReasons : heuristicReasons,
    recommendedAction:
      getFirstText(analysis, [
        "recommendedAction",
        "action",
        "saran",
        "saranTindakan",
        "rekomendasi",
      ]) || fallbackAnalysis.recommendedAction,
    sourceDomain:
      getFirstText(analysis, ["sourceDomain", "domainSumber"]) || sourceDomain,
  };
}
