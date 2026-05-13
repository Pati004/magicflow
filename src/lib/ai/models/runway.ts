// =============================================================
//  MAGICFLOW — Runway ML Gen-3 Integration
//
//  Cenik (Gen-3 Alpha Turbo):
//  - gen3a_turbo 5s:  $0.25 / video
//  - gen3a_turbo 10s: $0.50 / video
//  - gen3a        5s:  $0.50 / video
//  - gen3a       10s:  $1.00 / video
// =============================================================

// ─── Tipi ─────────────────────────────────────────────────────

export interface RunwayConfig {
  apiKey:   string;
  model:    "gen3a_turbo" | "gen3a";
  duration: 5 | 10;
  ratio:    "1280:768" | "768:1280" | "1104:832" | "832:1104";
}

export interface RunwayJob {
  taskId:    string;
  status:    "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
}

export interface RunwayJobStatus {
  taskId:    string;
  status:    "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  videoUrl?: string;
  error?:    string;
  progress?: number;
}

export interface RunwayResult {
  videoUrl:  string;
  latencyMs: number;
  costUsd:   number;
  taskId:    string;
}

// ─── Cenik ────────────────────────────────────────────────────

const COST_TABLE: Record<string, Record<number, number>> = {
  gen3a_turbo: { 5: 0.25, 10: 0.50 },
  gen3a:       { 5: 0.50, 10: 1.00 },
};

function calculateCost(model: string, duration: number): number {
  return COST_TABLE[model]?.[duration] ?? 0.25;
}

// ─── API helper ───────────────────────────────────────────────

async function runwayFetch(
  path: string,
  options: RequestInit,
  apiKey: string
): Promise<Response> {
  const res = await fetch(`https://api.dev.runwayml.com/v1${path}`, {
    ...options,
    headers: {
      "Authorization":     `Bearer ${apiKey}`,
      "Content-Type":      "application/json",
      "X-Runway-Version":  "2024-11-06",
      ...(options.headers ?? {}),
    },
  });
  return res;
}

// ─── Zaženi generiranje ───────────────────────────────────────

export async function generateVideo(
  imageUrl: string,
  prompt:   string,
  config:   RunwayConfig
): Promise<RunwayJob> {
  const body = {
    model:       config.model,
    promptImage: imageUrl,
    promptText:  prompt,
    duration:    config.duration,
    ratio:       config.ratio,
  };

  const res = await runwayFetch(
    "/image_to_video",
    { method: "POST", body: JSON.stringify(body) },
    config.apiKey
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Runway API napaka ${res.status}: ${JSON.stringify(err)}`
    );
  }

  const data = await res.json() as { id: string };

  return {
    taskId:    data.id,
    status:    "PENDING",
    createdAt: new Date().toISOString(),
  };
}

// ─── Preveri status ───────────────────────────────────────────

export async function pollJobStatus(
  taskId: string,
  apiKey: string
): Promise<RunwayJobStatus> {
  const res = await runwayFetch(
    `/tasks/${taskId}`,
    { method: "GET" },
    apiKey
  );

  if (!res.ok) {
    throw new Error(`Runway status napaka ${res.status}`);
  }

  const data = await res.json() as {
    id:      string;
    status:  string;
    output?: string[];
    error?:  string;
    progress?: number;
  };

  const statusMap: Record<string, RunwayJobStatus["status"]> = {
    PENDING:    "PENDING",
    RUNNING:    "PROCESSING",
    SUCCEEDED:  "SUCCEEDED",
    FAILED:     "FAILED",
    THROTTLED:  "PENDING",
  };

  return {
    taskId:   data.id,
    status:   statusMap[data.status] ?? "PENDING",
    videoUrl: data.output?.[0],
    error:    data.error,
    progress: data.progress,
  };
}

// ─── Čakaj na dokončanje ──────────────────────────────────────

export async function waitForCompletion(
  taskId:    string,
  apiKey:    string,
  config:    RunwayConfig,
  maxWaitMs: number = 120_000
): Promise<RunwayResult> {
  const startedAt  = Date.now();
  const pollEvery  = 3_000; // 3 sekunde med klici

  while (Date.now() - startedAt < maxWaitMs) {
    const jobStatus = await pollJobStatus(taskId, apiKey);

    if (jobStatus.status === "SUCCEEDED" && jobStatus.videoUrl) {
      const latencyMs = Date.now() - startedAt;
      return {
        videoUrl:  jobStatus.videoUrl,
        latencyMs,
        costUsd:   calculateCost(config.model, config.duration),
        taskId,
      };
    }

    if (jobStatus.status === "FAILED") {
      throw new Error(`Runway generiranje neuspešno: ${jobStatus.error ?? "neznan razlog"}`);
    }

    // Čakaj pred naslednjim klicem
    await new Promise((r) => setTimeout(r, pollEvery));
  }

  throw new Error(`Runway timeout po ${maxWaitMs / 1000}s`);
}
