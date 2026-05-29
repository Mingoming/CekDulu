import OpenAI from "openai";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const DEFAULT_AI_TIMEOUT_MS = 9000;
const DEFAULT_AI_REQUEST_BUDGET_MS = 14000;
const DEFAULT_AI_MAX_KEY_ATTEMPTS = 2;
const DEFAULT_AI_MAX_OUTPUT_TOKENS = 900;
const DEFAULT_AI_KEY_COOLDOWN_MS = 120000;
const DEFAULT_AI_INVALID_KEY_COOLDOWN_MS = 900000;
const MIN_AI_ATTEMPT_BUDGET_MS = 3000;
const RETRYABLE_AI_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
let nextApiKeyIndex = 0;
const keyCooldowns = new Map();
const analysisResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "cekdulu_analysis",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        mainClaim: { type: "string" },
        riskLevel: { type: "string" },
        simpleExplanation: { type: "string" },
        sourceComparison: { type: "string" },
        suspiciousReasons: {
          type: "array",
          items: { type: "string" },
        },
        recommendedAction: { type: "string" },
        sourceDomain: { type: "string" },
      },
      required: [
        "summary",
        "mainClaim",
        "riskLevel",
        "simpleExplanation",
        "sourceComparison",
        "suspiciousReasons",
        "recommendedAction",
        "sourceDomain",
      ],
    },
    strict: true,
  },
};

export function getAnalysisResponseSchemaLength() {
  return JSON.stringify(analysisResponseFormat).length;
}

function getConfiguredPositiveInteger(name, fallbackValue) {
  const value = Number.parseInt(process.env[name] || "", 10);

  return Number.isInteger(value) && value > 0 ? value : fallbackValue;
}

function createClient(apiKey, timeoutMs) {
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    timeout: timeoutMs,
    maxRetries: 0,
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

function getHealthyRoundRobinApiKeys(apiKeys) {
  const now = Date.now();
  const orderedApiKeys = getRoundRobinApiKeys(apiKeys);
  const healthyApiKeys = orderedApiKeys.filter(
    ({ apiKey }) => (keyCooldowns.get(apiKey) || 0) <= now
  );

  return healthyApiKeys.length > 0 ? healthyApiKeys : orderedApiKeys;
}

function getErrorStatus(error) {
  if (
    error?.name === "APIConnectionTimeoutError" ||
    error?.code === "ETIMEDOUT" ||
    error?.message?.toLowerCase?.().includes("timeout")
  ) {
    return "timeout";
  }

  return error?.status || error?.response?.status || error?.code;
}

function getErrorCode(error) {
  return error?.error?.status || error?.name || error?.code || "unknown";
}

function shouldTryNextApiKey(error) {
  const status = getErrorStatus(error);

  if (typeof status === "number") {
    if (status === 400 || status === 404) return false;

    return status === 401 || status === 403 || RETRYABLE_AI_STATUSES.has(status);
  }

  return [
    "Error",
    "APIConnectionError",
    "APIConnectionTimeoutError",
    "ETIMEDOUT",
    "ECONNRESET",
    "ENOTFOUND",
  ].includes(error?.name || error?.code);
}

function getCooldownMsForError(error) {
  const status = getErrorStatus(error);

  if (status === 401 || status === 403) {
    return getConfiguredPositiveInteger(
      "AI_INVALID_KEY_COOLDOWN_MS",
      DEFAULT_AI_INVALID_KEY_COOLDOWN_MS
    );
  }

  return getConfiguredPositiveInteger(
    "AI_KEY_COOLDOWN_MS",
    DEFAULT_AI_KEY_COOLDOWN_MS
  );
}

function putKeyOnCooldown(apiKey, error) {
  keyCooldowns.set(apiKey, Date.now() + getCooldownMsForError(error));
}

export async function createCompletionWithFallback(messages) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("Tidak ada Gemini API key yang tersedia di server.");
  }

  let lastError = null;
  const requestDeadline =
    Date.now() +
    getConfiguredPositiveInteger("AI_REQUEST_BUDGET_MS", DEFAULT_AI_REQUEST_BUDGET_MS);
  const configuredTimeoutMs = getConfiguredPositiveInteger(
    "AI_TIMEOUT_MS",
    DEFAULT_AI_TIMEOUT_MS
  );
  const maxAttempts = Math.min(
    getConfiguredPositiveInteger("AI_MAX_KEY_ATTEMPTS", DEFAULT_AI_MAX_KEY_ATTEMPTS),
    apiKeys.length
  );
  const attemptedApiKeys = getHealthyRoundRobinApiKeys(apiKeys).slice(0, maxAttempts);

  for (const [attemptIndex, { apiKey, keyIndex }] of attemptedApiKeys.entries()) {
    const remainingBudgetMs = requestDeadline - Date.now();

    if (remainingBudgetMs < MIN_AI_ATTEMPT_BUDGET_MS) {
      break;
    }

    const attemptTimeoutMs = Math.min(configuredTimeoutMs, remainingBudgetMs);
    const attemptStartedAt = Date.now();
    const requestStart = new Date(attemptStartedAt).toISOString();
    const model = process.env.AI_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL;

    try {
      const client = createClient(
        apiKey,
        attemptTimeoutMs
      );

      const completion = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: 0.2,
          response_format: analysisResponseFormat,
          max_tokens: getConfiguredPositiveInteger(
            "AI_MAX_OUTPUT_TOKENS",
            DEFAULT_AI_MAX_OUTPUT_TOKENS
          ),
        },
        {
          timeout: attemptTimeoutMs,
          maxRetries: 0,
        }
      );
      keyCooldowns.delete(apiKey);
      const requestEndMs = Date.now();
      console.info("[api/analyze] AI request succeeded", {
        requestStart,
        requestEnd: new Date(requestEndMs).toISOString(),
        elapsedMs: requestEndMs - attemptStartedAt,
        keyIndex,
        model,
      });

      return completion;
    } catch (error) {
      lastError = error;
      putKeyOnCooldown(apiKey, error);
      console.error("[api/analyze] AI key attempt failed", {
        attemptIndex: attemptIndex + 1,
        keyIndex,
        status: getErrorStatus(error) || "unknown",
        name: error?.name || "unknown",
        code: getErrorCode(error),
        message: error instanceof Error ? error.message : "unknown error",
        retryable: shouldTryNextApiKey(error),
        requestStart,
        requestEnd: new Date().toISOString(),
        model,
        attemptTimeoutMs,
        elapsedMs: Date.now() - attemptStartedAt,
        remainingBudgetMs: Math.max(requestDeadline - Date.now(), 0),
      });

      if (!shouldTryNextApiKey(error)) {
        throw error;
      }

      if (requestDeadline - Date.now() < MIN_AI_ATTEMPT_BUDGET_MS) {
        break;
      }
    }
  }

  throw lastError || new Error("Semua Gemini API key gagal digunakan.");
}
