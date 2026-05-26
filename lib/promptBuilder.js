const MAX_ARTICLE_CONTEXT_LENGTH = 2800;
const ARTICLE_TRUNCATED_NOTICE =
  "[Artikel dipotong untuk menjaga performa]";

function limitArticleText(articleText) {
  if (!articleText || articleText.length <= MAX_ARTICLE_CONTEXT_LENGTH) {
    return articleText || "";
  }

  return `${articleText
    .slice(0, MAX_ARTICLE_CONTEXT_LENGTH)
    .trim()}\n${ARTICLE_TRUNCATED_NOTICE}`;
}

function buildArticleContext(article, domainAnalysis) {
  if (!article && !domainAnalysis) {
    return "Tidak ada data artikel atau domain tambahan.";
  }

  const articleTextForPrompt = limitArticleText(article?.articleText);
  const articleLines = article
    ? [
        `Status scraping: ${article.ok ? "berhasil" : "gagal"}`,
        `Domain: ${article.domain || domainAnalysis?.domain || "-"}`,
        `Judul: ${article.title || "-"}`,
        `Meta description: ${article.description || "-"}`,
        `Isi artikel: ${articleTextForPrompt || article.error || "-"}`,
      ]
    : [];

  const domainLines = domainAnalysis
    ? [
        `HTTPS: ${domainAnalysis.isHttps ? "ya" : "tidak"}`,
        `Shortlink: ${domainAnalysis.isShortlink ? "ya" : "tidak"}`,
        `Sinyal domain: ${
          domainAnalysis.signals.length > 0
            ? domainAnalysis.signals
                .map((signal) => `${signal.label} - ${signal.reason}`)
                .join("; ")
            : "tidak ada sinyal kuat"
        }`,
      ]
    : [];

  return [...articleLines, ...domainLines].join("\n");
}

function buildRetrievalContext(retrieval) {
  if (!retrieval) return "Sumber pembanding belum tersedia.";

  const sourceLines =
    retrieval.sources?.length > 0
      ? retrieval.sources
          .map(
            (source, index) =>
              `${index + 1}. ${source.title}\nDomain: ${source.domain}\nURL: ${source.url}\nRingkasan: ${source.snippet || "-"}`
          )
          .join("\n\n")
      : retrieval.message || "Sumber pembanding belum ditemukan.";

  return [
    `Klaim utama: ${retrieval.claim || "-"}`,
    `Query pencarian: ${retrieval.query || "-"}`,
    `Status sumber pembanding: ${retrieval.available ? "tersedia" : "belum tersedia"}`,
    `Sumber pembanding:\n${sourceLines}`,
  ].join("\n");
}

export function buildAnalysisPrompt({
  text,
  heuristic,
  article,
  domainAnalysis,
  claim,
  retrieval,
}) {
  const detectedLabels =
    heuristic.detectedRules.length > 0
      ? heuristic.detectedRules.map((rule) => `- ${rule.label}: ${rule.reason}`).join("\n")
      : "- Tidak ada indikator kuat dari heuristic analyzer.";
  const articleContext = buildArticleContext(article, domainAnalysis);
  const retrievalContext = buildRetrievalContext(retrieval);

  return [
    {
      role: "system",
      content:
        "Anda adalah asisten literasi digital untuk pengguna awam Indonesia. Jangan menentukan benar atau hoax secara mutlak. Jelaskan tanda-tanda risiko dengan bahasa sederhana, netral, dan tidak menakut-nakuti. Jawab hanya dalam JSON valid tanpa markdown.",
    },
    {
      role: "user",
      content: `Analisis pesan berikut berdasarkan hasil heuristic analyzer dan sumber pembanding jika tersedia.

Teks pengguna:
"""
${text}
"""

Data artikel dan domain jika ada:
"""
${articleContext}
"""

Hasil heuristic:
Skor risiko: ${heuristic.score}/100
Level risiko: ${heuristic.riskLevel}
Indikator terdeteksi:
${detectedLabels}

Klaim utama yang diekstrak:
"""
${claim || "-"}
"""

Sumber pembanding:
"""
${retrievalContext}
"""

Kembalikan JSON valid dengan bentuk berikut:
{
  "summary": "ringkasan singkat isi pesan",
  "mainClaim": "klaim utama yang perlu diperiksa",
  "riskLevel": "${heuristic.riskLevel}",
  "simpleExplanation": "penjelasan sederhana mengapa skor tersebut muncul",
  "sourceComparison": "penjelasan sederhana tentang apakah sumber pembanding mendukung klaim, tidak mendukung klaim, atau belum cukup jelas",
  "suspiciousReasons": ["alasan 1", "alasan 2"],
  "recommendedAction": "saran tindakan yang aman dan mudah dilakukan",
  "sourceDomain": "${article?.domain || domainAnalysis?.domain || ""}"
}

Aturan:
- Gunakan bahasa Indonesia.
- Jangan menambah fakta eksternal yang tidak ada di teks.
- Jika scraping berhasil, gunakan judul, deskripsi, dan isi artikel sebagai konteks utama.
- Jika scraping gagal, jelaskan bahwa isi link belum bisa dibaca otomatis.
- Jika sumber pembanding tersedia, bandingkan klaim dengan sumber tersebut secara hati-hati.
- Jika sumber pembanding belum tersedia atau belum relevan, tulis bahwa klaim perlu dicek ulang ke sumber resmi.
- Jangan mengatakan "pasti hoax" atau memberi kepastian mutlak.
- Gunakan wording netral seperti "belum ditemukan dukungan kuat", "perlu dicek ulang", atau "perlu dibandingkan dengan sumber resmi".
- Saran tindakan harus mendorong cek sumber resmi dan tidak langsung menyebarkan.`,
    },
  ];
}
