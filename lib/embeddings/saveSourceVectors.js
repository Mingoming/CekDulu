import crypto from "node:crypto";
import { cosineSimilarity } from "@/lib/embeddings/cosineSimilarity";
import { generateEmbedding } from "@/lib/embeddings/generateEmbedding";
import { loadVectors, saveVectors } from "@/lib/embeddings/vectorStore";

const DUPLICATE_SIMILARITY_THRESHOLD = 0.95;
const MIN_VECTOR_TEXT_LENGTH = 80;

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildSourceText(source) {
  return [
    source?.title ? `Judul sumber: ${source.title}` : "",
    source?.domain ? `Domain: ${source.domain}` : "",
    source?.snippet ? `Cuplikan: ${source.snippet}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function createVectorId(url, text) {
  return `vec_${crypto
    .createHash("sha256")
    .update(`${url}:${text}`)
    .digest("hex")
    .slice(0, 16)}`;
}

function hasDuplicateUrl(existingVectors, url) {
  return existingVectors.some((vector) => url && vector.url === url);
}

function hasSimilarVector(existingVectors, embedding) {
  return existingVectors.some((vector) => {
    return cosineSimilarity(vector.embedding, embedding) > DUPLICATE_SIMILARITY_THRESHOLD;
  });
}

export async function saveSourceVectors({ sources }) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return {
      saved: 0,
      skipped: 0,
    };
  }

  try {
    const existingVectors = await loadVectors();
    const nextVectors = [...existingVectors];
    let saved = 0;
    let skipped = 0;

    for (const source of sources) {
      const url = cleanText(source?.url);
      const domain = cleanText(source?.domain);
      const text = cleanText(buildSourceText(source));

      if (!url || !domain || text.length < MIN_VECTOR_TEXT_LENGTH) {
        skipped += 1;
        continue;
      }

      if (hasDuplicateUrl(nextVectors, url)) {
        skipped += 1;
        continue;
      }

      const embedding = await generateEmbedding(text, "RETRIEVAL_DOCUMENT");

      if (!embedding || hasSimilarVector(nextVectors, embedding)) {
        skipped += 1;
        continue;
      }

      nextVectors.push({
        id: createVectorId(url, text),
        text,
        url,
        domain,
        sourceType: "grounding_source",
        embedding,
        createdAt: new Date().toISOString(),
      });
      saved += 1;
    }

    if (saved > 0) {
      await saveVectors(nextVectors);
    }

    return {
      saved,
      skipped,
    };
  } catch (error) {
    console.error("[saveSourceVectors] failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });

    return {
      saved: 0,
      skipped: sources.length,
    };
  }
}
