import { NextResponse } from "next/server";
import {
  createAnalysisJob,
  updateAnalysisJob,
} from "@/lib/analysisJobStore";
import { analyzeInput } from "@/lib/analyzeInput";
import { AI_UNAVAILABLE_MESSAGE } from "@/lib/fallbackAnalysis";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 6000;
const STAGES = [
  {
    stage: "input_processing",
    progress: 20,
    message: "Membaca input",
  },
  {
    stage: "risk_analysis",
    progress: 40,
    message: "Memeriksa tanda-tanda mencurigakan",
  },
  {
    stage: "retrieval",
    progress: 65,
    message: "Membaca artikel atau tautan",
  },
  {
    stage: "report_generation",
    progress: 85,
    message: "Menyusun hasil analisis",
  },
];

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runAnalysisJob(jobId, text) {
  try {
    for (const stage of STAGES) {
      updateAnalysisJob(jobId, stage);
      await wait(180);
    }

    const result = await analyzeInput(text);

    updateAnalysisJob(jobId, {
      status: "completed",
      stage: "completed",
      progress: 100,
      message: "Analisis selesai",
      result,
      error: null,
    });
  } catch (error) {
    updateAnalysisJob(jobId, {
      status: "failed",
      stage: "failed",
      progress: 100,
      message: "Analisis belum berhasil diselesaikan",
      error: error instanceof Error ? error.message : AI_UNAVAILABLE_MESSAGE,
    });
  }
}

export async function POST(request) {
  try {
    let body;

    try {
      body = await request.json();
    } catch {
      console.error("[api/analyze/start] invalid json body", {
        reason: "json_parse_failed",
      });

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

    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: "Teks terlalu panjang. Batasi maksimal 6000 karakter." },
        { status: 400 }
      );
    }

    const job = createAnalysisJob();

    setTimeout(() => {
      void runAnalysisJob(job.id, text);
    }, 0);

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error("[api/analyze/start]", {
      reason: "unexpected_error",
      message: error instanceof Error ? error.message : "unknown error",
    });

    return NextResponse.json(
      {
        error: AI_UNAVAILABLE_MESSAGE,
      },
      { status: 500 }
    );
  }
}

