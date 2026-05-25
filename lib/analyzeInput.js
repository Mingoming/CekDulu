import { analyzeDomain } from "@/lib/analyzeDomain";
import { createCompletionWithFallback } from "@/lib/aiClient";
import { detectUrl } from "@/lib/detectUrl";
import { AI_UNAVAILABLE_MESSAGE, normalizeAnalysis } from "@/lib/fallbackAnalysis";
import { analyzeHeuristics, getRiskLevel } from "@/lib/heuristicAnalyzer";
import { parseAiResponse } from "@/lib/parseAiResponse";
import { buildAnalysisPrompt } from "@/lib/promptBuilder";
import { scrapeArticle } from "@/lib/scrapeArticle";

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
    message: AI_UNAVAILABLE_MESSAGE,
  };
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
  const sourceDomain = article?.domain || domainAnalysis?.domain || "";
  const fallbackPayload = {
    heuristic,
    sourceDomain,
    urlInfo,
    article,
    domainAnalysis,
    initialDomainAnalysis,
    finalDomainAnalysis,
  };

  try {
    const completion = await createCompletionWithFallback(
      buildAnalysisPrompt({
        text,
        heuristic,
        article,
        domainAnalysis,
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
    };
  } catch (error) {
    console.error("[api/analyze] AI unavailable", error);
    return buildFallbackResponse(fallbackPayload);
  }
}
