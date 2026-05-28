import { NextResponse }          from "next/server";
import { z }                     from "zod";
import { prisma }                from "@/lib/prisma";
import { getModel, AI_TO_VIDEO_MODEL } from "@/lib/ai/model-factory";
import { waitForCompletion }     from "@/lib/ai/models/base";
import type { AiModelEnum }      from "@/lib/ai/model-factory";

// ─── Validacija ───────────────────────────────────────────────

const RequestSchema = z.object({
  photoId:     z.string().min(1),
  stylePrompt: z.string().min(1).max(500),
  duration:    z.union([z.literal(5), z.literal(10)]).default(5),
  // aiModel se bere iz ProjectConfig — ne iz requesta (varnostna odločitev)
});

// ─── POST /api/generate-video ─────────────────────────────────

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Neveljaven request", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { photoId, stylePrompt, duration } = parsed.data;

    // Preveri fotografijo + pridobi aiModel iz projekta
    const photo = await prisma.photo.findUnique({
      where:   { id: photoId },
      include: {
        session: {
          include: {
            project: {
              include: {
                config: { select: { aiModel: true } },
              },
            },
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ success: false, error: "Fotografija ne obstaja" }, { status: 404 });
    }

    if (photo.session.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Seja ni aktivna" }, { status: 403 });
    }

    const aiModel = (photo.session.project.config?.aiModel ?? "RUNWAY_GEN3") as AiModelEnum;
    const videoModelEnum = AI_TO_VIDEO_MODEL[aiModel] ?? "RUNWAY";

    // Ustvari GeneratedVideo zapis s statusom PENDING
    const generatedVideo = await prisma.generatedVideo.create({
      data: {
        photoId,
        model:  videoModelEnum,
        prompt: stylePrompt,
        status: "PENDING",
      },
    });

    // Zaženi generiranje v ozadju — ne blokira response
    void runGenerationInBackground({
      generatedVideoId: generatedVideo.id,
      imageUrl:         photo.cloudinaryUrl,
      prompt:           stylePrompt,
      duration,
      aiModel,
    });

    return NextResponse.json({
      success:          true,
      generatedVideoId: generatedVideo.id,
      message:          "Generiranje se je pričelo",
      model:            aiModel,
    });

  } catch (err) {
    console.error("[GENERATE-VIDEO]", err);
    return NextResponse.json(
      { success: false, error: "Napaka pri zagonu generiranja" },
      { status: 500 },
    );
  }
}

// ─── Background generiranje ───────────────────────────────────

async function runGenerationInBackground(params: {
  generatedVideoId: string;
  imageUrl:         string;
  prompt:           string;
  duration:         number;
  aiModel:          AiModelEnum;
}) {
  const { generatedVideoId, imageUrl, prompt, duration, aiModel } = params;
  const startedAt = Date.now();

  await prisma.generatedVideo.update({
    where: { id: generatedVideoId },
    data:  { status: "PROCESSING" },
  });

  let model;
  try {
    model = getModel(aiModel);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GENERATE-VIDEO] Model ${aiModel} ni konfiguriran:`, msg);
    await prisma.generatedVideo.update({
      where: { id: generatedVideoId },
      data:  { status: "ERROR" },
    });
    return;
  }

  console.log(`[GENERATE-VIDEO] Začenjam z modelom ${model.name} (${aiModel}) za video ${generatedVideoId}`);

  try {
    // Zaženi generiranje
    const result = await model.generate({ imageUrl, prompt, duration });

    console.log(`[GENERATE-VIDEO] Job ${result.jobId} zagnan (${result.model}), ocena cene: $${result.estimatedCostUsd}`);

    // Polling do dokončanja (max 3 min)
    const completion = await waitForCompletion(
      result.jobId,
      result.pollFn,
      { maxWaitMs: 180_000, pollEveryMs: 4_000, label: model.name },
    );

    const latencyMs = Date.now() - startedAt;
    console.log(`[GENERATE-VIDEO] Uspešno! Latenca: ${latencyMs}ms, cena: $${result.estimatedCostUsd}`);

    await prisma.generatedVideo.update({
      where: { id: generatedVideoId },
      data:  {
        status:    "DONE",
        videoUrl:  completion.videoUrl,
        latencyMs: completion.latencyMs,
        costUsd:   result.estimatedCostUsd,
      },
    });

  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const message   = err instanceof Error ? err.message : "Neznana napaka";
    console.error(`[GENERATE-VIDEO] Napaka po ${latencyMs}ms:`, message);

    await prisma.generatedVideo.update({
      where: { id: generatedVideoId },
      data:  { status: "ERROR" },
    });
  }
}
