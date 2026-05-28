// =============================================================
//  MAGICFLOW — Evalvacijski statistični modul
//  Podpira: opisna statistika, ANOVA priprava, poročilo
// =============================================================

import { prisma } from "@/lib/prisma";

// ─── Tipi ─────────────────────────────────────────────────────

export interface ModelStats {
  model:        string;
  n:            number;
  meanQuality:  number;
  stdQuality:   number;
  meanStyle:    number;
  stdStyle:     number;
  meanLatencyMs: number | null;
  meanCostUsd:  number | null;
  ciQuality95:  [number, number];   // 95% interval zaupanja
  ciStyle95:    [number, number];
}

export interface ANOVARow {
  raterAnonymousId: string;
  evalResultId:     string;
  model:            string;
  photoId:          string;
  prompt:           string;
  mosQuality:       number;
  mosStyleMatch:    number;
  isContextual:     boolean;
  latencyMs:        number | null;
  costUsd:          number | null;
}

export interface EvalReport {
  sessionId:   string;
  sessionName: string;
  generatedAt: string;
  summary: {
    totalResults:  number;
    totalRatings:  number;
    uniqueRaters:  number;
    modelsIncluded: string[];
    photosIncluded: number;
  };
  modelStats:  ModelStats[];
  anovaData:   ANOVARow[];
  rawResults:  RawResult[];
}

interface RawResult {
  evalResultId:  string;
  model:         string;
  photoId:       string;
  prompt:        string;
  videoUrl:      string | null;
  status:        string;
  latencyMs:     number | null;
  costUsd:       number | null;
  isContextual:  boolean;
  ratingsCount:  number;
  meanQuality:   number | null;
  meanStyle:     number | null;
}

// ─── Pomočniki ────────────────────────────────────────────────

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[], avg?: number): number {
  if (vals.length < 2) return 0;
  const m = avg ?? mean(vals);
  const variance = vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

function ci95(vals: number[]): [number, number] {
  if (vals.length === 0) return [0, 0];
  const m = mean(vals);
  const s = std(vals, m);
  const t = 1.96; // z za 95% pri velikem n, t za majhne vzorce bi bil večji
  const margin = t * (s / Math.sqrt(vals.length));
  return [
    parseFloat((m - margin).toFixed(3)),
    parseFloat((m + margin).toFixed(3)),
  ];
}

// ─── Glavne funkcije ──────────────────────────────────────────

export async function calculateModelStats(evalSessionId: string): Promise<ModelStats[]> {
  const results = await prisma.evalResult.findMany({
    where:   { evalSessionId, status: "DONE" },
    include: { ratings: true },
  });

  const byModel = new Map<string, {
    quality: number[];
    style:   number[];
    latency: number[];
    cost:    number[];
  }>();

  for (const result of results) {
    if (!byModel.has(result.model)) {
      byModel.set(result.model, { quality: [], style: [], latency: [], cost: [] });
    }
    const entry = byModel.get(result.model)!;

    for (const rating of result.ratings) {
      entry.quality.push(rating.mosQuality);
      entry.style.push(rating.mosStyleMatch);
    }
    if (result.latencyMs) entry.latency.push(result.latencyMs);
    if (result.costUsd)   entry.cost.push(Number(result.costUsd));
  }

  const stats: ModelStats[] = [];

  for (const [model, data] of byModel.entries()) {
    const mq = mean(data.quality);
    const ms = mean(data.style);
    stats.push({
      model,
      n:            data.quality.length,
      meanQuality:  parseFloat(mq.toFixed(3)),
      stdQuality:   parseFloat(std(data.quality, mq).toFixed(3)),
      meanStyle:    parseFloat(ms.toFixed(3)),
      stdStyle:     parseFloat(std(data.style, ms).toFixed(3)),
      meanLatencyMs: data.latency.length > 0 ? Math.round(mean(data.latency)) : null,
      meanCostUsd:   data.cost.length > 0 ? parseFloat(mean(data.cost).toFixed(4)) : null,
      ciQuality95:  ci95(data.quality),
      ciStyle95:    ci95(data.style),
    });
  }

  // Razvrsti po povprečni kakovosti (padajoče)
  return stats.sort((a, b) => b.meanQuality - a.meanQuality);
}

export async function prepareANOVAData(evalSessionId: string): Promise<ANOVARow[]> {
  const ratings = await prisma.evalRating.findMany({
    where:   { evalResult: { evalSessionId } },
    include: {
      evalResult: {
        select: {
          model:       true,
          photoId:     true,
          prompt:      true,
          isContextual: true,
          latencyMs:   true,
          costUsd:     true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ratings.map((r) => ({
    raterAnonymousId: r.raterAnonymousId,
    evalResultId:     r.evalResultId,
    model:            r.evalResult.model,
    photoId:          r.evalResult.photoId,
    prompt:           r.evalResult.prompt,
    mosQuality:       r.mosQuality,
    mosStyleMatch:    r.mosStyleMatch,
    isContextual:     r.evalResult.isContextual,
    latencyMs:        r.evalResult.latencyMs,
    costUsd:          r.evalResult.costUsd ? Number(r.evalResult.costUsd) : null,
  }));
}

export async function generateReport(evalSessionId: string): Promise<EvalReport> {
  const session = await prisma.evalSession.findUnique({
    where:   { id: evalSessionId },
    include: {
      results: {
        include: {
          ratings: true,
          photo:   { select: { id: true } },
        },
      },
    },
  });

  if (!session) throw new Error(`EvalSession ${evalSessionId} ne obstaja`);

  void session.results.filter((r) => r.status === "DONE").length; // used indirectly via rawResults
  const allRatings  = session.results.flatMap((r) => r.ratings);
  const uniqueRaters = new Set(allRatings.map((r) => r.raterAnonymousId)).size;
  const uniquePhotos = new Set(session.results.map((r) => r.photoId)).size;
  const models       = [...new Set(session.results.map((r) => r.model))];

  const rawResults: RawResult[] = session.results.map((r) => {
    const qualities = r.ratings.map((rt) => rt.mosQuality);
    const styles    = r.ratings.map((rt) => rt.mosStyleMatch);
    return {
      evalResultId: r.id,
      model:        r.model,
      photoId:      r.photoId,
      prompt:       r.prompt,
      videoUrl:     r.videoUrl,
      status:       r.status,
      latencyMs:    r.latencyMs,
      costUsd:      r.costUsd ? Number(r.costUsd) : null,
      isContextual: r.isContextual,
      ratingsCount: r.ratings.length,
      meanQuality:  qualities.length > 0 ? parseFloat(mean(qualities).toFixed(3)) : null,
      meanStyle:    styles.length > 0 ? parseFloat(mean(styles).toFixed(3)) : null,
    };
  });

  return {
    sessionId:   session.id,
    sessionName: session.testSetName,
    generatedAt: new Date().toISOString(),
    summary: {
      totalResults:   session.results.length,
      totalRatings:   allRatings.length,
      uniqueRaters,
      modelsIncluded: models,
      photosIncluded: uniquePhotos,
    },
    modelStats:  await calculateModelStats(evalSessionId),
    anovaData:   await prepareANOVAData(evalSessionId),
    rawResults,
  };
}
