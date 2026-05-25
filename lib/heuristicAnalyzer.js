const rules = [
  {
    id: "share_request",
    label: "Ajakan menyebarkan",
    score: 20,
    test: (text) => /\b(sebarkan|viralkan|share|forward|bagikan)\b/i.test(text),
    reason:
      "Pesan mengajak pembaca untuk segera menyebarkan atau meneruskan informasi.",
  },
  {
    id: "provocative_language",
    label: "Bahasa provokatif",
    score: 15,
    test: (text) =>
      /(darurat|hati-hati|pemerintah menutupi|media tidak berani|terbongkar)/i.test(
        text
      ),
    reason:
      "Ada pilihan kata yang dramatis, memicu kepanikan, atau membangun kecurigaan tanpa bukti jelas.",
  },
  {
    id: "excessive_caps",
    label: "Huruf kapital berlebihan",
    score: 10,
    test: (text) => {
      const uppercaseWords = text.match(/\b[A-Z]{4,}\b/g) || [];
      const letters = text.replace(/[^a-zA-Z]/g, "");
      const uppercaseLetters = text.replace(/[^A-Z]/g, "");

      if (uppercaseWords.length >= 2) return true;
      if (letters.length < 20) return false;

      return uppercaseLetters.length / letters.length > 0.35;
    },
    reason:
      "Teks memakai huruf kapital berlebihan sehingga terasa seperti memaksa atau berteriak.",
  },
  {
    id: "excessive_exclamation",
    label: "Tanda seru berlebihan",
    score: 10,
    test: (text) => /!{2,}/.test(text),
    reason:
      "Tanda seru berulang sering dipakai untuk menekan emosi dan membuat pesan terasa mendesak.",
  },
  {
    id: "extreme_health_claim",
    label: "Klaim kesehatan ekstrem",
    score: 20,
    test: (text) =>
      /(menyembuhkan kanker|tanpa dokter|obat paling ampuh|sekali minum sembuh)/i.test(
        text
      ),
    reason:
      "Ada klaim kesehatan ekstrem atau janji kesembuhan instan yang perlu diverifikasi ke tenaga medis resmi.",
  },
  {
    id: "bombastic_claim",
    label: "Klaim bombastis",
    score: 15,
    test: (text) =>
      /(100%\s*berhasil|dijamin|rahasia besar|semua orang wajib tahu)/i.test(text),
    reason:
      "Pesan memakai klaim mutlak atau bombastis yang sering muncul pada informasi menyesatkan.",
  },
  {
    id: "suspicious_apk_file",
    label: "File APK mencurigakan",
    score: 45,
    test: (text) =>
      /(\.apk\b|\bapk\b|\bxapk\b|\bapks\b|unduh aplikasi|download aplikasi|install aplikasi|instal aplikasi|buka aplikasi)/i.test(
        text
      ),
    reason:
      "Pesan menyebut file APK atau meminta membuka/menginstal aplikasi. Modus seperti ini sering dipakai untuk menyebarkan aplikasi berbahaya lewat chat.",
  },
  {
    id: "official_impersonation_apk",
    label: "Mengatasnamakan instansi dengan file aplikasi",
    score: 20,
    test: (text) =>
      /(polisi|kepolisian|polri|tilang|pelanggaran|pajak|bank|kurir|paket|undangan|tagihan|bukti transfer)/i.test(
        text
      ) &&
      /(\.apk\b|\bapk\b|\baplikasi\b|unduh|download|install|instal|buka aplikasi)/i.test(
        text
      ),
    reason:
      "Pesan mengatasnamakan instansi atau urusan penting sambil mengarahkan pengguna membuka file/aplikasi. Pola ini perlu sangat diwaspadai.",
  },
  {
    id: "unclear_source",
    label: "Sumber tidak jelas",
    score: 15,
    test: (text) => !hasClearSource(text),
    reason:
      "Pesan tidak menunjukkan sumber resmi atau rujukan yang mudah diperiksa.",
  },
  {
    id: "suspicious_link",
    label: "Link mencurigakan",
    score: 15,
    test: (text) =>
      /(bit\.ly|tinyurl|shortlink|s\.id|cutt\.ly|rebrand\.ly|t\.co)/i.test(text),
    reason:
      "Terdapat link pendek atau link yang menyamarkan alamat tujuan.",
  },
];

const clearSourcePatterns = [
  /\b[a-z0-9-]+\.go\.id\b/i,
  /\b[a-z0-9-]+\.ac\.id\b/i,
  /\b[a-z0-9-]+\.or\.id\b/i,
  /\b(kominfo|kemenkes|kemkes|bmkg|ojk|polri|who|unicef)\b/i,
  /\b(turnbackhoax\.id|cekfakta\.com|kominfo\.go\.id|bmkg\.go\.id)\b/i,
];

function hasClearSource(text) {
  return clearSourcePatterns.some((pattern) => pattern.test(text));
}

export function getRiskLevel(score) {
  if (score <= 30) return "Rendah";
  if (score <= 60) return "Perlu Dicek";
  return "Mencurigakan";
}

export function analyzeHeuristics(text) {
  const detectedRules = rules
    .filter((rule) => rule.test(text))
    .map(({ id, label, score, reason }) => ({
      id,
      label,
      score,
      reason,
    }));

  const rawScore = detectedRules.reduce((total, rule) => total + rule.score, 0);
  const score = Math.min(rawScore, 100);

  return {
    score,
    riskLevel: getRiskLevel(score),
    detectedRules,
  };
}
