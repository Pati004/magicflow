import { NextResponse } from "next/server";
import { z }            from "zod";
import { prisma }       from "@/lib/prisma";
import { generateVideo, waitForCompletion } from "@/lib/ai/models/runway";
import type { RunwayConfig } from "@/lib/ai/models/runway";

// ─── Validacija ───────────────────────────────────────────────

const RequestSchema = z.object({
  photoId:     z.string().min(1),
  stylePrompt: z.string().min(1).max(500),
  model:       z.enum(["gen3a_turbo", "gen3a"]).default("gen3a_turbo"),
  duration:    z.union([z.literal(5), z.literal(10)]).default(5),
});

// ─── POST /api/generate-video ─────────────────────────────────

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Neveljaven request", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { photoId, stylePrompt, model, duration } = parsed.data;

    // Preveri da fotografija obstaja
    const photo = await prisma.photo.findUnique({
      where:   { id: photoId },
      include: { session: true },
    });

    if (!photo) {
      return NextResponse.json({ success: false, error: "Fotografija ne obstaja" }, { status: 404 });
    }

    if (photo.session.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Seja ni aktivna" }, { status: 403 });
    }

    // Ustvari GeneratedVideo zapis s statusom PENDING
    const generatedVideo = await prisma.generatedVideo.create({
      data: {
        photoId,
        model:   "RUNWAY",
        prompt:  stylePrompt,
        status:  "PENDING",
      },
    });

    // Zaženi generiranje v ozadju — ne blokira response
    runGenerationInBackground({
      generatedVideoId: generatedVideo.id,
      imageUrl:         photo.cloudinaryUrl,
      prompt:           stylePrompt,
      model,
      duration,
    });

    // Takoj vrni ID — klient začne polling
    return NextResponse.json({
      success:          true,
      generatedVideoId: generatedVideo.id,
      message:          "Generiranje se je pričelo",
    });

  } catch (err) {
    console.error("[GENERATE-VIDEO]", err);
    return NextResponse.json(
      { success: false, error: "Napaka pri zagonu generiranja" },
      { status: 500 }
    );
  }
}

// ─── Background generiranje ───────────────────────────────────

async function runGenerationInBackground(params: {
  generatedVideoId: string;
  imageUrl:         string;
  prompt:           string;
  model:            "gen3a_turbo" | "gen3a";
  duration:         5 | 10;
}) {
  const { generatedVideoId, imageUrl, prompt, model, duration } = params;

  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    await prisma.generatedVideo.update({
      where: { id: generatedVideoId },
      data:  { status: "ERROR" },
    });
    return;
  }

  const config: RunwayConfig = {
    apiKey,
    model,
    duration,
    ratio: "1280:768",
  };

  // Posodobi na PROCESSING
  await prisma.generatedVideo.update({
    where: { id: generatedVideoId },
    data:  { status: "PROCESSING" },
  });

  try {
    // Zaženi Runway job
    const job = await generateVideo(imageUrl, prompt, config);

    // Čakaj na dokončanje (max 120s)
    const result = await waitForCompletion(job.taskId, apiKey, config, 120_000);

    // Shrani rezultat
    await prisma.generatedVideo.update({
      where: { id: generatedVideoId },
      data: {
        status:    "DONE",
        videoUrl:  result.videoUrl,
        latencyMs: result.latencyMs,
        costUsd:   result.costUsd,
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznana napaka";
    console.error("[BACKGROUND GENERATION]", message);

    await prisma.generatedVideo.update({
      where: { id: generatedVideoId },
      data:  { status: "ERROR" },
    });
  }
}
