import { NextResponse }  from "next/server";
import { z }            from "zod";
import { prisma }       from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// ─── Schemas ──────────────────────────────────────────────────

const CreateSessionSchema = z.object({
  participantCode: z.string().min(1).max(20),
  susSessionId:    z.string().optional(),
});

const SaveEventsSchema = z.object({
  sessionId: z.string().min(1),
  events: z.array(z.object({
    type:        z.enum(["confusion", "error", "positive", "question", "quote"]),
    timestampMs: z.number().int().min(0),
    quote:       z.string().max(2000).optional(),
    kioskStep:   z.string().optional(),
    theme:       z.string().optional(),
    subtheme:    z.string().optional(),
  })),
  endedAt: z.string().datetime().optional(),
  notes:   z.string().max(5000).optional(),
});

// ─── GET — seznam opazovalnih sej ────────────────────────────

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);

    // Izvoz za Atlas.ti
    if (searchParams.get("format") === "atlas") {
      const { exportForAtlas } = await import("@/lib/ux/thematic-analysis");
      const data = await exportForAtlas();
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type":        "application/json",
          "Content-Disposition": `attachment; filename="atlas_export_${Date.now()}.json"`,
        },
      });
    }

    if (searchParams.get("format") === "quotes-csv") {
      const { exportQuotesCSV } = await import("@/lib/ux/thematic-analysis");
      const csv = await exportQuotesCSV();
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="quotes_${Date.now()}.csv"`,
        },
      });
    }

    if (searchParams.get("format") === "regression-csv") {
      const { exportRegressionCSV } = await import("@/lib/ux/thematic-analysis");
      const csv = await exportRegressionCSV();
      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="regression_${Date.now()}.csv"`,
        },
      });
    }

    const sessions = await prisma.observationSession.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        _count:    { select: { events: true } },
        interview: { select: { id: true } },
        susSession: { include: { response: { select: { score: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s) => ({
        id:             s.id,
        participantCode: s.participantCode,
        startedAt:      s.startedAt,
        endedAt:        s.endedAt,
        eventCount:     s._count.events,
        hasInterview:   !!s.interview,
        susScore:       s.susSession?.response?.score ?? null,
        notes:          s.notes,
      })),
    });
  } catch (err) {
    console.error("[OBS GET]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── POST — ustvari novo opazovalno sejo ─────────────────────

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body   = await request.json();
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { participantCode, susSessionId } = parsed.data;

    const session = await prisma.observationSession.create({
      data: {
        participantCode,
        susSessionId: susSessionId ?? null,
      },
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (err) {
    console.error("[OBS POST]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── PUT — shrani batch opazk za sejo ────────────────────────

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body   = await request.json();
    const parsed = SaveEventsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { sessionId, events, endedAt, notes } = parsed.data;

    // Transakcija: dodaj evente + opcijsko zaključi sejo
    await prisma.$transaction([
      ...events.map((e) =>
        prisma.observationEvent.create({
          data: {
            observationSessionId: sessionId,
            type:        e.type,
            timestampMs: e.timestampMs,
            quote:       e.quote ?? null,
            kioskStep:   e.kioskStep ?? null,
            theme:       e.theme ?? null,
            subtheme:    e.subtheme ?? null,
          },
        }),
      ),
      ...(endedAt || notes
        ? [prisma.observationSession.update({
            where: { id: sessionId },
            data: {
              ...(endedAt && { endedAt: new Date(endedAt) }),
              ...(notes  && { notes }),
            },
          })]
        : []),
    ]);

    return NextResponse.json({ success: true, saved: events.length });
  } catch (err) {
    console.error("[OBS PUT]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}
