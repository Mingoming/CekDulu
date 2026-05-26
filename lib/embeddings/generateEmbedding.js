import { getGeminiApiKeys } from "@/lib/aiClient";

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MAX_EMBEDDING_TEXT_LENGTH = 1200;
const EMBEDDING_TIMEOUT_MS = 6000;

function getEmbeddingModel() {
  return process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

function limitText(text) {
  const cleanedText = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";

  if (cleanedText.length <= MAX_EMBEDDING_TEXT_LENGTH) return cleanedText;

  return cleanedText.slice(0, MAX_EMBEDDING_TEXT_LENGTH).trim();
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateEmbedding(text, taskType = "RETRIEVAL_DOCUMENT") {
  const apiKeys = getGeminiApiKeys();
  const apiKey = apiKeys[0];
  const limitedText = limitText(text);

  if (!apiKey || !limitedText) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${EMBEDDING_API_BASE_URL}/models/${encodeURIComponent(
        getEmbeddingModel()
      )}:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: limitedText }],
          },
          taskType,
        }),
        signal: controller.signal,
      }
    );
    const data = await readJsonSafely(response);

    if (!response.ok) {
      console.error("[embedding] request failed", {
        status: response.status,
        code: data?.error?.status || "unknown",
      });
      return null;
    }

    const values = data?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch (error) {
    console.error("[embedding] unavailable", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
