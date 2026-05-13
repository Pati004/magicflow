import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

// ─── GET /api/video-status/[id] ───────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.generatedVideo.findUnique({
      where:  { id: params.id },
      select: {
        id:        true,
        status:    true,
        videoUrl:  true,
        latencyMs: true,
        costUsd:   true,
        createdAt: true,
        updatedAt: true,
        model:     true,
      },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "Video ne obstaja" },
        { status: 404 }
      );
    }

    // Izračunaj elapsed čas
    const elapsedMs = Date.now() - new Date(video.createdAt).getTime();

    return NextResponse.json({
      success:          true,
      generatedVideoId: video.id,
      status:           video.status,
      videoUrl:         video.videoUrl ?? null,
      latencyMs:        video.latencyMs ?? null,
      costUsd:          video.costUsd   ?? null,
      elapsedMs,
      model:            video.model,
    });

  } catch (err) {
    console.error("[VIDEO-STATUS]", err);
    return NextResponse.json(
      { success: false, error: "Napaka pri preverjanju statusa" },
      { status: 500 }
    );
  }
}
