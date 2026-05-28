// =============================================================
//  MAGICFLOW — Primerjava kontekstualnih vs. generičnih promptov
//  Evalvacijski protokol T2
// =============================================================

import { prisma }              from "@/lib/prisma";
import { analyzePose }         from "@/lib/ai/pose-analysis";
import { getModel }            from "@/lib/ai/model-factory";
import { waitForCompletion }   from "@/lib/ai/models/base";
import type { AiModelEnum }    from "@/lib/ai/model-factory";
export { GENERIC_PROMPTS }     from "@/lib/eval/generic-prompts";
export type { GenericPromptId } from "@/lib/eval/generic-prompts";
import { GENERIC_PROMPTS }     from "@/lib/eval/generic-prompts";

// ─── Generiraj 5 kontekstualnih promptov iz GPT-4o analize ───

export async function generateContextualPrompts(photoId: string): Promise<string[]> {
  const photo = await prisma.photo.findUnique({
    where:  { id: photoId },
    select: { cloudinaryUrl: true, poseAnalysis: true },
  });

  if (!photo) throw new Error(`Fotografija ${photoId} ne obstaja`);

  // Preveri če imamo shranjeno analizo poze
  const storedAnalysis = photo.poseAnalysis as Record<string, unknown>;
  const hasStyles = Array.isArray(storedAnalysis?.styles) && (storedAnalysis.styles as unknown[]).length > 0;

  if (hasStyles) {
    const styles = storedAnalysis.styles as Array<{ prompt: string }>;
    return styles.slice(0, 5).map((s) => s.prompt);
  }

  // Pokliči GPT-4o za svežo analizo
  const analysis = await analyzePose(photo.cloudinaryUrl);

  // Shrani analizo v DB za nadaljnje klice
  await prisma.photo.update({
    where: { id: photoId },
    data:  {
      poseAnalysis: JSON.parse(JSON.stringify({
        poseDescription: analysis.poseDescription,
        mood:            analysis.mood,
        styles:          analysis.styles,
        analyzedAt:      analysis.analyzedAt,
        model:           analysis.model,
      })) as object,
    },
  });

  return analysis.styles.slice(0, 5).map((s) => s.prompt);
}

// ─── Ustvari en par (kontekstualni vs. generični) ─────────────

export async function runPairedComparison(
  pairId:    string,
  imageUrl:  string,
  aiModel:   AiModelEnum,
  duration:  number = 5,
): Promise<void> {
  const pair = await prisma.comparisonPair.findUnique({
    where: { id: pairId },
  });
  if (!pair) throw new Error(`ComparisonPair ${pairId} ne obstaja`);

  const modelInstance = getModel(aiModel);

  // Generiraj oba videa vzporedno
  await Promise.allSettled([
    generateOneVideo({
      pairId,
      imageUrl,
      prompt:  pair.contextualPrompt,
      type:    "contextual",
      model:   modelInstance,
      duration,
    }),
    generateOneVideo({
      pairId,
      imageUrl,
      prompt:  pair.genericPrompt,
      type:    "generic",
      model:   modelInstance,
      duration,
    }),
  ]);
}

// ─── Background generiranje enega videa ──────────────────────

async function generateOneVideo(params: {
  pairId:   string;
  imageUrl: string;
  prompt:   string;
  type:     "contextual" | "generic";
  model:    ReturnType<typeof getModel>;
  duration: number;
}): Promise<void> {
  const { pairId, imageUrl, prompt, type, model, duration } = params;
  const startedAt = Date.now();

  const statusField = type === "contextual" ? "contextualStatus"  : "genericStatus";
  const urlField    = type === "contextual" ? "contextualVideoUrl" : "genericVideoUrl";
  const latField    = type === "contextual" ? "contextualLatencyMs" : "genericLatencyMs";
  const costField   = type === "contextual" ? "contextualCostUsd"  : "genericCostUsd";

  try {
    const genResult = await model.generate({ imageUrl, prompt, duration });
    const completion = await waitForCompletion(genResult.jobId, genResult.pollFn, {
      maxWaitMs:   180_000,
      pollEveryMs: 4_000,
      label:       `${type}:${model.name}`,
    });

    await prisma.comparisonPair.update({
      where: { id: pairId },
      data: {
        [statusField]: "DONE",
        [urlField]:    completion.videoUrl,
        [latField]:    completion.latencyMs,
        [costField]:   genResult.estimatedCostUsd,
        updatedAt:     new Date(),
      },
    });

    console.log(`[T2] ${type} ${model.name} ✓ ${Date.now() - startedAt}ms`);
  } catch (err) {
    console.error(`[T2] ${type} napaka:`, err instanceof Error ? err.message : err);
    await prisma.comparisonPair.update({
      where: { id: pairId },
      data:  { [statusField]: "ERROR", updatedAt: new Date() },
    });
  }
}

// ─── Ustvari batch parov za primerjavo ────────────────────────

export async function createComparisonBatch(params: {
  comparisonId:  string;
  photoIds:      string[];
  aiModel:       AiModelEnum;
  duration?:     number;
  staggerMs?:    number;
}): Promise<void> {
  const { comparisonId, photoIds, aiModel, duration = 5, staggerMs = 1_000 } = params;

  for (let pi = 0; pi < photoIds.length; pi++) {
    const photoId = photoIds[pi]!;

    const photo = await prisma.photo.findUnique({
      where:  { id: photoId },
      select: { cloudinaryUrl: true },
    });
    if (!photo) continue;

    let contextualPrompts: string[];
    try {
      contextualPrompts = await generateContextualPrompts(photoId);
    } catch (err) {
      console.error(`[T2] Analiza poze za ${photoId} neuspešna:`, err);
      continue;
    }

    // Ustvari 5 parov (eden za vsak stil)
    for (let i = 0; i < 5; i++) {
      const generic = GENERIC_PROMPTS[i]!;
      const contextualPrompt = contextualPrompts[i] ?? contextualPrompts[0] ?? "";

      const pair = await prisma.comparisonPair.create({
        data: {
          comparisonId,
          photoId,
          styleIndex:       i,
          contextualPrompt,
          genericPrompt:    generic.prompt,
          genericPromptName: generic.name,
          contextualStatus: "PENDING",
          genericStatus:    "PENDING",
        },
      });

      // Stagger startu
      const delay = (pi * 5 + i) * staggerMs;
      setTimeout(() => {
        void runPairedComparison(pair.id, photo.cloudinaryUrl, aiModel, duration);
      }, delay);
    }
  }
}

// ─── CSV izvoz za R (Wilcoxon Signed-Rank format) ────────────

export async function exportComparisonCSV(comparisonId: string): Promise<string> {
  const pairs = await prisma.comparisonPair.findMany({
    where:   { comparisonId },
    include: { ratings: true, photo: { select: { id: true } } },
  });

  const lines: string[] = [
    "comparison_id,pair_id,photo_id,style_index,generic_prompt_name,rater_id,contextual_fit,generic_fit,preference,contextual_latency_ms,generic_latency_ms,contextual_cost,generic_cost",
  ];

  for (const pair of pairs) {
    for (const r of pair.ratings) {
      lines.push([
        comparisonId,
        pair.id,
        pair.photoId,
        pair.styleIndex,
        pair.genericPromptName,
        r.raterAnonymousId,
        r.contextualFit,
        r.genericFit,
        r.preference,
        pair.contextualLatencyMs ?? "",
        pair.genericLatencyMs    ?? "",
        pair.contextualCostUsd   ? Number(pair.contextualCostUsd) : "",
        pair.genericCostUsd      ? Number(pair.genericCostUsd)    : "",
      ].join(","));
    }
  }

  return lines.join("\n");
}
