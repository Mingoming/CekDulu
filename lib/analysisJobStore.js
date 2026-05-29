import crypto from "node:crypto";

const JOB_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

const globalStore = globalThis.__cekDuluAnalysisJobs || {
  jobs: new Map(),
  cleanupInterval: null,
};

globalThis.__cekDuluAnalysisJobs = globalStore;

function now() {
  return Date.now();
}

function cloneJob(job) {
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function cleanupOldJobs() {
  const cutoff = now() - JOB_TTL_MS;

  for (const [jobId, job] of globalStore.jobs.entries()) {
    if (job.createdAt < cutoff) {
      globalStore.jobs.delete(jobId);
    }
  }
}

export function ensureJobCleanupInterval() {
  if (globalStore.cleanupInterval) return;

  globalStore.cleanupInterval = setInterval(cleanupOldJobs, CLEANUP_INTERVAL_MS);

  if (typeof globalStore.cleanupInterval.unref === "function") {
    globalStore.cleanupInterval.unref();
  }
}

export function createAnalysisJob() {
  cleanupOldJobs();
  ensureJobCleanupInterval();

  const createdAt = now();
  const job = {
    id: crypto.randomUUID(),
    status: "running",
    stage: "input_processing",
    progress: 0,
    message: "Menyiapkan analisis",
    result: null,
    error: null,
    createdAt,
    updatedAt: createdAt,
  };

  globalStore.jobs.set(job.id, job);

  console.info("[analysis-job] created", {
    jobId: job.id,
    stage: job.stage,
    progress: job.progress,
  });

  return cloneJob(job);
}

export function getAnalysisJob(jobId) {
  cleanupOldJobs();

  return cloneJob(globalStore.jobs.get(jobId));
}

export function updateAnalysisJob(jobId, update) {
  const job = globalStore.jobs.get(jobId);
  if (!job) return null;

  const previousStage = job.stage;

  Object.assign(job, update, {
    updatedAt: now(),
  });

  if (update.stage && update.stage !== previousStage) {
    console.info("[analysis-job] stage transition", {
      jobId,
      stage: update.stage,
      progress: job.progress,
    });
  }

  if (update.status === "completed") {
    console.info("[analysis-job] completed", {
      jobId,
      progress: job.progress,
    });
  }

  if (update.status === "failed") {
    console.error("[analysis-job] failed", {
      jobId,
      stage: job.stage,
      error: job.error,
    });
  }

  return cloneJob(job);
}

