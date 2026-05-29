import OpenAI from "openai";

const DEFAULT_QUICK_MODEL = "gemma-4-26b-a4b-it";
const DEFAULT_QUICK_TIMEOUT_MS = 8000;
const DEFAULT_QUICK_MAX_OUTPUT_TOKENS = 500;

function getConfiguredPositiveInteger(name, fallbackValue) {
  const value = Number.parseInt(process.env[name] || "", 10);

  return Number.isInteger(value) && value > 0 ? value : fallbackValue;
}

function getGeminiApiKeys() {
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
  if (
    error?.name === "APIConnectionTimeoutError" ||
    error?.code === "ETIMEDOUT" ||
    error?.message?.toLowerCase?.().includes("timeout")
  ) {
    return "timeout";
  }

  return error?.status || error?.response?.status || error?.code || "unknown";
}

function getErrorCode(error) {
  return error?.error?.status || error?.name || error?.code || "unknown";
}

export function isQuickAiEnabled() {
  return process.env.AI_QUICK_FALLBACK_ENABLED !== "false";
}

export function getQuickAiModel() {
  return process.env.AI_QUICK_MODEL || DEFAULT_QUICK_MODEL;
}

export async function createQuickAiCompletion(messages) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("Tidak ada Gemini API key yang tersedia di server.");
  }

  const timeoutMs = getConfiguredPositiveInteger(
    "AI_QUICK_TIMEOUT_MS",
    DEFAULT_QUICK_TIMEOUT_MS
  );
  const model = getQuickAiModel();
  const startedAt = Date.now();
  const client = new OpenAI({
    apiKey: apiKeys[0],
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    timeout: timeoutMs,
    maxRetries: 0,
  });

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages,
        temperature: 0.1,
        max_tokens: getConfiguredPositiveInteger(
          "AI_QUICK_MAX_OUTPUT_TOKENS",
          DEFAULT_QUICK_MAX_OUTPUT_TOKENS
        ),
      },
      {
        timeout: timeoutMs,
        maxRetries: 0,
      }
    );

    return {
      completion,
      meta: {
        model,
        elapsedMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    const quickAiMeta = {
      model,
      elapsedMs: Date.now() - startedAt,
      status: getErrorStatus(error),
      code: getErrorCode(error),
    };

    if (error && typeof error === "object") {
      error.quickAiMeta = quickAiMeta;
    }

    throw error;
  }
}
