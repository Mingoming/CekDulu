import OpenAI from "openai";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const RETRYABLE_AI_STATUSES = new Set([401, 403, 408, 409, 429, 500, 502, 503, 504]);

function createClient(apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    timeout: 25000,
  });
}

export function getGeminiApiKeys() {
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_API_KEYS || "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean),
    ...Array.from({ length: 10 }, (_, index) =>
      process.env[`GEMINI_API_KEY_${index + 1}`]
    ),
  ].filter(Boolean);

  return [...new Set(apiKeys)];
}

function getErrorStatus(error) {
  return error?.status || error?.response?.status || error?.code;
}

function getErrorCode(error) {
  return error?.error?.status || error?.name || error?.code || "unknown";
}

function shouldTryNextApiKey(error) {
  const status = getErrorStatus(error);

  if (typeof status === "number") {
    return RETRYABLE_AI_STATUSES.has(status);
  }

  return [
    "APIConnectionError",
    "APIConnectionTimeoutError",
    "ETIMEDOUT",
    "ECONNRESET",
    "ENOTFOUND",
  ].includes(error?.name || error?.code);
}

export async function createCompletionWithFallback(messages) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("Tidak ada Gemini API key yang tersedia di server.");
  }

  let lastError = null;

  for (const [index, apiKey] of apiKeys.entries()) {
    try {
      const client = createClient(apiKey);

      return await client.chat.completions.create({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        messages,
        temperature: 0.2,
      });
    } catch (error) {
      lastError = error;
      console.error("[api/analyze] AI key attempt failed", {
        keyIndex: index + 1,
        status: getErrorStatus(error) || "unknown",
        code: getErrorCode(error),
        retryable: shouldTryNextApiKey(error),
      });

      if (!shouldTryNextApiKey(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Semua Gemini API key gagal digunakan.");
}
