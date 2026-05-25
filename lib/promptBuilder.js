function buildArticleContext(article, domainAnalysis) {
  if (!article && !domainAnalysis) {
    return "Tidak ada data artikel atau domain tambahan.";
  }

  const articleLines = article
    ? [
        `Status scraping: ${article.ok ? "berhasil" : "gagal"}`,
        `Domain: ${article.domain || domainAnalysis?.domain || "-"}`,
        `Judul: ${article.title || "-"}`,
        `Meta description: ${article.description || "-"}`,
        `Isi artikel: ${article.articleText || article.error || "-"}`,
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

export function buildAnalysisPrompt({ text, heuristic, article, domainAnalysis }) {
  const detectedLabels =
    heuristic.detectedRules.length > 0
      ? heuristic.detectedRules.map((rule) => `- ${rule.label}: ${rule.reason}`).join("\n")
      : "- Tidak ada indikator kuat dari heuristic analyzer.";
  const articleContext = buildArticleContext(article, domainAnalysis);

  return [
    {
      role: "system",
      content:
        "Anda adalah asisten literasi digital untuk pengguna awam Indonesia. Jangan menentukan benar atau hoax secara mutlak. Jelaskan tanda-tanda risiko dengan bahasa sederhana, netral, dan tidak menakut-nakuti. Jawab hanya dalam JSON valid tanpa markdown.",
    },
    {
      role: "user",
      content: `Analisis pesan berikut berdasarkan hasil heuristic analyzer.

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

Kembalikan JSON valid dengan bentuk berikut:
{
  "summary": "ringkasan singkat isi pesan",
  "mainClaim": "klaim utama yang perlu diperiksa",
  "riskLevel": "${heuristic.riskLevel}",
  "simpleExplanation": "penjelasan sederhana mengapa skor tersebut muncul",
  "suspiciousReasons": ["alasan 1", "alasan 2"],
  "recommendedAction": "saran tindakan yang aman dan mudah dilakukan",
  "sourceDomain": "${article?.domain || domainAnalysis?.domain || ""}"
}

Aturan:
- Gunakan bahasa Indonesia.
- Jangan menambah fakta eksternal yang tidak ada di teks.
- Jika scraping berhasil, gunakan judul, deskripsi, dan isi artikel sebagai konteks utama.
- Jika scraping gagal, jelaskan bahwa isi link belum bisa dibaca otomatis.
- Saran tindakan harus mendorong cek sumber resmi dan tidak langsung menyebarkan.`,
    },
  ];
}
