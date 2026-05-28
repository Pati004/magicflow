import { NextResponse }    from "next/server";
import { z }              from "zod";
import { prisma }         from "@/lib/prisma";
import { requireAdmin }   from "@/lib/auth";
import { createSUSToken, createBatchTokens } from "@/lib/ux/sus-token";

const CreateSchema = z.object({
  label:   z.string().min(1).max(100),
  count:   z.number().int().min(1).max(200),
  ttlDays: z.number().int().min(1).max(90).default(14),
});

// ─── GET — seznam sej + CSV link za linke ────────────────────

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);

    const sessions = await prisma.sUSStudySession.findMany({
      orderBy: { createdAt: "desc" },
      include: { response: { select: { score: true, grade: true } } },
    });

    // CSV izvoz z linki
    if (searchParams.get("format") === "csv") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const rows = sessions.map((s) => ({
        sessionId: s.id,
        label:     s.label,
        used:      s.used,
        link:      `${baseUrl}/ux-study/sus/${s.token}`,
        score:     s.response?.score ?? "",
        grade:     s.response?.grade ?? "",
        expiresAt: s.expiresAt.toISOString(),
      }));

      const csv = [
        "session_id,label,used,link,score,grade,expires_at",
        ...rows.map((r) => [r.sessionId, r.label, r.used, r.link, r.score, r.grade, r.expiresAt].join(",")),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sus_links.csv"`,
        },
      });
    }

    return NextResponse.json({
      success:  true,
      sessions: sessions.map((s) => ({
        id:        s.id,
        label:     s.label,
        used:      s.used,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        score:     s.response?.score ?? null,
        grade:     s.response?.grade ?? null,
      })),
    });
  } catch (err) {
    console.error("[SUS-SESSIONS GET]", err);
    return NextResponse.json({ success: false, error: "Napaka" }, { status: 500 });
  }
}

// ─── POST — ustvari batch sej in vrni linke ──────────────────

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body   = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const { label, count, ttlDays } = parsed.data;
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    // Ustvari N sej vzporedno
    const sessions = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const sessionData = await prisma.sUSStudySession.create({
          data: {
            label:     count > 1 ? `${label} #${i + 1}` : label,
            token:     "placeholder", // začasno
            expiresAt,
          },
        });

        // Generiraj JWT z dejanskim session ID
        const token = createSUSToken(sessionData.id, ttlDays);

        return prisma.sUSStudySession.update({
          where: { id: sessionData.id },
          data:  { token },
        });
      }),
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const links = createBatchTokens(
      sessions.map((s) => ({ id: s.id, label: s.label })),
      baseUrl,
      ttlDays,
    );

    return NextResponse.json({ success: true, count: sessions.length, links });
  } catch (err) {
    console.error("[SUS-SESSIONS POST]", err);
    return NextResponse.json({ success: false, error: "Napaka pri ustvarjanju sej" }, { status: 500 });
  }
}
