import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { calculateU, wilcoxonSignedRank, analyzePreferences } from "@/lib/eval/mann-whitney";

// ─── GET /api/eval/prompt-comparison/[id] — napredek + statistika ──

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const pairs = await prisma.comparisonPair.findMany({
      where:   { comparisonId: params.id },
      include: { ratings: { select: { contextualFit: true, genericFit: true, preference: true } } },
    });

    if (pairs.length === 0) {
      return NextResponse.json({ success: false, error: "Primerjava ne obstaja" }, { status: 404 });
    }

    const totalPairs = pairs.length;
    const cDone = pairs.filter((p) => p.contextualStatus === "DONE").length;
    const gDone = pairs.filter((p) => p.genericStatus    === "DONE").length;
    const cErr  = pairs.filter((p) => p.contextualStatus === "ERROR").length;
    const gErr  = pairs.filter((p) => p.genericStatus    === "ERROR").length;
    const readyPairs = pairs.filter((p) => p.contextualStatus === "DONE" && p.genericStatus === "DONE").length;
    const complete   = cDone + cErr === totalPairs && gDone + gErr === totalPairs;

    const allRatings      = pairs.flatMap((p) => p.ratings);
    const contextualFits  = allRatings.map((r) => r.contextualFit);
    const genericFits     = allRatings.map((r) => r.genericFit);
    const preferences     = allRatings.map((r) => r.preference);

    const stats = allRatings.length >= 4
      ? {
          n:            allRatings.length,
          mannWhitneyU: calculateU(contextualFits, genericFits),
          wilcoxon:     wilcoxonSignedRank(contextualFits, genericFits),
          preferences:  analyzePreferences(preferences),
          means: {
            contextual: contextualFits.reduce((a, b) => a + b, 0) / (contextualFits.length || 1),
            generic:    genericFits.reduce((a, b) => a + b, 0)    / (genericFits.length    || 1),
          },
        }
      : null;

    // Strošek
    const totalCost = pairs.reduce((sum, p) => {
      return sum + Number(p.contextualCostUsd ?? 0) + Number(p.genericCostUsd ?? 0);
    }, 0);

    return NextResponse.json({
      success: true,
      progress: {
        totalPairs, readyPairs, complete,
        contextual: { done: cDone, error: cErr, pct: Math.round((cDone / totalPairs) * 100) },
        generic:    { done: gDone, error: gErr, pct: Math.round((gDone / totalPairs) * 100) },
        totalCost:  parseFloat(totalCost.toFixed(4)),
        ratingsCount: allRatings.length,
      },
      stats,
      pairs: pairs.map((p) => ({
        id:              p.id,
        styleIndex:      p.styleIndex,
        genericName:     p.genericPromptName,
        contextualUrl:   p.contextualVideoUrl,
        genericUrl:      p.genericVideoUrl,
        contextualReady: p.contextualStatus === "DONE",
        genericReady:    p.genericStatus    === "DONE",
        ratingsCount:    p.ratings.length,
      })),
    });
  } catch (err) {
    console.error("[PROMPT-COMPARISON GET ID]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}
