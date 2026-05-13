import { NextResponse }  from "next/server";
import { auth }          from "@clerk/nextjs/server";
import { z }             from "zod";
import { prisma }        from "@/lib/prisma";
import { analyzePose }   from "@/lib/ai/pose-analysis";

// ─── Validacija ───────────────────────────────────────────────

const RequestSchema = z.object({
  photoId: z.string().min(1, "photoId je obvezen"),
});

// ─── POST /api/analyze-pose ───────────────────────────────────

export async function POST(request: Request) {
  try {
    // Avtentikacija — sprejme prijavljene uporabnike ali kiosk klice
    const { userId } = await auth();

    // Parsiranje body
    const body   = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Neveljaven request", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { photoId } = parsed.data;

    // Poišči fotografijo v bazi
    const photo = await prisma.photo.findUnique({
      where:   { id: photoId },
      include: {
        session: {
          include: { project: true },
        },
      },
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, error: "Fotografija ne obstaja" },
        { status: 404 }
      );
    }

    // Preveri ali je seja aktivna
    if (photo.session.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Seja ni aktivna" },
        { status: 403 }
      );
    }

    // Pokliči AI analizo
    const analysis = await analyzePose(photo.cloudinaryUrl);

    // Shrani rezultat v bazo
    await prisma.photo.update({
      where: { id: photoId },
      data:  {
        poseAnalysis: {
          poseDescription: analysis.poseDescription,
          mood:            analysis.mood,
          confidence:      analysis.confidence,
          styles:          analysis.styles,
          analyzedAt:      analysis.analyzedAt,
          model:           analysis.model,
          fallback:        analysis.fallback,
        },
      },
    });

    return NextResponse.json({
      success:  true,
      photoId,
      styles:   analysis.styles,
      mood:     analysis.mood,
      fallback: analysis.fallback,
    });

  } catch (err) {
    console.error("[ANALYZE-POSE]", err);
    return NextResponse.json(
      { success: false, error: "Napaka pri analizi fotografije" },
      { status: 500 }
    );
  }
}
