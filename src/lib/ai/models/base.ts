// =============================================================
//  MAGICFLOW — Base I2V Model Interface
// =============================================================

// ─── Skupni parametri za generiranje ─────────────────────────

export interface GenerateParams {
  imageUrl: string;
  prompt:   string;
  duration: number;       // sekunde (tipično 5 ali 10)
  style?:   string;
}

// ─── Rezultat polling klica ───────────────────────────────────

export interface PollResult {
  status:   "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  videoUrl: string | null;
  error:    string | null;
  progress: number | null;
}

// ─── Rezultat začetnega klica generate() ─────────────────────

export interface GenerateResult {
  jobId:            string;
  pollFn:           (jobId: string) => Promise<PollResult>;
  estimatedCostUsd: number;
  model:            string;
}

// ─── Vmesnik ki ga implementira vsak model ────────────────────

export interface I2VModel {
  readonly name: string;
  generate(params: GenerateParams): Promise<GenerateResult>;
}

// ─── Retry pomočnik z eksponentnim backoff-om ─────────────────

export async function withRetry<T>(
  fn:          () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1_000,
  label:       string = "operation",
): Promise<T> {
  let lastError: Error = new Error("No attempts made");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // 4xx napake — ne ponavljaj (napaka klienta)
      if (lastError.message.includes("HTTP 4")) {
        throw lastError;
      }

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.warn(`[${label}] Poskus ${attempt}/${maxAttempts} neuspešen — čakam ${delay}ms`, lastError.message);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`[${label}] Vsi ${maxAttempts} poskusi so bili neuspešni: ${lastError.message}`);
}

// ─── Generični polling loop ───────────────────────────────────

export interface WaitOptions {
  maxWaitMs:  number;
  pollEveryMs: number;
  label:      string;
}

export interface WaitResult {
  videoUrl:  string;
  latencyMs: number;
}

export async function waitForCompletion(
  jobId:   string,
  pollFn:  (jobId: string) => Promise<PollResult>,
  options: WaitOptions,
): Promise<WaitResult> {
  const { maxWaitMs, pollEveryMs, label } = options;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const result = await withRetry(
      () => pollFn(jobId),
      3,
      500,
      `${label}:poll`,
    );

    if (result.status === "SUCCEEDED" && result.videoUrl) {
      return { videoUrl: result.videoUrl, latencyMs: Date.now() - startedAt };
    }

    if (result.status === "FAILED") {
      throw new Error(`${label} generiranje neuspešno: ${result.error ?? "neznan razlog"}`);
    }

    await new Promise((r) => setTimeout(r, pollEveryMs));
  }

  throw new Error(`${label} timeout po ${maxWaitMs / 1_000}s`);
}
