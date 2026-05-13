import { NextResponse }            from "next/server";
import { z }                        from "zod";
import { prisma }                   from "@/lib/prisma";
import { uploadPhotoFromBase64 }    from "@/lib/cloudinary";

const Schema = z.object({
  base64:    z.string().min(1),
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Neveljaven vnos" }, { status: 400 });
    }

    const { base64, sessionId } = parsed.data;

    // Preveri sejo
    const session = await prisma.session.findUnique({
      where:   { id: sessionId },
      include: { project: true },
    });

    if (!session)                       return NextResponse.json({ error: "Seja ne obstaja" },   { status: 404 });
    if (session.status !== "ACTIVE")    return NextResponse.json({ error: "Seja ni aktivna" },   { status: 403 });

    // Upload na Cloudinary z GDPR expires_at
    const uploaded = await uploadPhotoFromBase64(
      base64,
      sessionId,
      session.project.slug
    );

    // Shrani v bazo
    const photo = await prisma.photo.create({
      data: {
        sessionId:          sessionId,
        cloudinaryUrl:      uploaded.secureUrl,
        cloudinaryPublicId: uploaded.publicId,
        poseAnalysis:       {},
      },
    });

    return NextResponse.json({
      success:      true,
      photoId:      photo.id,
      cloudinaryUrl: uploaded.secureUrl,
    });

  } catch (err) {
    console.error("[UPLOAD-PHOTO]", err);
    return NextResponse.json({ error: "Napaka pri nalaganju fotografije" }, { status: 500 });
  }
}
