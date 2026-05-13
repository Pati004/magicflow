import { NextResponse } from "next/server";
import { z }            from "zod";
import { prisma }       from "@/lib/prisma";

const Schema = z.object({
  sessionId:          z.string().min(1),
  cloudinaryUrl:      z.string().url(),
  cloudinaryPublicId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Neveljaven vnos" }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: parsed.data.sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Seja ne obstaja" }, { status: 404 });
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json({ error: "Seja ni aktivna" }, { status: 403 });
    }

    const photo = await prisma.photo.create({
      data: {
        sessionId:          parsed.data.sessionId,
        cloudinaryUrl:      parsed.data.cloudinaryUrl,
        cloudinaryPublicId: parsed.data.cloudinaryPublicId,
        poseAnalysis:       {},
      },
    });

    return NextResponse.json({ success: true, photoId: photo.id });

  } catch (err) {
    console.error("[KIOSK PHOTO]", err);
    return NextResponse.json({ error: "Napaka pri shranjevanju fotografije" }, { status: 500 });
  }
}
