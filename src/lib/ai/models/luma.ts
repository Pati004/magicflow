// =============================================================
//  MAGICFLOW — Luma Dream Machine Adapter
//
//  Cenik:
//  - luma-dream-machine 5s:  ~$0.25 / video
//  - luma-dream-machine 10s: ~$0.50 / video
//
//  Dokumentacija: https://lumalabs.ai/dream-machine/api/docs
//  Auth: Bearer LUMA_API_KEY
// =============================================================

import type { I2VModel, GenerateParams, GenerateResult, PollResult } from "./base";
import { withRetry } from "./base";

// ─── Tipi ─────────────────────────────────────────────────────

type LumaStatus = "dreaming" | "completed" | "failed";

// ─── Cenik ────────────────────────────────────────────────────

const COST_PER_VIDEO: Record<number, number> = {
  5:  0.25,
  10: 0.50,
};

// ─── API helper ───────────────────────────────────────────────

const BASE_URL = "https://api.lumalabs.ai/dream-machine/v1";

async function lumaFetch(
  path:    string,
  options: RequestInit,
  apiKey:  string,
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// ─── Model razred ─────────────────────────────────────────────

export class LumaAdapter implements I2VModel {
  readonly name = "luma";

  constructor(private readonly apiKey: string) {}

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { imageUrl, prompt, duration } = params;
    const clampedDuration = duration >= 8 ? 10 : 5;

    const data = await withRetry(async () => {
      const res = await lumaFetch(
        "/generations/image-to-video",
        {
          method: "POST",
          body: JSON.stringify({
            prompt,
            duration:    `${clampedDuration}s`,
            aspect_ratio: "16:9",
            keyframes: {
              frame0: {
                type: "image",
                url:  imageUrl,
              },
            },
          }),
        },
        this.apiKey,
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(err)}`);
      }

      return res.json() as Promise<{ id: string }>;
    }, 3, 1_000, "luma:generate");

    const jobId = data.id;
    const estimatedCostUsd = COST_PER_VIDEO[clampedDuration] ?? 0.25;

    return {
      jobId,
      estimatedCostUsd,
      model: "luma:dream-machine",
      pollFn: (id) => this.poll(id),
    };
  }

  private async poll(jobId: string): Promise<PollResult> {
    const res = await lumaFetch(
      `/generations/${jobId}`,
      { method: "GET" },
      this.apiKey,
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      id:        string;
      state:     LumaStatus;
      failure_reason?: string;
      assets?: {
        video?: string;
      };
    };

    const statusMap: Record<LumaStatus, PollResult["status"]> = {
      dreaming:  "PROCESSING",
      completed: "SUCCEEDED",
      failed:    "FAILED",
    };

    return {
      status:   statusMap[data.state] ?? "PENDING",
      videoUrl: data.assets?.video     ?? null,
      error:    data.failure_reason    ?? null,
      progress: null,
    };
  }
}
