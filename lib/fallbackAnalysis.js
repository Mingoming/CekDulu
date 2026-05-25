export const AI_UNAVAILABLE_MESSAGE =
  "Maaf, analisis AI sedang tidak tersedia. Kami tetap menampilkan hasil pemeriksaan dasar.";

export const fallbackAnalysis = {
  summary:
    "Analisis AI belum tersedia, tetapi pola teks tetap sudah diperiksa dengan aturan dasar CekDulu.",
  mainClaim: "Klaim utama belum dapat diringkas otomatis.",
  riskLevel: "Perlu Dicek",
  simpleExplanation:
    "Gunakan skor risiko dan alasan yang terdeteksi sebagai bantuan awal.",
  suspiciousReasons: [],
  recommendedAction:
    "Jangan langsung menyebarkan. Cek sumber resmi, cari pembanding dari media tepercaya, dan tanyakan pada pihak berwenang bila menyangkut kesehatan, uang, atau keselamatan.",
};

export function normalizeAnalysis(analysis, heuristic, sourceDomain = "") {
  return {
    summary: analysis?.summary || fallbackAnalysis.summary,
    mainClaim: analysis?.mainClaim || fallbackAnalysis.mainClaim,
    riskLevel: heuristic.riskLevel,
    simpleExplanation:
      analysis?.simpleExplanation || fallbackAnalysis.simpleExplanation,
    suspiciousReasons: Array.isArray(analysis?.suspiciousReasons)
      ? analysis.suspiciousReasons
      : heuristic.detectedRules.map((rule) => rule.reason),
    recommendedAction:
      analysis?.recommendedAction || fallbackAnalysis.recommendedAction,
    sourceDomain: analysis?.sourceDomain || sourceDomain,
  };
}
