const MAX_ARTICLE_CONTEXT_LENGTH = 1700;
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
  const articleTextForPrompt = limitArticleText(article?.articleText);
  const articleLines = article
    ? [
        `Status scraping: ${article.ok ? "berhasil" : "gagal"}`,
        article.domain || domainAnalysis?.domain
          ? `Domain: ${article.domain || domainAnalysis.domain}`
          : "",
        article.title ? `Judul: ${article.title}` : "",
        article.description ? `Meta description: ${article.description}` : "",
        articleTextForPrompt ? `Isi artikel: ${articleTextForPrompt}` : "",
        article.error && !articleTextForPrompt ? `Catatan scraping: ${article.error}` : "",
      ]
        .filter(Boolean)
    : [];

  return articleLines.join("\n");
}

function buildDomainAnalysisContext(domainAnalysis) {
  const domainLines = domainAnalysis
    ? [
        domainAnalysis.domain ? `Domain terdeteksi: ${domainAnalysis.domain}` : "",
        `HTTPS: ${domainAnalysis.isHttps ? "ya" : "tidak"}`,
        `Shortlink: ${domainAnalysis.isShortlink ? "ya" : "tidak"}`,
        domainAnalysis.signals.length > 0
          ? `Sinyal domain: ${domainAnalysis.signals
              .map((signal) => `${signal.label} - ${signal.reason}`)
              .join("; ")}`
          : "",
      ]
        .filter(Boolean)
    : [];

  return domainLines.join("\n");
}

function buildRetrievalContext(retrieval) {
  if (!retrieval?.sources?.length) return "";

  const sourceLines = retrieval.sources
    .map((source, index) =>
      [
        `${index + 1}. ${source.title || source.domain || source.url}`,
        source.domain ? `Domain: ${source.domain}` : "",
        source.url ? `URL: ${source.url}` : "",
        source.snippet ? `Ringkasan: ${source.snippet}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  return [
    retrieval.claim ? `Klaim utama: ${retrieval.claim}` : "",
    retrieval.query ? `Query pencarian: ${retrieval.query}` : "",
    `Sumber pembanding:\n${sourceLines}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function shortenMemoryText(text) {
  if (!text) return "";
  if (text.length <= 320) return text;

  return `${text.slice(0, 320).trim()}...`;
}

function buildMemoryContext(memory) {
  if (!memory?.results?.length) return "";

  return memory.results
    .map(
      (result, index) => {
        const shortenedText = shortenMemoryText(result.text);

        return [
          `${index + 1}.`,
          result.domain ? `Domain: ${result.domain}` : "",
          result.url ? `URL: ${result.url}` : "",
          Number.isFinite(result.similarity)
            ? `Similarity: ${result.similarity.toFixed(3)}`
            : "",
          shortenedText ? `Konteks: ${shortenedText}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
    )
    .join("\n\n");
}

function buildSection(title, content) {
  if (!content) return "";

  return `${title}:\n"""\n${content}\n"""`;
}

function shortenText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}...`;
}

function getMessagesLength(messages) {
  return messages.reduce((total, message) => total + message.content.length, 0);
}

export function buildAnalysisPromptWithMetrics({
  text,
  heuristic,
  article,
  domainAnalysis,
  claim,
  retrieval,
  memory,
}) {
  const detectedLabels =
    heuristic.detectedRules.length > 0
      ? heuristic.detectedRules.map((rule) => `- ${rule.label}: ${rule.reason}`).join("\n")
      : "- Tidak ada indikator kuat dari heuristic analyzer.";
  const articleContext = buildArticleContext(article, domainAnalysis);
  const domainAnalysisContext = buildDomainAnalysisContext(domainAnalysis);
  const retrievalContext = buildRetrievalContext(retrieval);
  const sourceComparisonContext =
    retrieval?.sources?.length > 0 && retrieval.sourceComparison
      ? retrieval.sourceComparison
      : "";
  const memoryContext = buildMemoryContext(memory);
  const heuristicContext = [
    `Skor risiko: ${heuristic.score}/100`,
    `Level risiko: ${heuristic.riskLevel}`,
    `Indikator terdeteksi:\n${detectedLabels}`,
  ].join("\n");
  const optionalSections = [
    buildSection("Data artikel", articleContext),
    buildSection("Analisis domain", domainAnalysisContext),
    buildSection("Sumber pembanding", retrievalContext),
    buildSection("Perbandingan sumber", sourceComparisonContext),
    buildSection("Konteks memory retrieval", memoryContext),
  ].filter(Boolean);
  const sourceDomain = article?.domain || domainAnalysis?.domain || "";
  const userContent = [
    "Analisis pesan berikut berdasarkan hasil heuristic analyzer dan konteks tambahan yang tersedia.",
    buildSection("Teks pengguna", text),
    buildSection("Hasil heuristic", heuristicContext),
    buildSection("Klaim utama yang diekstrak", claim || ""),
    ...optionalSections,
    `Kembalikan JSON valid dengan bentuk berikut:
{
  "summary": "ringkasan singkat isi pesan",
  "mainClaim": "klaim utama yang perlu diperiksa",
  "riskLevel": "${heuristic.riskLevel}",
  "simpleExplanation": "penjelasan sederhana mengapa skor tersebut muncul",
  "sourceComparison": "penjelasan sederhana tentang apakah sumber pembanding mendukung klaim, tidak mendukung klaim, atau belum cukup jelas",
  "suspiciousReasons": ["alasan 1", "alasan 2"],
  "recommendedAction": "saran tindakan yang aman dan mudah dilakukan",
  "sourceDomain": "${sourceDomain}"
}

Aturan:
- Gunakan bahasa Indonesia.
- Jangan menambah fakta eksternal yang tidak ada di teks.
- Jika scraping berhasil, gunakan judul, deskripsi, dan isi artikel sebagai konteks utama.
- Jika scraping gagal, jelaskan bahwa isi link belum bisa dibaca otomatis.
- Jika sumber pembanding tersedia, bandingkan klaim dengan sumber tersebut secara hati-hati.
- Jika sumber pembanding belum tersedia atau belum relevan, tulis bahwa klaim perlu dicek ulang ke sumber resmi.
- Jika konteks memory retrieval tersedia, gunakan sebagai pembanding tambahan, bukan sebagai kepastian mutlak.
- Jangan mengatakan "pasti hoax" atau memberi kepastian mutlak.
- Gunakan wording netral seperti "belum ditemukan dukungan kuat", "perlu dicek ulang", atau "perlu dibandingkan dengan sumber resmi".
- Saran tindakan harus mendorong cek sumber resmi dan tidak langsung menyebarkan.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    {
      role: "system",
      content:
        "Anda adalah asisten literasi digital untuk pengguna awam Indonesia. Jangan menentukan benar atau hoax secara mutlak. Jelaskan tanda-tanda risiko dengan bahasa sederhana, netral, dan tidak menakut-nakuti. Jawab hanya dalam JSON valid tanpa markdown.",
    },
    {
      role: "user",
      content: userContent,
    },
  ];

  return {
    messages,
    metrics: {
      promptLength: getMessagesLength(messages),
      claimLength: (claim || "").length,
      articleContextLength: articleContext.length,
      retrievalContextLength: retrievalContext.length,
      sourceComparisonLength: sourceComparisonContext.length,
      domainAnalysisLength: domainAnalysisContext.length,
      memoryContextLength: memoryContext.length,
      heuristicContextLength: heuristicContext.length,
      userTextLength: text.length,
    },
  };
}

export function buildAnalysisPrompt(options) {
  return buildAnalysisPromptWithMetrics(options).messages;
}

export function buildQuickFallbackPromptWithMetrics({
  heuristic,
  claim,
  sourceDomain,
  urlInfo,
  domainAnalysis,
  retrieval,
}) {
  const detectedFlags =
    heuristic.detectedRules.length > 0
      ? heuristic.detectedRules
          .slice(0, 6)
          .map((rule) => `- ${rule.label}: ${rule.reason}`)
          .join("\n")
      : "- Tidak ada indikator kuat dari heuristic analyzer.";
  const domainSignals =
    domainAnalysis?.signals?.length > 0
      ? domainAnalysis.signals
          .slice(0, 4)
          .map((signal) => `${signal.label}: ${signal.reason}`)
          .join("; ")
      : "";
  const sourceInfo = [
    sourceDomain ? `Domain sumber: ${sourceDomain}` : "",
    urlInfo?.isUrl ? "Input berisi URL: ya" : "Input berisi URL: tidak",
    domainSignals ? `Sinyal domain: ${domainSignals}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const hasSourceComparison = Boolean(retrieval?.sources?.length);
  const sourceComparison = hasSourceComparison
    ? shortenText(retrieval.sourceComparison || "", 220)
    : "";
  const sourceComparisonField = hasSourceComparison
    ? '\n  "sourceComparison": "perbandingan sumber sangat singkat",'
    : "";
  const userContent = [
    "Buat baseline analisis cepat berdasarkan heuristic CekDulu. Jangan mencari fakta baru.",
    buildSection(
      "Heuristic",
      [
        `Skor risiko: ${heuristic.score}/100`,
        `Level risiko: ${heuristic.riskLevel}`,
        `Indikator terdeteksi:\n${detectedFlags}`,
      ].join("\n")
    ),
    buildSection("Klaim utama", shortenText(claim || "", 240)),
    buildSection("Info sumber ringkas", sourceInfo),
    buildSection("Perbandingan sumber ringkas", sourceComparison),
    `Kembalikan JSON valid dengan bentuk berikut:
{
  "summary": "ringkasan sangat singkat",
  "mainClaim": "klaim utama yang perlu dicek",
  "riskLevel": "${heuristic.riskLevel}",
  "simpleExplanation": "maksimal 4 kalimat, sederhana dan netral",
  "suspiciousReasons": ["alasan singkat 1", "alasan singkat 2"],${sourceComparisonField}
  "recommendedAction": "saran tindakan aman dan mudah dilakukan"
}

Aturan:
- Kembalikan hanya JSON valid tanpa teks tambahan.
- Jangan tampilkan reasoning.
- Jangan tampilkan chain-of-thought.
- Jangan tampilkan langkah berpikir.
- Jangan tulis tag <thought>.
- Jangan tulis tag XML/HTML apa pun.
- Jangan tulis markdown.
- Jangan tulis penjelasan di luar JSON.
- Gunakan bahasa Indonesia sederhana.
- Maksimal 4 kalimat untuk penjelasan.
- Jangan mengatakan "pasti hoax".
- Jangan memberi kepastian mutlak.
- Jangan menambah fakta eksternal.
- Jangan sertakan sourceComparison jika tidak ada sumber pembanding.
- Fokus pada summary, mainClaim, riskLevel, simpleExplanation, suspiciousReasons, recommendedAction, dan sourceComparison jika ada.

Jangan jawab seperti ini:
<thought>...</thought>
Berikut analisanya...
\`\`\`json
{...}
\`\`\`

Jawab hanya seperti ini:
{
  "summary": "...",
  "mainClaim": "...",
  "riskLevel": "...",
  "simpleExplanation": "...",
  "suspiciousReasons": ["..."],
  "recommendedAction": "..."
}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    {
      role: "system",
      content:
        "Anda membantu pengguna awam mengecek risiko informasi. Jangan tampilkan reasoning, chain-of-thought, tag <thought>, tag XML/HTML, markdown, atau teks di luar JSON. Jawab hanya JSON object valid, singkat, netral, dan tidak absolut.",
    },
    {
      role: "user",
      content: userContent,
    },
  ];

  return {
    messages,
    metrics: {
      promptLength: getMessagesLength(messages),
      claimLength: (claim || "").length,
      sourceInfoLength: sourceInfo.length,
      sourceComparisonLength: sourceComparison.length,
      heuristicContextLength: detectedFlags.length,
    },
  };
}
