import OpenAI from "openai";
import { NextResponse } from "next/server";
import { analyzeHeuristics } from "@/lib/heuristicAnalyzer";
import { buildAnalysisPrompt } from "@/lib/promptBuilder";

export const runtime = "nodejs";

const fallbackAnalysis = {
  summary:
    "Analisis AI belum tersedia, tetapi pola teks tetap sudah diperiksa dengan aturan dasar CekDulu.",
  mainClaim: "Klaim utama belum dapat diringkas otomatis.",
  riskLevel: "Perlu Dicek",
  simpleExplanation:
    "Gunakan skor risiko dan alasan yang terdeteksi sebagai bantuan awal.",
  suspiciousReasons: [],
  recommendedAction:
    "Jangan langsung menyebarkan. Cek sumber resmi, cari pembanding dari media tepercaya, dan tanyakan pada pihak berwenang bila menyangkut kesehatan, uang, atau keselamatan.",
};

function createClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum tersedia di environment server.");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

function extractJson(content) {
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

function normalizeAnalysis(analysis, heuristic) {
  return {
    summary: analysis?.summary || fallbackAnalysis.summary,
    mainClaim: analysis?.mainClaim || fallbackAnalysis.mainClaim,
    riskLevel: heuristic.riskLevel,
    simpleExplanation:
      analysis?.simpleExplanation || fallbackAnalysis.simpleExplanation,
    suspiciousReasons: Array.isArray(analysis?.suspiciousReasons)
      ? analysis.suspiciousReasons
      : heuristic.detectedRules.map((rule) => rule.reason),
    recommendedAction:
      analysis?.recommendedAction || fallbackAnalysis.recommendedAction,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Teks tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (text.length > 6000) {
      return NextResponse.json(
        { error: "Teks terlalu panjang. Batasi maksimal 6000 karakter." },
        { status: 400 }
      );
    }

    const heuristic = analyzeHeuristics(text);
    const client = createClient();

    const completion = await client.chat.completions.create({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      messages: buildAnalysisPrompt({ text, heuristic }),
      temperature: 0.2,
    });

    const content = completion.choices?.[0]?.message?.content;
    const parsedAnalysis = extractJson(content);
    const analysis = normalizeAnalysis(parsedAnalysis, heuristic);

    return NextResponse.json({
      heuristic,
      analysis,
    });
  } catch (error) {
    console.error("[api/analyze]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menganalisis pesan.",
      },
      { status: 500 }
    );
  }
}
