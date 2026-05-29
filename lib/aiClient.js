import OpenAI from "openai";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const DEFAULT_AI_TIMEOUT_MS = 12000;
const DEFAULT_AI_MAX_OUTPUT_TOKENS = 700;
const RETRYABLE_AI_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
let nextApiKeyIndex = 0;

function getConfiguredPositiveInteger(name, fallbackValue) {
  const value = Number.parseInt(process.env[name] || "", 10);

  return Number.isInteger(value) && value > 0 ? value : fallbackValue;
}

function createClient(apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    timeout: getConfiguredPositiveInteger("AI_TIMEOUT_MS", DEFAULT_AI_TIMEOUT_MS),
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

function getRoundRobinApiKeys(apiKeys) {
  const startIndex = nextApiKeyIndex % apiKeys.length;
  nextApiKeyIndex = (nextApiKeyIndex + 1) % apiKeys.length;

  return Array.from({ length: apiKeys.length }, (_, offset) => {
    const keyIndex = (startIndex + offset) % apiKeys.length;

    return {
      apiKey: apiKeys[keyIndex],
      keyIndex: keyIndex + 1,
    };
  });
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
  const maxAttempts = Math.min(
    getConfiguredPositiveInteger("AI_MAX_KEY_ATTEMPTS", 1),
    apiKeys.length
  );
  const attemptedApiKeys = getRoundRobinApiKeys(apiKeys).slice(0, maxAttempts);

  for (const [attemptIndex, { apiKey, keyIndex }] of attemptedApiKeys.entries()) {
    try {
      const client = createClient(apiKey);

      return await client.chat.completions.create({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: getConfiguredPositiveInteger(
          "AI_MAX_OUTPUT_TOKENS",
          DEFAULT_AI_MAX_OUTPUT_TOKENS
        ),
      });
    } catch (error) {
      lastError = error;
      console.error("[api/analyze] AI key attempt failed", {
        attemptIndex: attemptIndex + 1,
        keyIndex,
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
