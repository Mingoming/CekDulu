const MAX_QUERY_LENGTH = 120;

const fillerPatterns = [
  /\b(sebarkan|viralkan|bagikan|share|forward)\b/gi,
  /\b(buruan|segera|wajib|tolong|mohon)\b/gi,
  /[!]{2,}/g,
];

export function generateSearchQuery(claim) {
  const cleaned = fillerPatterns
    .reduce((value, pattern) => value.replace(pattern, " "), claim)
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= MAX_QUERY_LENGTH) return cleaned;

  return cleaned.slice(0, MAX_QUERY_LENGTH).trim();
}
