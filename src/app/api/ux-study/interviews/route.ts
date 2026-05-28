import { NextResponse }  from "next/server";
import { z }            from "zod";
import { prisma }       from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const Schema = z.object({
  observationSessionId: z.string().min(1),
  waitingFeelings:      z.number().int().min(1).max(7).optional(),
  waitingDuration:      z.number().int().min(1).max(7).optional(),
  waitingNotes:         z.string().max(2000).optional(),
  videoDescription:     z.string().max(2000).optional(),
  wouldWatchAgain:      z.number().int().min(1).max(7).optional(),
  videoQuality:         z.number().int().min(1).max(7).optional(),
  videoNotes:           z.string().max(2000).optional(),
  preferredStyle:       z.string().max(100).optional(),
  wantsMoreOptions:     z.number().int().min(1).max(7).optional(),
  styleNotes:           z.string().max(2000).optional(),
  // T4 — regresija
  overallSatisfaction:  z.number().int().min(1).max(7).optional(),
  interfaceRating:      z.number().int().min(1).max(7).optional(),
  totalLatencyMs:       z.number().int().min(0).optional(),
  generalNotes:         z.string().max(5000).optional(),
});

// ─── POST/PUT — shrani (upsert) intervju ─────────────────────

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body   = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { observationSessionId, ...data } = parsed.data;

    const interview = await prisma.interviewResponse.upsert({
      where:  { observationSessionId },
      create: { observationSessionId, ...cleanData(data) },
      update: cleanData(data),
    });

    return NextResponse.json({ success: true, interviewId: interview.id });
  } catch (err) {
    console.error("[INTERVIEW POST]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

function cleanData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v ?? null]),
  );
}
