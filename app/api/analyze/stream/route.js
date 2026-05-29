import { getAnalysisJob } from "@/lib/analysisJobStore";

export const runtime = "nodejs";

function buildSseMessage(job) {
  return `data: ${JSON.stringify({
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    status: job.status,
  })}\n\n`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  if (!jobId) {
    return new Response("Job id tidak tersedia.", { status: 400 });
  }

  let intervalId;
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastSnapshot = "";

      function send(job) {
        const snapshot = `${job.status}:${job.stage}:${job.progress}:${job.message}`;
        if (snapshot === lastSnapshot) return;

        lastSnapshot = snapshot;
        controller.enqueue(encoder.encode(buildSseMessage(job)));
      }

      function tick() {
        const job = getAnalysisJob(jobId);

        if (!job) {
          controller.enqueue(
            encoder.encode(
              buildSseMessage({
                status: "failed",
                stage: "failed",
                progress: 100,
                message: "Sesi analisis tidak ditemukan",
              })
            )
          );
          clearInterval(intervalId);
          controller.close();
          return;
        }

        send(job);

        if (job.status === "completed" || job.status === "failed") {
          clearInterval(intervalId);
          controller.close();
        }
      }

      intervalId = setInterval(tick, 500);
      tick();
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
