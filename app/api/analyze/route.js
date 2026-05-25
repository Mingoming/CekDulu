import OpenAI from "openai";
import { NextResponse } from "next/server";
import { analyzeHeuristics } from "@/lib/heuristicAnalyzer";
import { buildAnalysisPrompt } from "@/lib/promptBuilder";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const AI_UNAVAILABLE_MESSAGE =
  "Maaf, analisis AI sedang tidak tersedia. Kami tetap menampilkan hasil pemeriksaan dasar.";

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

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
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
    let body;

    try {
      body = await request.json();
    } catch (error) {
      console.error("[api/analyze] invalid json body", error);

      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

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

    try {
      const client = createClient();
      const completion = await client.chat.completions.create({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        messages: buildAnalysisPrompt({ text, heuristic }),
        temperature: 0.2,
      });

      const content = completion.choices?.[0]?.message?.content;
      const parsedAnalysis = extractJson(content);

      if (!parsedAnalysis) {
        console.error("[api/analyze] AI returned unparsable JSON", content);

        return NextResponse.json({
          heuristic,
          analysis: normalizeAnalysis(null, heuristic),
          aiAvailable: false,
          message: AI_UNAVAILABLE_MESSAGE,
        });
      }

      return NextResponse.json({
        heuristic,
        analysis: normalizeAnalysis(parsedAnalysis, heuristic),
        aiAvailable: true,
      });
    } catch (error) {
      console.error("[api/analyze] AI unavailable", error);

      return NextResponse.json({
        heuristic,
        analysis: normalizeAnalysis(null, heuristic),
        aiAvailable: false,
        message: AI_UNAVAILABLE_MESSAGE,
      });
    }
  } catch (error) {
    console.error("[api/analyze]", error);

    return NextResponse.json(
      {
        error: AI_UNAVAILABLE_MESSAGE,
      },
      { status: 500 }
    );
  }
}
