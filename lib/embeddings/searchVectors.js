import { cosineSimilarity } from "@/lib/embeddings/cosineSimilarity";
import { generateEmbedding } from "@/lib/embeddings/generateEmbedding";
import { loadVectors } from "@/lib/embeddings/vectorStore";

const SIMILARITY_THRESHOLD = 0.7;
const TOP_K = 3;

function cleanQuery(query) {
  return typeof query === "string" ? query.replace(/\s+/g, " ").trim() : "";
}

export async function searchVectors(query) {
  const cleanedQuery = cleanQuery(query);

  if (!cleanedQuery) {
    return [];
  }

  try {
    const vectors = await loadVectors();
    if (vectors.length === 0) return [];

    const queryEmbedding = await generateEmbedding(cleanedQuery, "RETRIEVAL_QUERY");
    if (!queryEmbedding) return [];

    return vectors
      .map((vector) => ({
        id: vector.id,
        text: vector.text,
        url: vector.url,
        domain: vector.domain,
        sourceType: vector.sourceType,
        createdAt: vector.createdAt,
        similarity: cosineSimilarity(queryEmbedding, vector.embedding),
      }))
      .filter((result) => result.similarity >= SIMILARITY_THRESHOLD)
      .sort((first, second) => second.similarity - first.similarity)
      .slice(0, TOP_K);
  } catch (error) {
    console.error("[searchVectors] failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return [];
  }
}
