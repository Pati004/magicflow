import { NextResponse }       from "next/server";
import { z }                 from "zod";
import { prisma }            from "@/lib/prisma";
import { verifySUSToken }    from "@/lib/ux/sus-token";
import { calculateSUSScore, interpretSUS } from "@/lib/ux/sus-scoring";

const SubmitSchema = z.object({
  token:          z.string().min(10),
  answers:        z.array(z.number().int().min(1).max(5)).length(10),
  participantAge: z.number().int().min(18).max(99).optional(),
  techExperience: z.enum(["nizka", "srednja", "visoka"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { token, answers, participantAge, techExperience } = parsed.data;

    // Preveri JWT
    const verified = verifySUSToken(token);
    if (!verified.ok) {
      const msg = verified.reason === "expired" ? "Povezava je potekla." : "Neveljavna povezava.";
      return NextResponse.json({ success: false, error: msg, reason: verified.reason }, { status: 403 });
    }

    const sessionId = verified.payload.sub;

    // Preveri session v bazi
    const session = await prisma.sUSStudySession.findUnique({
      where:   { id: sessionId },
      include: { response: { select: { id: true } } },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Seja ne obstaja." }, { status: 404 });
    }

    if (session.used || session.response) {
      return NextResponse.json({ success: false, error: "Vprašalnik je bil že izpolnjen.", reason: "already_used" }, { status: 409 });
    }

    // Izračunaj score
    const score  = calculateSUSScore(answers);
    const interp = interpretSUS(score);

    // Shrani in označi sejo kot used (transakcija)
    await prisma.$transaction([
      prisma.sUSResponse.create({
        data: {
          studySessionId: sessionId,
          answers:        answers as number[],
          score,
          grade:          interp.grade,
          participantAge: participantAge ?? null,
          techExperience: techExperience ?? null,
        },
      }),
      prisma.sUSStudySession.update({
        where: { id: sessionId },
        data:  { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      score,
      grade:       interp.grade,
      adjective:   interp.adjective,
      description: interp.description,
    });

  } catch (err) {
    console.error("[SUS-SUBMIT]", err);
    return NextResponse.json({ success: false, error: "Napaka pri shranjevanju." }, { status: 500 });
  }
}
