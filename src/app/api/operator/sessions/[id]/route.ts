// app/api/operator/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import { auth }         from "@clerk/nextjs/server";
import { prisma }       from "@/lib/prisma";
import { deleteAsset }  from "@/lib/cloudinary";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Pridobi vse Cloudinary assete seje
    const session = await prisma.session.findUnique({
      where:   { id: params.id },
      include: {
        photos: {
          include: { generatedVideos: true },
        },
      },
    });

    if (!session) return NextResponse.json({ error: "Seja ne obstaja" }, { status: 404 });

    // Izbriši Cloudinary assete (GDPR)
    for (const photo of session.photos) {
      try {
        await deleteAsset(photo.cloudinaryPublicId, "image");
      } catch { /* Nadaljuj tudi če Cloudinary delete ne uspe */ }
    }

    // Kaskadno izbriše vse (photos, videos, ratings) — cascade je nastavljen v shemi
    await prisma.session.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[DELETE SESSION]", err);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
