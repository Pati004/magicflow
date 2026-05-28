import { NextResponse }     from "next/server";
import { z }               from "zod";
import { prisma }          from "@/lib/prisma";
import { requireAdmin }    from "@/lib/auth";
import { getModel } from "@/lib/ai/model-factory";
import { waitForCompletion } from "@/lib/ai/models/base";
import type { AiModelEnum }  from "@/lib/ai/model-factory";

// ─── Validacija ───────────────────────────────────────────────

const CreateSchema = z.object({
  testSetName: z.string().min(1).max(100),
  notes:       z.string().max(2000).optional(),
  photoIds:    z.array(z.string().min(1)).min(1).max(50),
  models:      z.array(z.enum([
    "RUNWAY_GEN3", "KLING_V1", "KLING_V2", "LUMA_DREAM", "PIKA_V2",
  ])).min(1),
  prompts:     z.array(z.string().min(1).max(500)).min(1).max(10),
  duration:    z.number().int().min(3).max(10).default(5),
});

// ─── GET — seznam evalvacijskih sej ──────────────────────────

export async function GET() {
  try {
    await requireAdmin();
    const sessions = await prisma.evalSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { results: true } },
        results: {
          select: { status: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s) => ({
        id:          s.id,
        testSetName: s.testSetName,
        notes:       s.notes,
        createdAt:   s.createdAt,
        total:       s._count.results,
        done:        s.results.filter((r) => r.status === "DONE").length,
        error:       s.results.filter((r) => r.status === "ERROR").length,
        pending:     s.results.filter((r) => r.status === "PENDING" || r.status === "PROCESSING").length,
      })),
    });
  } catch (err) {
    console.error("[EVAL-SESSIONS GET]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── POST — ustvari sejo + zaženi batch generiranje ──────────

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body   = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { testSetName, notes, photoIds, models, prompts, duration } = parsed.data;

    // Preveri da fotografije obstajajo
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, cloudinaryUrl: true },
    });
    if (photos.length !== photoIds.length) {
      return NextResponse.json({ success: false, error: "Nekatere fotografije ne obstajajo" }, { status: 404 });
    }

    // Ustvari evalvacijsko sejo
    const session = await prisma.evalSession.create({
      data: { testSetName, notes: notes ?? null },
    });

    // Ustvari EvalResult za vsako kombinacijo foto × model × prompt
    const combinations: Array<{ photoId: string; cloudinaryUrl: string; model: AiModelEnum; prompt: string }> = [];
    for (const photo of photos) {
      for (const model of models) {
        for (const prompt of prompts) {
          combinations.push({ photoId: photo.id, cloudinaryUrl: photo.cloudinaryUrl, model: model as AiModelEnum, prompt });
        }
      }
    }

    const evalResults = await prisma.$transaction(
      combinations.map((c) =>
        prisma.evalResult.create({
          data: {
            evalSessionId: session.id,
            model:         c.model,
            photoId:       c.photoId,
            prompt:        c.prompt,
            status:        "PENDING",
          },
        }),
      ),
    );

    // Zaženi generiranje v ozadju za vsak result
    for (let i = 0; i < evalResults.length; i++) {
      const r = evalResults[i];
      const c = combinations[i];
      if (!r || !c) continue;
      void runEvalGeneration({
        evalResultId: r.id,
        imageUrl:     c.cloudinaryUrl,
        prompt:       c.prompt,
        aiModel:      c.model,
        duration,
        delayMs:      i * 500,
      });
    }

    return NextResponse.json({
      success:     true,
      sessionId:   session.id,
      totalJobs:   evalResults.length,
      message:     `Ustvarjenih ${evalResults.length} generiranj za sejo "${testSetName}"`,
    });

  } catch (err) {
    console.error("[EVAL-SESSIONS POST]", err);
    return NextResponse.json({ success: false, error: "Napaka pri ustvarjanju seje" }, { status: 500 });
  }
}

// ─── Background generiranje za en EvalResult ─────────────────

async function runEvalGeneration(params: {
  evalResultId: string;
  imageUrl:     string;
  prompt:       string;
  aiModel:      AiModelEnum;
  duration:     number;
  delayMs:      number;
}) {
  const { evalResultId, imageUrl, prompt, aiModel, duration, delayMs } = params;

  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  await prisma.evalResult.update({
    where: { id: evalResultId },
    data:  { status: "PROCESSING", updatedAt: new Date() },
  });

  let modelInstance;
  try {
    modelInstance = getModel(aiModel);
  } catch {
    await prisma.evalResult.update({
      where: { id: evalResultId },
      data:  { status: "ERROR" },
    });
    return;
  }

  const startedAt = Date.now();

  try {
    const genResult = await modelInstance.generate({ imageUrl, prompt, duration });
    const completion = await waitForCompletion(genResult.jobId, genResult.pollFn, {
      maxWaitMs:   180_000,
      pollEveryMs: 4_000,
      label:       `eval:${aiModel}`,
    });

    await prisma.evalResult.update({
      where: { id: evalResultId },
      data: {
        status:    "DONE",
        videoUrl:  completion.videoUrl,
        latencyMs: completion.latencyMs,
        costUsd:   genResult.estimatedCostUsd,
        updatedAt: new Date(),
      },
    });

    console.log(`[EVAL] ${aiModel} job ${genResult.jobId} ✓ ${Date.now() - startedAt}ms`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[EVAL] ${aiModel} napaka:`, msg);
    await prisma.evalResult.update({
      where: { id: evalResultId },
      data:  { status: "ERROR", updatedAt: new Date() },
    });
  }
}
