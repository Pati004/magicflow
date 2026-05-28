import { NextResponse }           from "next/server";
import { z }                      from "zod";
import { prisma }                 from "@/lib/prisma";
import { requireAdmin }           from "@/lib/auth";
import { createComparisonBatch, exportComparisonCSV } from "@/lib/eval/prompt-comparison";
import { calculateU, wilcoxonSignedRank, analyzePreferences } from "@/lib/eval/mann-whitney";
import type { AiModelEnum }       from "@/lib/ai/model-factory";

const CreateSchema = z.object({
  name:     z.string().min(1).max(100),
  model:    z.enum(["RUNWAY_GEN3", "KLING_V1", "KLING_V2", "LUMA_DREAM", "PIKA_V2"]),
  notes:    z.string().max(2000).optional(),
  photoIds: z.array(z.string().min(1)).min(1).max(20),
  duration: z.number().int().min(3).max(10).default(5),
});

// ─── GET — seznam primerjav ───────────────────────────────────

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const exportId = searchParams.get("export");

    // CSV izvoz
    if (exportId) {
      const csv = await exportComparisonCSV(exportId);
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="comparison_${exportId}.csv"`,
        },
      });
    }

    const comparisons = await prisma.promptComparison.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { pairs: true } },
        pairs:  { select: { contextualStatus: true, genericStatus: true } },
      },
    });

    return NextResponse.json({
      success: true,
      comparisons: comparisons.map((c) => ({
        id:         c.id,
        name:       c.name,
        model:      c.model,
        notes:      c.notes,
        createdAt:  c.createdAt,
        totalPairs: c._count.pairs,
        contextualDone: c.pairs.filter((p) => p.contextualStatus === "DONE").length,
        genericDone:    c.pairs.filter((p) => p.genericStatus    === "DONE").length,
      })),
    });
  } catch (err) {
    console.error("[PROMPT-COMPARISON GET]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── POST — ustvari novo primerjavo ──────────────────────────

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body   = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { name, model, notes, photoIds, duration } = parsed.data;

    const comparison = await prisma.promptComparison.create({
      data: { name, model, notes: notes ?? null },
    });

    // Zaženi batch v ozadju (asinhrono)
    void createComparisonBatch({
      comparisonId: comparison.id,
      photoIds,
      aiModel:      model as AiModelEnum,
      duration,
      staggerMs:    1_200,
    });

    return NextResponse.json({
      success:      true,
      comparisonId: comparison.id,
      message:      `Primerjava "${name}" zagotovljena — generiranje ${photoIds.length * 10} videov`,
    });
  } catch (err) {
    console.error("[PROMPT-COMPARISON POST]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── GET /api/eval/prompt-comparison/[id]/stats ───────────────

export async function getStats(comparisonId: string) {
  const pairs = await prisma.comparisonPair.findMany({
    where:   { comparisonId },
    include: { ratings: true },
  });

  const allRatings = pairs.flatMap((p) => p.ratings);
  const contextualFits = allRatings.map((r) => r.contextualFit);
  const genericFits    = allRatings.map((r) => r.genericFit);
  const preferences    = allRatings.map((r) => r.preference);

  if (allRatings.length < 4) {
    return { error: "Premalo ocen za statistično analizo (min 4)" };
  }

  return {
    n:            allRatings.length,
    mannWhitneyU: contextualFits.length > 1 && genericFits.length > 1
      ? calculateU(contextualFits, genericFits)
      : null,
    wilcoxon:     contextualFits.length === genericFits.length && contextualFits.length > 1
      ? wilcoxonSignedRank(contextualFits, genericFits)
      : null,
    preferences:  analyzePreferences(preferences),
    means: {
      contextual: contextualFits.reduce((a, b) => a + b, 0) / contextualFits.length,
      generic:    genericFits.reduce((a, b) => a + b, 0)    / genericFits.length,
    },
  };
}
