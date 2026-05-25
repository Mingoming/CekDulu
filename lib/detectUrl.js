import { validateUrlSyntax } from "@/lib/safeUrl";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/i;

function normalizeUrl(rawUrl) {
  const withProtocol = rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl;
  return new URL(withProtocol);
}

export function detectUrl(text) {
  const match = text.match(URL_PATTERN);

  if (!match) {
    return {
      isUrl: false,
      url: null,
      reason: null,
    };
  }

  try {
    const parsedUrl = normalizeUrl(match[0]);
    const validation = validateUrlSyntax(parsedUrl.toString());

    if (!validation.ok) {
      return {
        isUrl: false,
        url: null,
        reason: validation.reason,
      };
    }

    return {
      isUrl: true,
      url: parsedUrl.toString(),
      reason: null,
    };
  } catch {
    return {
      isUrl: false,
      url: null,
      reason: "Format URL tidak valid.",
    };
  }
}
