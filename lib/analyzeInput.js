import { analyzeDomain } from "@/lib/analyzeDomain";
import { createCompletionWithFallback } from "@/lib/aiClient";
import { detectUrl } from "@/lib/detectUrl";
import { AI_UNAVAILABLE_MESSAGE, normalizeAnalysis } from "@/lib/fallbackAnalysis";
import { analyzeHeuristics, getRiskLevel } from "@/lib/heuristicAnalyzer";
import { parseAiResponse } from "@/lib/parseAiResponse";
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
  urlInfo,
  article,
  domainAnalysis,
  initialDomainAnalysis,
  finalDomainAnalysis,
  retrieval,
}) {
  return {
    heuristic,
    analysis: normalizeAnalysis(null, heuristic, sourceDomain),
    aiAvailable: false,
    urlInfo,
    article,
    domainAnalysis,
    initialDomainAnalysis,
    finalDomainAnalysis,
    retrieval,
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

function shouldUseGrounding({ urlInfo, article, heuristic }) {
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

  return {
    ok: true,
    reason: null,
  };
}

async function buildRetrievalContext({ analysisText, article, heuristic, urlInfo }) {
  try {
    const claim = extractClaim({ text: analysisText, article });
    const searchQuery = generateSearchQuery(claim);
    const groundingDecision = shouldUseGrounding({ urlInfo, article, heuristic });

    if (!groundingDecision.ok) {
      return buildFallbackRetrieval({
        claim,
        query: searchQuery,
        reason: groundingDecision.reason,
        skipReason: groundingDecision.reason,
      });
    }

    const retrievalResult = await retrieveSources(searchQuery);
    const rankedSources = rankSources(retrievalResult.sources);

    return {
      claim,
      query: searchQuery,
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
    return buildFallbackRetrieval();
  }
}

function getAiErrorStatus(error) {
  return error?.status || error?.response?.status || error?.code || "unknown";
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
  const retrieval = await buildRetrievalContext({
    analysisText,
    article,
    heuristic,
    urlInfo,
  });
  const claim = retrieval.claim;
  const sourceDomain = article?.domain || domainAnalysis?.domain || "";
  const fallbackPayload = {
    heuristic,
    sourceDomain,
    urlInfo,
    article,
    domainAnalysis,
    initialDomainAnalysis,
    finalDomainAnalysis,
    retrieval,
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
      })
    );

    const content = completion.choices?.[0]?.message?.content;
    const parsedAnalysis = parseAiResponse(content);

    if (!parsedAnalysis) {
      console.error("[api/analyze] AI returned unparsable JSON", content);
      return buildFallbackResponse(fallbackPayload);
    }

    return {
      heuristic,
      analysis: normalizeAnalysis(parsedAnalysis, heuristic, sourceDomain),
      aiAvailable: true,
      urlInfo,
      article,
      domainAnalysis,
      initialDomainAnalysis,
      finalDomainAnalysis,
      retrieval,
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
