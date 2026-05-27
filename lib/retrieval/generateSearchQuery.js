const MIN_QUERY_WORDS = 5;
const MAX_QUERY_WORDS = 12;

const emotionalPatterns = [
  /\b(sebarkan|viralkan|bagikan|share|forward)\b/gi,
  /\b(buruan|segera|darurat|hati-hati|wajib|tolong|mohon)\b/gi,
  /\bjangan\s+sampai\b/gi,
  /https?:\/\/\S+/gi,
  /www\.\S+/gi,
  /[!]{2,}/g,
];

const stopWords = new Set([
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "dari",
  "pada",
  "ke",
  "di",
  "ini",
  "itu",
  "ada",
  "akan",
  "bisa",
  "dapat",
  "semua",
  "anda",
  "kami",
  "saya",
  "pesan",
]);

const contextKeywords = [
  {
    test: /(kesehatan|obat|kanker|vaksin|dokter|sembuh|penyakit|diabetes|darah)/i,
    keywords: ["kemenkes", "who", "cek", "fakta"],
  },
  {
    test: /(bansos|bantuan sosial|blt|subsidi|pemerintah|kemensos|ktp|nik)/i,
    keywords: ["kemensos", "kominfo", "cek", "fakta"],
  },
  {
    test: /(\.apk\b|\bapk\b|aplikasi|install|instal|tilang|polisi|polri|paket)/i,
    keywords: ["kominfo", "polri", "penipuan", "apk"],
  },
  {
    test: /(bank|rekening|transfer|pinjaman|investasi|ojk|bi|saldo|uang)/i,
    keywords: ["ojk", "bi", "penipuan"],
  },
];

function cleanClaim(claim) {
  return emotionalPatterns
    .reduce((value, pattern) => value.replace(pattern, " "), claim || "")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueWords(words) {
  const seen = new Set();

  return words.filter((word) => {
    const normalizedWord = word.toLowerCase();
    if (!normalizedWord || seen.has(normalizedWord)) return false;

    seen.add(normalizedWord);
    return true;
  });
}

function getContextKeywords(claim) {
  for (const context of contextKeywords) {
    if (context.test.test(claim)) {
      return context.keywords;
    }
  }

  return ["cek", "fakta"];
}

export function generateSearchQuery(claim) {
  const cleaned = cleanClaim(claim);
  const baseWords = cleaned
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()));
  const keywordWords = getContextKeywords(claim || "");
  const baseWordLimit = Math.max(
    MIN_QUERY_WORDS,
    MAX_QUERY_WORDS - keywordWords.length
  );
  const queryWords = uniqueWords([
    ...baseWords.slice(0, baseWordLimit),
    ...keywordWords,
  ]).slice(0, MAX_QUERY_WORDS);

  if (queryWords.length === 0) return "cek fakta";

  while (queryWords.length < MIN_QUERY_WORDS) {
    const fallbackWord = ["cek", "fakta", "resmi"].find(
      (word) => !queryWords.includes(word)
    );
    if (!fallbackWord) break;
    queryWords.push(fallbackWord);
  }

  return queryWords.join(" ");
}
