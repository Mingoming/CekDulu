import { validateUrlSyntax } from "@/lib/safeUrl";

const MAX_GROUNDING_SOURCES = 5;
const MAX_SNIPPET_LENGTH = 260;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function getSourceDomain(url, title) {
  const domain = getDomain(url);
  const normalizedTitle = cleanText(title).replace(/^www\./, "").toLowerCase();
  const titleLooksLikeDomain =
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalizedTitle) &&
    !normalizedTitle.includes(" ");

  if (domain === "vertexaisearch.cloud.google.com" && titleLooksLikeDomain) {
    return normalizedTitle;
  }

  return domain;
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function shortenSnippet(value) {
  const snippet = cleanText(value);
  if (snippet.length <= MAX_SNIPPET_LENGTH) return snippet;

  return `${snippet.slice(0, MAX_SNIPPET_LENGTH).trim()}...`;
}

function getSupportSnippetMap(groundingSupports) {
  const snippetMap = new Map();

  for (const support of groundingSupports || []) {
    const snippet = support?.segment?.text || support?.segment?.part?.text || "";
    const indices = Array.isArray(support?.groundingChunkIndices)
      ? support.groundingChunkIndices
      : [];

    for (const index of indices) {
      if (!snippetMap.has(index)) {
        snippetMap.set(index, shortenSnippet(snippet));
      }
    }
  }

  return snippetMap;
}

export function normalizeGroundingSources(groundingMetadata) {
  const chunks = Array.isArray(groundingMetadata?.groundingChunks)
    ? groundingMetadata.groundingChunks
    : [];
  const snippetMap = getSupportSnippetMap(groundingMetadata?.groundingSupports);
  const sourceMap = new Map();

  for (const [index, chunk] of chunks.entries()) {
    const url = cleanText(chunk?.web?.uri || chunk?.retrievedContext?.uri);
    if (!url || sourceMap.has(url)) continue;

    try {
      const validation = validateUrlSyntax(url);
      if (!validation.ok) continue;

      const title = cleanText(chunk?.web?.title || chunk?.retrievedContext?.title);
      const domain = getSourceDomain(url, title);
      if (!domain) continue;

      sourceMap.set(url, {
        title: title || domain,
        url,
        domain,
        snippet: snippetMap.get(index) || "",
      });
    } catch {
      // Skip malformed or unsupported grounding URLs.
    }
  }

  return [...sourceMap.values()].slice(0, MAX_GROUNDING_SOURCES);
}
