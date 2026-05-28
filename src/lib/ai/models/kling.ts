// =============================================================
//  MAGICFLOW — Kling AI (Kuaishou) Adapter
//
//  Cenik (ocena):
//  - kling-v1   5s:  ~$0.14 / video
//  - kling-v1   10s: ~$0.28 / video
//  - kling-v1-5 5s:  ~$0.25 / video
//  - kling-v1-5 10s: ~$0.50 / video
//
//  Dokumentacija: https://platform.klingai.com/docs
//  Auth: JWT HS256 iz KLING_ACCESS_KEY + KLING_SECRET_KEY
//        ali Bearer token iz KLING_API_KEY
// =============================================================

import { createHmac } from "crypto";
import type { I2VModel, GenerateParams, GenerateResult, PollResult } from "./base";
import { withRetry } from "./base";

// ─── Tipi ─────────────────────────────────────────────────────

type KlingModel  = "kling-v1" | "kling-v1-5";
type KlingStatus = "submitted" | "processing" | "succeed" | "failed";

// ─── Cenik ────────────────────────────────────────────────────

const COST_TABLE: Record<KlingModel, Record<number, number>> = {
  "kling-v1":   { 5: 0.14, 10: 0.28 },
  "kling-v1-5": { 5: 0.25, 10: 0.50 },
};

// ─── JWT generator (HS256) ────────────────────────────────────

function b64url(data: string): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateJWT(accessKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 }));
  const sig = createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${header}.${payload}.${sig}`;
}

// ─── API helper ───────────────────────────────────────────────

const BASE_URL = "https://api.klingai.com";

async function klingFetch(
  path:    string,
  options: RequestInit,
  token:   string,
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      ...(options.headers ?? {}),
    },
  });
}

// ─── Model razred ─────────────────────────────────────────────

export class KlingAdapter implements I2VModel {
  readonly name = "kling";

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string,
    private readonly variant:   KlingModel = "kling-v1",
  ) {}

  private getToken(): string {
    return generateJWT(this.accessKey, this.secretKey);
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { imageUrl, prompt, duration } = params;
    const clampedDuration = duration >= 8 ? 10 : 5;
    const token = this.getToken();

    const data = await withRetry(async () => {
      const res = await klingFetch(
        "/v1/videos/image2video",
        {
          method: "POST",
          body: JSON.stringify({
            model:         this.variant,
            image:         imageUrl,
            prompt,
            duration:      String(clampedDuration),
            cfg_scale:     0.5,
            mode:          "std",
          }),
        },
        token,
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(err)}`);
      }

      return res.json() as Promise<{ data: { task_id: string } }>;
    }, 3, 1_000, "kling:generate");

    const jobId = data.data.task_id;
    const estimatedCostUsd = COST_TABLE[this.variant][clampedDuration] ?? 0.14;

    return {
      jobId,
      estimatedCostUsd,
      model: `kling:${this.variant}`,
      pollFn: (id) => this.poll(id),
    };
  }

  private async poll(jobId: string): Promise<PollResult> {
    const token = this.getToken();
    const res = await klingFetch(
      `/v1/videos/image2video/${jobId}`,
      { method: "GET" },
      token,
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      data: {
        task_id:     string;
        task_status: KlingStatus;
        task_result?: {
          videos?: Array<{ url: string }>;
        };
        task_status_msg?: string;
      };
    };

    const task   = data.data;
    const statusMap: Record<KlingStatus, PollResult["status"]> = {
      submitted:  "PENDING",
      processing: "PROCESSING",
      succeed:    "SUCCEEDED",
      failed:     "FAILED",
    };

    return {
      status:   statusMap[task.task_status] ?? "PENDING",
      videoUrl: task.task_result?.videos?.[0]?.url ?? null,
      error:    task.task_status_msg ?? null,
      progress: null,
    };
  }
}
