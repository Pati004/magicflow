import { NextResponse } from "next/server";
import { z }            from "zod";
import { prisma }       from "@/lib/prisma";

const RateSchema = z.object({
  pairId:          z.string().min(1),
  raterAnonymousId: z.string().min(1).max(64),
  contextualFit:   z.number().int().min(1).max(5),
  genericFit:      z.number().int().min(1).max(5),
  preference:      z.enum(["contextual", "generic", "equal"]),
});

// ─── GET — naslednji neocenjeni par za ocenjevalca ───────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const comparisonId = searchParams.get("comparisonId");
  const raterId      = searchParams.get("raterId");

  if (!comparisonId || !raterId) {
    return NextResponse.json({ success: false, error: "Manjka comparisonId ali raterId" }, { status: 400 });
  }

  try {
    // Vse DONE pare za primerjavo, ki jih rater še ni ocenil
    const pairs = await prisma.comparisonPair.findMany({
      where: {
        comparisonId,
        contextualStatus: "DONE",
        genericStatus:    "DONE",
        ratings:          { none: { raterAnonymousId: raterId } },
      },
      include: {
        photo: { select: { cloudinaryUrl: true } },
      },
    });

    if (pairs.length === 0) {
      return NextResponse.json({ success: true, done: true, remaining: 0 });
    }

    // Naključni par
    const pair = pairs[Math.floor(Math.random() * pairs.length)]!;

    // Naključno razporedi A/B (slepa primerjava)
    const isFlipped = Math.random() > 0.5;

    return NextResponse.json({
      success:   true,
      done:      false,
      remaining: pairs.length,
      pair: {
        id:           pair.id,
        styleIndex:   pair.styleIndex,
        photoUrl:     pair.photo.cloudinaryUrl,
        videoA: {
          url:  isFlipped ? pair.genericVideoUrl    : pair.contextualVideoUrl,
          type: isFlipped ? "generic"               : "contextual",
        },
        videoB: {
          url:  isFlipped ? pair.contextualVideoUrl : pair.genericVideoUrl,
          type: isFlipped ? "contextual"            : "generic",
        },
        // Skriti podatki — razkrijejo se po oceni
        _meta: { isFlipped },
      },
    });
  } catch (err) {
    console.error("[BLIND-COMPARE GET]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── POST — shrani oceno para ─────────────────────────────────

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = RateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { pairId, raterAnonymousId, contextualFit, genericFit, preference } = parsed.data;

    const pair = await prisma.comparisonPair.findUnique({ where: { id: pairId } });
    if (!pair) {
      return NextResponse.json({ success: false, error: "Par ne obstaja" }, { status: 404 });
    }

    // @@unique([pairId, raterAnonymousId]) prepreči dvojno ocenjevanje
    const rating = await prisma.comparisonRating.create({
      data: { pairId, raterAnonymousId, contextualFit, genericFit, preference },
    });

    // Vrni razkritje — kateri je bil A in kateri B
    return NextResponse.json({
      success:   true,
      ratingId:  rating.id,
      reveal: {
        contextualPrompt:  pair.contextualPrompt,
        genericPromptName: pair.genericPromptName,
        genericPrompt:     pair.genericPrompt,
      },
    });
  } catch (err) {
    // Duplicate rating
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ success: false, error: "Že ocenjeno" }, { status: 409 });
    }
    console.error("[BLIND-COMPARE POST]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}
