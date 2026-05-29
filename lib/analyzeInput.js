import { analyzeDomain } from "@/lib/analyzeDomain";
import {
  createCompletionWithFallback,
  getAnalysisResponseSchemaLength,
} from "@/lib/aiClient";
import { detectUrl } from "@/lib/detectUrl";
import { AI_UNAVAILABLE_MESSAGE, normalizeAnalysis } from "@/lib/fallbackAnalysis";
import { analyzeHeuristics, getRiskLevel } from "@/lib/heuristicAnalyzer";
import { parseAiResponse } from "@/lib/parseAiResponse";
import { saveSourceVectors } from "@/lib/embeddings/saveSourceVectors";
import { searchVectors } from "@/lib/embeddings/searchVectors";
import {
  buildAnalysisPromptWithMetrics,
  buildQuickFallbackPromptWithMetrics,
} from "@/lib/promptBuilder";
import { extractClaim } from "@/lib/retrieval/extractClaim";
import { generateSearchQuery } from "@/lib/retrieval/generateSearchQuery";
import { rankSources } from "@/lib/retrieval/rankSources";
import { retrieveSources } from "@/lib/retrieval/retrieveSources";
import { scrapeArticle } from "@/lib/scrapeArticle";
import {
  createQuickAiCompletion,
  getQuickAiModel,
  isQuickAiEnabled,
} from "@/lib/quickAiClient";

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
  reason = "ai_unavailable",
}) {
  console.info("[api/analyze] template_fallback_used", {
    reason,
    heuristicScore: heuristic.score,
    riskLevel: heuristic.riskLevel,
  });

  return {
    heuristic,
    analysis: normalizeAnalysis(null, heuristic, sourceDomain, {
      claim,
      sourceComparison: retrieval?.sourceComparison,
    }),
    aiAvailable: false,
    aiMode: "template_fallback",
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

  if (urlInfo.isUrl && article?.ok) {
    return {
      ok: false,
      reason: "grounding_skipped_url_scraped",
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

    console.info("[retrieval] grounding decision", {
      shouldUseGrounding: groundingDecision.ok,
      reason: groundingDecision.reason || "grounding_enabled",
      isUrl: urlInfo.isUrl,
      articleOk: Boolean(article?.ok),
      heuristicScore: heuristic.score,
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

function logPromptAudit(metrics) {
  console.info("[api/analyze] AI prompt audit", {
    ...metrics,
    schemaLength: getAnalysisResponseSchemaLength(),
  });
}

function limitSimpleExplanation(analysis) {
  if (typeof analysis?.simpleExplanation !== "string") {
    return analysis;
  }

  const sentences = analysis.simpleExplanation
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 4) {
    return analysis;
  }

  return {
    ...analysis,
    simpleExplanation: sentences.slice(0, 4).join(" "),
  };
}

function getContentPreview(content) {
  if (typeof content !== "string") return "";

  return content.replace(/\s+/g, " ").trim().slice(0, 80);
}

function extractFirstValidJsonObject(content) {
  if (typeof content !== "string") return "";

  for (
    let startIndex = content.indexOf("{");
    startIndex !== -1;
    startIndex = content.indexOf("{", startIndex + 1)
  ) {
    let depth = 0;
    let isInsideString = false;
    let isEscaped = false;

    for (let index = startIndex; index < content.length; index += 1) {
      const char = content[index];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        isInsideString = !isInsideString;
        continue;
      }

      if (isInsideString) continue;

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          const candidate = content.slice(startIndex, index + 1);

          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            break;
          }
        }
      }
    }
  }

  return "";
}

function cleanQuickAiContent(content) {
  if (typeof content !== "string") {
    return {
      cleanedContent: "",
      removedThought: false,
      cleanupApplied: false,
    };
  }

  const originalContent = content.trim();
  let cleanedContent = originalContent.replace(
    /<thought\b[^>]*>[\s\S]*?<\/thought>/gi,
    ""
  );
  let removedThought = cleanedContent !== originalContent;

  if (/^\s*<thought\b[^>]*>/i.test(cleanedContent)) {
    const firstJsonObject = extractFirstValidJsonObject(cleanedContent);
    cleanedContent = firstJsonObject || "";
    removedThought = true;
  }

  const firstJsonObject = extractFirstValidJsonObject(cleanedContent);

  if (firstJsonObject) {
    cleanedContent = firstJsonObject;
  }

  cleanedContent = cleanedContent.trim();

  return {
    cleanedContent,
    removedThought,
    cleanupApplied: removedThought || cleanedContent !== originalContent,
  };
}

function isUnusableQuickAnalysis(content, parsedAnalysis) {
  const contentLength = typeof content === "string" ? content.trim().length : 0;

  if (contentLength < 20) return true;
  if (!parsedAnalysis || typeof parsedAnalysis !== "object") return true;
  if (Object.keys(parsedAnalysis).length === 0) return true;

  const hasRequiredCore =
    typeof parsedAnalysis.summary === "string" &&
    parsedAnalysis.summary.trim() &&
    typeof parsedAnalysis.mainClaim === "string" &&
    parsedAnalysis.mainClaim.trim() &&
    typeof parsedAnalysis.simpleExplanation === "string" &&
    parsedAnalysis.simpleExplanation.trim() &&
    Array.isArray(parsedAnalysis.suspiciousReasons) &&
    typeof parsedAnalysis.recommendedAction === "string" &&
    parsedAnalysis.recommendedAction.trim();

  return !hasRequiredCore;
}

async function runQuickAiBaseline(fallbackPayload) {
  const model = getQuickAiModel();

  if (!isQuickAiEnabled()) {
    console.info("[api/analyze] quick_ai_failed", {
      model,
      reason: "quick_ai_disabled",
    });
    return null;
  }

  const quickPromptPayload = buildQuickFallbackPromptWithMetrics({
    heuristic: fallbackPayload.heuristic,
    claim: fallbackPayload.claim,
    sourceDomain: fallbackPayload.sourceDomain,
    urlInfo: fallbackPayload.urlInfo,
    domainAnalysis: fallbackPayload.domainAnalysis,
    retrieval: fallbackPayload.retrieval,
  });

  console.info("[api/analyze] quick_ai_started", {
    model,
    promptLength: quickPromptPayload.metrics.promptLength,
    claimLength: quickPromptPayload.metrics.claimLength,
    heuristicScore: fallbackPayload.heuristic.score,
    riskLevel: fallbackPayload.heuristic.riskLevel,
  });

  try {
    const { completion, meta } = await createQuickAiCompletion(
      quickPromptPayload.messages
    );
    const content = completion.choices?.[0]?.message?.content;
    const cleanupResult = cleanQuickAiContent(content);
    const parsedAnalysis = parseAiResponse(cleanupResult.cleanedContent);
    const contentLength = typeof content === "string" ? content.trim().length : 0;
    const cleanedContentLength = cleanupResult.cleanedContent.length;

    if (cleanupResult.cleanupApplied) {
      console.info("[api/analyze] quick_ai_cleanup_applied", {
        removedThought: cleanupResult.removedThought,
        originalLength: contentLength,
        cleanedLength: cleanedContentLength,
        contentPreview: getContentPreview(cleanupResult.cleanedContent),
      });
    }

    if (isUnusableQuickAnalysis(cleanupResult.cleanedContent, parsedAnalysis)) {
      console.warn("[api/analyze] quick_ai_unusable", {
        model,
        elapsedMs: meta.elapsedMs,
        contentLength: cleanedContentLength,
        contentPreview: getContentPreview(cleanupResult.cleanedContent),
      });
      return null;
    }

    console.info("[api/analyze] quick_ai_succeeded", {
      model,
      elapsedMs: meta.elapsedMs,
      promptLength: quickPromptPayload.metrics.promptLength,
      heuristicScore: fallbackPayload.heuristic.score,
      riskLevel: fallbackPayload.heuristic.riskLevel,
    });

    return {
      heuristic: fallbackPayload.heuristic,
      analysis: normalizeAnalysis(
        limitSimpleExplanation(parsedAnalysis),
        fallbackPayload.heuristic,
        fallbackPayload.sourceDomain,
        {
          claim: fallbackPayload.claim,
          sourceComparison: fallbackPayload.retrieval?.sourceComparison,
        }
      ),
      aiAvailable: true,
      aiMode: "quick_fallback",
      urlInfo: fallbackPayload.urlInfo,
      article: fallbackPayload.article,
      domainAnalysis: fallbackPayload.domainAnalysis,
      initialDomainAnalysis: fallbackPayload.initialDomainAnalysis,
      finalDomainAnalysis: fallbackPayload.finalDomainAnalysis,
      retrieval: fallbackPayload.retrieval,
      memory: fallbackPayload.memory,
    };
  } catch (error) {
    const meta = error?.quickAiMeta || {};

    console.warn("[api/analyze] quick_ai_failed", {
      model: meta.model || model,
      elapsedMs: meta.elapsedMs,
      reason: "request_failed",
      status: meta.status || getAiErrorStatus(error),
      code: meta.code || "unknown",
      message: error instanceof Error ? error.message : "unknown error",
    });
    return null;
  }
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

  const quickResult = await runQuickAiBaseline(fallbackPayload);

  try {
    const promptPayload = buildAnalysisPromptWithMetrics({
      text,
      heuristic,
      article,
      domainAnalysis,
      claim,
      retrieval,
      memory,
    });

    logPromptAudit(promptPayload.metrics);
    console.info("[api/analyze] primary_ai_started", {
      promptLength: promptPayload.metrics.promptLength,
      claimLength: promptPayload.metrics.claimLength,
      heuristicScore: heuristic.score,
      riskLevel: heuristic.riskLevel,
    });

    const completion = await createCompletionWithFallback(promptPayload.messages);

    const content = completion.choices?.[0]?.message?.content;
    const parsedAnalysis = parseAiResponse(content);

    if (!parsedAnalysis || Object.keys(parsedAnalysis).length === 0) {
      console.warn("[api/analyze] primary_ai_failed", {
        reason: "unparsable_json",
        contentLength: typeof content === "string" ? content.length : 0,
      });

      if (quickResult) {
        console.info("[api/analyze] quick_result_used", {
          reason: "primary_unparsable_json",
          aiMode: quickResult.aiMode,
        });
        return quickResult;
      }

      return buildFallbackResponse({
        ...fallbackPayload,
        reason: "quick_and_primary_unusable",
      });
    }

    console.info("[api/analyze] primary_ai_succeeded", {
      heuristicScore: heuristic.score,
      riskLevel: heuristic.riskLevel,
    });
    console.info("[api/analyze] primary_result_used", {
      quickAvailable: Boolean(quickResult),
    });

    return {
      heuristic,
      analysis: normalizeAnalysis(parsedAnalysis, heuristic, sourceDomain, {
        claim,
        sourceComparison: retrieval?.sourceComparison,
      }),
      aiAvailable: true,
      aiMode: "primary",
      urlInfo,
      article,
      domainAnalysis,
      initialDomainAnalysis,
      finalDomainAnalysis,
      retrieval,
      memory,
    };
  } catch (error) {
    const status = getAiErrorStatus(error);

    console.warn("[api/analyze] primary_ai_failed", {
      status,
      message:
        status === 429
          ? "Quota AI Gemini habis atau terkena rate limit."
          : "AI tidak tersedia. Menggunakan fallback heuristic.",
    });

    if (quickResult) {
      console.info("[api/analyze] quick_result_used", {
        reason: "primary_ai_failed",
        status,
        aiMode: quickResult.aiMode,
      });
      return quickResult;
    }

    return buildFallbackResponse({
      ...fallbackPayload,
      reason: "quick_and_primary_failed",
    });
  }
}
