import { NextResponse } from "next/server";
import { getAnalysisJob } from "@/lib/analysisJobStore";

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  if (!jobId) {
    return NextResponse.json(
      { error: "Job id tidak tersedia." },
      { status: 400 }
    );
  }

  const job = getAnalysisJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        status: "failed",
        result: null,
        error: "Sesi analisis tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    result: job.result,
    error: job.error,
  });
}

