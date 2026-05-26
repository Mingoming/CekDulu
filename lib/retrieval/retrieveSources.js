import { getGeminiApiKeys } from "@/lib/aiClient";
import { normalizeGroundingSources } from "@/lib/retrieval/normalizeGroundingSources";

const DEFAULT_GROUNDING_MODEL = "gemini-3-flash-preview";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_RETRIEVAL_TIMEOUT_MS = 5000;
const RETRYABLE_GROUNDING_STATUSES = new Set([
  401,
  403,
  408,
  409,
  429,
  500,
  502,
  503,
  504,
]);

export const RETRIEVAL_UNAVAILABLE_MESSAGE =
  "Sumber pembanding belum tersedia. Hasil analisis dasar tetap ditampilkan.";

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getGroundingModel() {
  return (
    process.env.GEMINI_GROUNDING_MODEL ||
    process.env.GEMINI_MODEL ||
    DEFAULT_GROUNDING_MODEL
  );
}

function getGroundingMaxKeyAttempts(totalKeys) {
  const configuredValue = Number.parseInt(
    process.env.GROUNDING_MAX_KEY_ATTEMPTS || "1",
    10
  );
  const maxAttempts =
    Number.isInteger(configuredValue) && configuredValue > 0
      ? configuredValue
      : 1;

  return Math.min(maxAttempts, totalKeys);
}

function getGroundingTimeoutMs() {
  const configuredValue = Number.parseInt(
    process.env.GROUNDING_TIMEOUT_MS || "",
    10
  );

  return Number.isInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_RETRIEVAL_TIMEOUT_MS;
}

function buildGroundingPrompt(query) {
  return `Cari sumber pembanding terpercaya untuk klaim berikut dengan Google Search.

Klaim:
${query}

Prioritaskan sumber pemerintah, lembaga resmi, situs fact-checking, media kredibel, dan sumber HTTPS. Jelaskan secara singkat apakah ada sumber yang mendukung, membantah, atau belum cukup jelas. Jangan menyatakan kepastian mutlak.`;
}

function buildGroundingRequest(query) {
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: buildGroundingPrompt(query) }],
      },
    ],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 700,
    },
  };
}

async function requestGroundedSearch({ apiKey, query, signal }) {
  const model = getGroundingModel();
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildGroundingRequest(query)),
      signal,
    }
  );
  const data = await readJsonSafely(response);

  if (!response.ok) {
    const error = new Error("Gemini grounding request failed.");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

function getErrorStatus(error) {
  return error?.status || error?.response?.status || error?.code;
}

function getErrorCode(error) {
  return error?.details?.error?.status || error?.name || error?.code || "unknown";
}

function shouldTryNextApiKey(error) {
  const status = getErrorStatus(error);

  if (typeof status === "number") {
    return RETRYABLE_GROUNDING_STATUSES.has(status);
  }

  return ["AbortError", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND"].includes(
    error?.name || error?.code
  );
}

function getFallbackReason(error) {
  const status = getErrorStatus(error);

  if (status === 429) return "grounding_rate_limited";
  if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") {
    return "grounding_timeout";
  }

  return "grounding_failed";
}

export async function retrieveSources(query) {
  const apiKeys = getGeminiApiKeys();

  if (!query) {
    return {
      ok: false,
      reason: "empty_query",
      message: RETRIEVAL_UNAVAILABLE_MESSAGE,
      sources: [],
    };
  }

  if (apiKeys.length === 0) {
    return {
      ok: false,
      reason: "missing_api_key",
      message: RETRIEVAL_UNAVAILABLE_MESSAGE,
      sources: [],
    };
  }

  let lastError = null;
  const groundingApiKeys = apiKeys.slice(0, getGroundingMaxKeyAttempts(apiKeys.length));

  for (const [index, apiKey] of groundingApiKeys.entries()) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getGroundingTimeoutMs());

    try {
      const data = await requestGroundedSearch({
        apiKey,
        query,
        signal: controller.signal,
      });
      const groundingMetadata = data?.candidates?.[0]?.groundingMetadata;
      const sources = normalizeGroundingSources(groundingMetadata);

      return {
        ok: sources.length > 0,
        reason: sources.length > 0 ? "grounding_success" : "grounding_failed",
        message:
          sources.length > 0
            ? "Sumber pembanding berhasil ditemukan."
            : RETRIEVAL_UNAVAILABLE_MESSAGE,
        sources,
      };
    } catch (error) {
      lastError = error;
      console.error("[retrieval] Gemini grounding attempt failed", {
        keyIndex: index + 1,
        status: getErrorStatus(error) || "unknown",
        code: getErrorCode(error),
        retryable: shouldTryNextApiKey(error),
      });

      if (getErrorStatus(error) === 429) {
        return {
          ok: false,
          reason: "grounding_rate_limited",
          message: RETRIEVAL_UNAVAILABLE_MESSAGE,
          sources: [],
        };
      }

      if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") {
        return {
          ok: false,
          reason: "grounding_timeout",
          message: RETRIEVAL_UNAVAILABLE_MESSAGE,
          sources: [],
        };
      }

      if (!shouldTryNextApiKey(error)) {
        break;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.error("[retrieval] Gemini grounding unavailable", {
    status: getErrorStatus(lastError) || "unknown",
    code: getErrorCode(lastError),
    message:
      getErrorStatus(lastError) === 429
        ? "Quota grounding Gemini habis atau terkena rate limit."
        : "Grounding tidak tersedia. Menggunakan fallback sumber pembanding.",
  });

  return {
    ok: false,
    reason: getFallbackReason(lastError),
    message: RETRIEVAL_UNAVAILABLE_MESSAGE,
    sources: [],
  };
}
