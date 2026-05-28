// =============================================================
//  MAGICFLOW — Runway ML Gen-3 Adapter
//
//  Cenik (Gen-3 Alpha Turbo):
//  - gen3a_turbo 5s:  $0.25 / video
//  - gen3a_turbo 10s: $0.50 / video
//  - gen3a        5s:  $0.50 / video
//  - gen3a       10s:  $1.00 / video
//
//  Dokumentacija: https://docs.runwayml.com/docs/image-to-video
// =============================================================

import type { I2VModel, GenerateParams, GenerateResult, PollResult } from "./base";
import { withRetry } from "./base";

// ─── Tipi ─────────────────────────────────────────────────────

type RunwayModel   = "gen3a_turbo" | "gen3a";
type RunwayRatio   = "1280:768" | "768:1280" | "1104:832" | "832:1104";
type RunwayStatus  = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "THROTTLED";

// ─── Cenik ────────────────────────────────────────────────────

const COST_TABLE: Record<RunwayModel, Record<number, number>> = {
  gen3a_turbo: { 5: 0.25, 10: 0.50 },
  gen3a:       { 5: 0.50, 10: 1.00 },
};

// ─── API helper ───────────────────────────────────────────────

async function runwayFetch(
  path:    string,
  options: RequestInit,
  apiKey:  string,
): Promise<Response> {
  return fetch(`https://api.dev.runwayml.com/v1${path}`, {
    ...options,
    headers: {
      "Authorization":    `Bearer ${apiKey}`,
      "Content-Type":     "application/json",
      "X-Runway-Version": "2024-11-06",
      ...(options.headers ?? {}),
    },
  });
}

// ─── Model razred ─────────────────────────────────────────────

export class RunwayAdapter implements I2VModel {
  readonly name = "runway";

  constructor(
    private readonly apiKey:  string,
    private readonly variant: RunwayModel = "gen3a_turbo",
    private readonly ratio:   RunwayRatio = "1280:768",
  ) {}

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { imageUrl, prompt, duration } = params;
    const clampedDuration = duration >= 8 ? 10 : 5;

    const data = await withRetry(async () => {
      const res = await runwayFetch(
        "/image_to_video",
        {
          method: "POST",
          body: JSON.stringify({
            model:       this.variant,
            promptImage: imageUrl,
            promptText:  prompt,
            duration:    clampedDuration,
            ratio:       this.ratio,
          }),
        },
        this.apiKey,
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(err)}`);
      }

      return res.json() as Promise<{ id: string }>;
    }, 3, 1_000, "runway:generate");

    const jobId = data.id;
    const estimatedCostUsd = COST_TABLE[this.variant][clampedDuration] ?? 0.25;

    return {
      jobId,
      estimatedCostUsd,
      model: `runway:${this.variant}`,
      pollFn: (id) => this.poll(id),
    };
  }

  private async poll(jobId: string): Promise<PollResult> {
    const res = await runwayFetch(
      `/tasks/${jobId}`,
      { method: "GET" },
      this.apiKey,
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      id:        string;
      status:    RunwayStatus;
      output?:   string[];
      error?:    string;
      progress?: number;
    };

    const statusMap: Record<RunwayStatus, PollResult["status"]> = {
      PENDING:   "PENDING",
      RUNNING:   "PROCESSING",
      THROTTLED: "PENDING",
      SUCCEEDED: "SUCCEEDED",
      FAILED:    "FAILED",
    };

    return {
      status:   statusMap[data.status] ?? "PENDING",
      videoUrl: data.output?.[0] ?? null,
      error:    data.error    ?? null,
      progress: data.progress ?? null,
    };
  }
}
