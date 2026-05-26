const MAX_CLAIM_LENGTH = 220;

function cleanText(value) {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimClaim(value) {
  const cleaned = cleanText(value);
  if (cleaned.length <= MAX_CLAIM_LENGTH) return cleaned;

  return `${cleaned.slice(0, MAX_CLAIM_LENGTH).trim()}...`;
}

export function extractClaim({ text, article }) {
  if (article?.ok && article.title) {
    return trimClaim(article.title);
  }

  const cleanedText = cleanText(text);
  const sentences = cleanedText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const meaningfulSentence =
    sentences.find((sentence) => sentence.length >= 24) || sentences[0] || "";

  return trimClaim(meaningfulSentence || cleanedText);
}
