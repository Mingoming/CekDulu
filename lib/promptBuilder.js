export function buildAnalysisPrompt({ text, heuristic }) {
  const detectedLabels =
    heuristic.detectedRules.length > 0
      ? heuristic.detectedRules.map((rule) => `- ${rule.label}: ${rule.reason}`).join("\n")
      : "- Tidak ada indikator kuat dari heuristic analyzer.";

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
  "recommendedAction": "saran tindakan yang aman dan mudah dilakukan"
}

Aturan:
- Gunakan bahasa Indonesia.
- Jangan menambah fakta eksternal yang tidak ada di teks.
- Jika teks hanya berupa link, jelaskan bahwa isi link belum diverifikasi.
- Saran tindakan harus mendorong cek sumber resmi dan tidak langsung menyebarkan.`,
    },
  ];
}
