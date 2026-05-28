// =============================================================
//  MAGICFLOW — Pika 2.0 Adapter
//
//  Cenik:
//  - pika-2.0 3s:  ~$0.08 / video
//  - pika-2.0 5s:  ~$0.13 / video
//  - pika-2.0 10s: ~$0.26 / video
//
//  Dokumentacija: https://pika.art/api-docs
//  Auth: Bearer PIKA_API_KEY
//  Specifičnosti: seed za reproduktivnost, aspect_ratio
// =============================================================

import type { I2VModel, GenerateParams, GenerateResult, PollResult } from "./base";
import { withRetry } from "./base";

// ─── Tipi ─────────────────────────────────────────────────────

type PikaStatus = "pending" | "processing" | "finished" | "failed";

type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

// ─── Cenik ────────────────────────────────────────────────────

const COST_PER_VIDEO: Record<number, number> = {
  3:  0.08,
  5:  0.13,
  10: 0.26,
};

// ─── API helper ───────────────────────────────────────────────

const BASE_URL = "https://api.pika.art/v2";

async function pikaFetch(
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

export class PikaAdapter implements I2VModel {
  readonly name = "pika";

  constructor(
    private readonly apiKey:      string,
    private readonly aspectRatio: AspectRatio = "16:9",
  ) {}

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { imageUrl, prompt, duration } = params;

    // Pika podpira 3s, 5s, 10s — zaokrožimo na najbližje
    const clampedDuration: 3 | 5 | 10 = duration <= 4 ? 3 : duration <= 7 ? 5 : 10;

    const data = await withRetry(async () => {
      const res = await pikaFetch(
        "/generate",
        {
          method: "POST",
          body: JSON.stringify({
            model:           "pika-2.0",
            image:           imageUrl,
            prompt_text:     prompt,
            negative_prompt: "blur, distortion, artifacts, low quality",
            duration:        clampedDuration,
            aspect_ratio:    this.aspectRatio,
            seed:            Math.floor(Math.random() * 2_147_483_647),
            resolution:      "1080p",
          }),
        },
        this.apiKey,
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(err)}`);
      }

      return res.json() as Promise<{ task_id: string }>;
    }, 3, 1_000, "pika:generate");

    const jobId = data.task_id;
    const estimatedCostUsd = COST_PER_VIDEO[clampedDuration] ?? 0.13;

    return {
      jobId,
      estimatedCostUsd,
      model: "pika:2.0",
      pollFn: (id) => this.poll(id),
    };
  }

  private async poll(jobId: string): Promise<PollResult> {
    const res = await pikaFetch(
      `/tasks/${jobId}`,
      { method: "GET" },
      this.apiKey,
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      task_id:   string;
      status:    PikaStatus;
      progress?: number;
      result?: {
        url?: string;
      };
      error?: string;
    };

    const statusMap: Record<PikaStatus, PollResult["status"]> = {
      pending:    "PENDING",
      processing: "PROCESSING",
      finished:   "SUCCEEDED",
      failed:     "FAILED",
    };

    return {
      status:   statusMap[data.status] ?? "PENDING",
      videoUrl: data.result?.url ?? null,
      error:    data.error       ?? null,
      progress: data.progress    ?? null,
    };
  }
}
