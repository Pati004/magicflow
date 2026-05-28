import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const results = await prisma.evalResult.findMany({
      where:  { evalSessionId: params.id },
      select: {
        id:        true,
        model:     true,
        status:    true,
        videoUrl:  true,
        latencyMs: true,
        costUsd:   true,
        _count:    { select: { ratings: true } },
      },
    });

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: "Seja ne obstaja" }, { status: 404 });
    }

    const total      = results.length;
    const done       = results.filter((r) => r.status === "DONE").length;
    const error      = results.filter((r) => r.status === "ERROR").length;
    const processing = results.filter((r) => r.status === "PROCESSING").length;
    const pending    = results.filter((r) => r.status === "PENDING").length;

    // Strošek do sedaj
    const totalCost = results.reduce((sum, r) =>
      r.costUsd ? sum + Number(r.costUsd) : sum, 0);

    // Po modelu
    const byModel: Record<string, { total: number; done: number; error: number }> = {};
    for (const r of results) {
      const entry = byModel[r.model] ?? { total: 0, done: 0, error: 0 };
      entry.total++;
      if (r.status === "DONE")  entry.done++;
      if (r.status === "ERROR") entry.error++;
      byModel[r.model] = entry;
    }

    return NextResponse.json({
      success: true,
      progress: {
        total, done, error, processing, pending,
        pct:       Math.round((done / total) * 100),
        totalCost: parseFloat(totalCost.toFixed(4)),
        byModel,
        complete:  done + error === total,
      },
      results: results.map((r) => ({
        id:           r.id,
        model:        r.model,
        status:       r.status,
        videoUrl:     r.videoUrl,
        latencyMs:    r.latencyMs,
        costUsd:      r.costUsd ? Number(r.costUsd) : null,
        ratingsCount: r._count.ratings,
      })),
    });
  } catch (err) {
    console.error("[EVAL-PROGRESS]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}
