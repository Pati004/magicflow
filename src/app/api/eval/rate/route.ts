import { NextResponse } from "next/server";
import { z }            from "zod";
import { prisma }       from "@/lib/prisma";

const RateSchema = z.object({
  evalResultId:     z.string().min(1),
  raterAnonymousId: z.string().min(1).max(64),
  mosQuality:       z.number().int().min(1).max(5),
  mosStyleMatch:    z.number().int().min(1).max(5),
});

// ─── POST /api/eval/rate — shrani oceno ──────────────────────

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = RateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { evalResultId, raterAnonymousId, mosQuality, mosStyleMatch } = parsed.data;

    // Preveri da result obstaja in je DONE
    const result = await prisma.evalResult.findUnique({
      where: { id: evalResultId },
    });
    if (!result) {
      return NextResponse.json({ success: false, error: "Video ne obstaja" }, { status: 404 });
    }
    if (result.status !== "DONE") {
      return NextResponse.json({ success: false, error: "Video še ni generiran" }, { status: 409 });
    }

    // Preveri da isti ocenjevalec ni že ocenil tega videa
    const existing = await prisma.evalRating.findFirst({
      where: { evalResultId, raterAnonymousId },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Že ocenjeno" }, { status: 409 });
    }

    const rating = await prisma.evalRating.create({
      data: { evalResultId, raterAnonymousId, mosQuality, mosStyleMatch },
    });

    return NextResponse.json({ success: true, ratingId: rating.id });

  } catch (err) {
    console.error("[EVAL-RATE]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── GET /api/eval/rate?sessionId=&raterId= — naslednji par ──

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const raterId   = searchParams.get("raterId");

  if (!sessionId || !raterId) {
    return NextResponse.json({ success: false, error: "Manjkajoči parametri" }, { status: 400 });
  }

  try {
    // Vse DONE rezultate za sejo
    const allResults = await prisma.evalResult.findMany({
      where:   { evalSessionId: sessionId, status: "DONE" },
      include: {
        ratings: { where: { raterAnonymousId: raterId } },
      },
    });

    // Filtriraj tiste, ki jih ta ocenjevalec še ni ocenil
    const unrated = allResults.filter((r) => r.ratings.length === 0);

    if (unrated.length < 2) {
      return NextResponse.json({ success: true, done: true, remaining: unrated.length });
    }

    // Grupiraj po photoId — najdi skupino z vsaj 2 neocenjenima videjema
    const byPhoto = new Map<string, typeof unrated>();
    for (const r of unrated) {
      if (!byPhoto.has(r.photoId)) byPhoto.set(r.photoId, []);
      byPhoto.get(r.photoId)!.push(r);
    }

    // Najdi par — najprej iz iste fotografije, potem fallback
    const findPair = (): [string, string, string, string, string, string] | null => {
      for (const group of byPhoto.values()) {
        if (group.length >= 2) {
          const sh = [...group].sort(() => Math.random() - 0.5);
          const a = sh[0]!, b = sh[1]!;
          return [a.id, a.videoUrl ?? "", a.prompt, b.id, b.videoUrl ?? "", b.prompt];
        }
      }
      const sh = [...unrated].sort(() => Math.random() - 0.5);
      if (sh.length >= 2) {
        const a = sh[0]!, b = sh[1]!;
        return [a.id, a.videoUrl ?? "", a.prompt, b.id, b.videoUrl ?? "", b.prompt];
      }
      return null;
    };

    const pair = findPair();
    if (!pair) return NextResponse.json({ success: true, done: true, remaining: 0 });

    const [idA, urlA, promptA, idB, urlB, promptB] = pair;
    const rawPair = [
      { id: idA, videoUrl: urlA, prompt: promptA },
      { id: idB, videoUrl: urlB, prompt: promptB },
    ].sort(() => Math.random() - 0.5);

    return NextResponse.json({
      success:   true,
      done:      false,
      remaining: unrated.length,
      pair:      rawPair,
    });

  } catch (err) {
    console.error("[EVAL-RATE GET]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}
