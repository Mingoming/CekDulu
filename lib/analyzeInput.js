import { analyzeDomain } from "@/lib/analyzeDomain";
import { createCompletionWithFallback } from "@/lib/aiClient";
import { detectUrl } from "@/lib/detectUrl";
import { AI_UNAVAILABLE_MESSAGE, normalizeAnalysis } from "@/lib/fallbackAnalysis";
import { analyzeHeuristics, getRiskLevel } from "@/lib/heuristicAnalyzer";
import { parseAiResponse } from "@/lib/parseAiResponse";
import { saveSourceVectors } from "@/lib/embeddings/saveSourceVectors";
import { searchVectors } from "@/lib/embeddings/searchVectors";
import { buildAnalysisPrompt } from "@/lib/promptBuilder";
import { extractClaim } from "@/lib/retrieval/extractClaim";
import { generateSearchQuery } from "@/lib/retrieval/generateSearchQuery";
import { rankSources } from "@/lib/retrieval/rankSources";
import { retrieveSources } from "@/lib/retrieval/retrieveSources";
import { scrapeArticle } from "@/lib/scrapeArticle";

const RETRIEVAL_FALLBACK_MESSAGE =
  "Sumber pembanding belum tersedia. Hasil analisis dasar tetap ditampilkan.";
const DEFAULT_MIN_GROUNDING_SCORE = 35;
const DEFAULT_MAX_GROUNDING_SCORE = 65;
const MEMORY_HIT_SIMILARITY = 0.75;

function getConfiguredNumber(name, fallbackValue) {
  const value = Number.parseInt(process.env[name] || "", 10);

  return Number.isInteger(value) ? value : fallbackValue;
}

function getGroundingScoreRange() {
  const minScore = getConfiguredNumber(
    "GROUNDING_MIN_SCORE",
    DEFAULT_MIN_GROUNDING_SCORE
  );
  const maxScore = getConfiguredNumber(
    "GROUNDING_MAX_SCORE",
    DEFAULT_MAX_GROUNDING_SCORE
  );

  return minScore <= maxScore
    ? { minScore, maxScore }
    : {
        minScore: DEFAULT_MIN_GROUNDING_SCORE,
        maxScore: DEFAULT_MAX_GROUNDING_SCORE,
      };
}

function buildAnalysisText(text, article) {
  if (!article?.ok) return text;

  return [
    text,
    article.title ? `Judul artikel: ${article.title}` : "",
    article.description ? `Deskripsi artikel: ${article.description}` : "",
    article.articleText ? `Isi artikel: ${article.articleText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function combineWithDomainAnalysis(heuristic, domainAnalysis) {
  if (!domainAnalysis) return heuristic;

  const detectedRules = [
    ...heuristic.detectedRules,
    ...domainAnalysis.signals.map((signal) => ({
      id: signal.id,
      label: signal.label,
      score: signal.score,
      reason: signal.reason,
    })),
  ];
  const score = Math.min(heuristic.score + domainAnalysis.score, 100);

  return {
    score,
    riskLevel: getRiskLevel(score),
    detectedRules,
  };
}

function combineDomainAnalyses(...analyses) {
  const validAnalyses = analyses.filter(Boolean);
  if (validAnalyses.length === 0) return null;

  const signalMap = new Map();

  for (const analysis of validAnalyses) {
    for (const signal of analysis.signals) {
      signalMap.set(`${analysis.domain}:${signal.id}`, signal);
    }
  }

  const signals = [...signalMap.values()];
  const score = Math.min(
    signals.reduce((total, signal) => total + signal.score, 0),
    40
  );
  const finalAnalysis = validAnalyses[validAnalyses.length - 1];

  return {
    ...finalAnalysis,
    signals,
    score,
  };
}

function buildFallbackResponse({
  heuristic,
  sourceDomain,
  claim,
  urlInfo,
  article,
  domainAnalysis,
  initialDomainAnalysis,
  finalDomainAnalysis,
  retrieval,
  memory,
}) {
  return {
    heuristic,
    analysis: normalizeAnalysis(null, heuristic, sourceDomain, {
      claim,
      sourceComparison: retrieval?.sourceComparison,
    }),
    aiAvailable: false,
    urlInfo,
    article,
    domainAnalysis,
    initialDomainAnalysis,
    finalDomainAnalysis,
    retrieval,
    memory,
    message: AI_UNAVAILABLE_MESSAGE,
  };
}

function buildFallbackRetrieval({
  claim = "",
  query = "",
  reason = "retrieval_unavailable",
  skipReason = "",
} = {}) {
  return {
    claim,
    query,
    available: false,
    retrievalAvailable: false,
    reason,
    skipReason,
    message: RETRIEVAL_FALLBACK_MESSAGE,
    sourceComparison: RETRIEVAL_FALLBACK_MESSAGE,
    sources: [],
  };
}

function hasRelevantMemory(memory) {
  return memory?.results?.some(
    (result) => Number(result.similarity) >= MEMORY_HIT_SIMILARITY
  );
}

function shouldUseGrounding({ urlInfo, article, heuristic, memory }) {
  const { minScore, maxScore } = getGroundingScoreRange();

  if (process.env.ENABLE_GROUNDING === "false") {
    return {
      ok: false,
      reason: "grounding_disabled",
    };
  }

  if (urlInfo.isUrl && article?.ok && heuristic.score < minScore) {
    return {
      ok: false,
      reason: "grounding_skipped_url_scraped_low_risk",
    };
  }

  if (heuristic.score < minScore) {
    return {
      ok: false,
      reason: "grounding_skipped_low_score",
    };
  }

  if (heuristic.score > maxScore) {
    return {
      ok: false,
      reason: "grounding_skipped_high_score",
    };
  }

  if (hasRelevantMemory(memory)) {
    return {
      ok: false,
      reason: "grounding_skipped_memory_hit",
    };
  }

  return {
    ok: true,
    reason: null,
  };
}

function isVectorMemoryEnabled() {
  return process.env.ENABLE_VECTOR_MEMORY === "true";
}

async function buildRetrievalContext({
  claim,
  query,
  article,
  heuristic,
  urlInfo,
  memory,
}) {
  try {
    const groundingDecision = shouldUseGrounding({
      urlInfo,
      article,
      heuristic,
      memory,
    });

    if (!groundingDecision.ok) {
      return buildFallbackRetrieval({
        claim,
        query,
        reason: groundingDecision.reason,
        skipReason: groundingDecision.reason,
      });
    }

    const retrievalResult = await retrieveSources(query);
    const rankedSources = rankSources(retrievalResult.sources);

    return {
      claim,
      query,
      available: retrievalResult.ok,
      retrievalAvailable: retrievalResult.ok,
      reason: retrievalResult.reason,
      message: retrievalResult.message,
      sourceComparison:
        retrievalResult.ok && rankedSources.length > 0
          ? "Sumber pembanding tersedia untuk dibandingkan dengan klaim."
          : RETRIEVAL_FALLBACK_MESSAGE,
      sources: rankedSources,
    };
  } catch (error) {
    console.error("[retrieval] local pipeline failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return buildFallbackRetrieval({ claim, query });
  }
}

async function buildMemoryContext(query) {
  if (!isVectorMemoryEnabled()) {
    return {
      available: false,
      results: [],
      message: "Konteks memory retrieval belum tersedia.",
    };
  }

  try {
    const results = await searchVectors(query);

    return {
      available: results.length > 0,
      results,
      message:
        results.length > 0
          ? "Konteks memory retrieval ditemukan."
          : "Konteks memory retrieval belum tersedia.",
    };
  } catch (error) {
    console.error("[memory] search failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });

    return {
      available: false,
      results: [],
      message: "Konteks memory retrieval belum tersedia.",
    };
  }
}

async function persistMemorySources({ retrieval }) {
  if (!isVectorMemoryEnabled()) {
    return;
  }

  if (retrieval?.reason !== "grounding_success" || retrieval.sources.length === 0) {
    return;
  }

  try {
    await saveSourceVectors({
      sources: retrieval.sources,
    });
  } catch (error) {
    console.error("[memory] save failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}

function getAiErrorStatus(error) {
  return error?.status || error?.response?.status || error?.code || "unknown";
}

function getSafeContentPreview(content) {
  if (typeof content !== "string") return "";

  return content.replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function analyzeInput(text) {
  const urlInfo = detectUrl(text);
  let article = null;
  let domainAnalysis = null;
  let initialDomainAnalysis = null;
  let finalDomainAnalysis = null;

  if (urlInfo.isUrl) {
    initialDomainAnalysis = analyzeDomain(urlInfo.url);
    article = await scrapeArticle(urlInfo.url);
    finalDomainAnalysis = analyzeDomain(article.finalUrl || urlInfo.url);
    domainAnalysis = combineDomainAnalyses(
      initialDomainAnalysis,
      finalDomainAnalysis
    );
  }

  const analysisText = buildAnalysisText(text, article);
  const heuristic = combineWithDomainAnalysis(
    analyzeHeuristics(analysisText),
    domainAnalysis
  );
  const claim = extractClaim({ text: analysisText, article });
  const query = generateSearchQuery(claim);
  const memory = await buildMemoryContext(query || claim || analysisText);
  const retrieval = await buildRetrievalContext({
    claim,
    query,
    article,
    heuristic,
    urlInfo,
    memory,
  });
  await persistMemorySources({ retrieval });
  const sourceDomain = article?.domain || domainAnalysis?.domain || "";
  const fallbackPayload = {
    heuristic,
    sourceDomain,
    claim,
    urlInfo,
    article,
    domainAnalysis,
    initialDomainAnalysis,
    finalDomainAnalysis,
    retrieval,
    memory,
  };

  try {
    const completion = await createCompletionWithFallback(
      buildAnalysisPrompt({
        text,
        heuristic,
        article,
        domainAnalysis,
        claim,
        retrieval,
        memory,
      })
    );

    const content = completion.choices?.[0]?.message?.content;
    const parsedAnalysis = parseAiResponse(content);

    if (!parsedAnalysis) {
      console.error("[api/analyze] AI returned unparsable JSON", {
        contentLength: typeof content === "string" ? content.length : 0,
        contentPreview: getSafeContentPreview(content),
      });
      return buildFallbackResponse(fallbackPayload);
    }

    return {
      heuristic,
      analysis: normalizeAnalysis(parsedAnalysis, heuristic, sourceDomain, {
        claim,
        sourceComparison: retrieval?.sourceComparison,
      }),
      aiAvailable: true,
      urlInfo,
      article,
      domainAnalysis,
      initialDomainAnalysis,
      finalDomainAnalysis,
      retrieval,
      memory,
    };
  } catch (error) {
    console.error("[api/analyze] AI unavailable", {
      status: getAiErrorStatus(error),
      message:
        getAiErrorStatus(error) === 429
          ? "Quota AI Gemini habis atau terkena rate limit."
          : "AI tidak tersedia. Menggunakan fallback heuristic.",
    });
    return buildFallbackResponse(fallbackPayload);
  }
}
