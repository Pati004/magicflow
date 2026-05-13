import { NextResponse } from "next/server";
import { auth }         from "@clerk/nextjs/server";
import { prisma }       from "@/lib/prisma";
import { getTodayStats, getRecentSessions, getPrinterStatus } from "@/lib/operator/stats";

export async function GET(
  _request: Request,
  { params }: { params: { projectSlug: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const project = await prisma.project.findUnique({
      where: { slug: params.projectSlug },
    });
    if (!project) return NextResponse.json({ error: "Projekt ne obstaja" }, { status: 404 });

    const [stats, sessions, printer] = await Promise.all([
      getTodayStats(project.id),
      getRecentSessions(project.id, 10),
      getPrinterStatus(project.id),
    ]);

    return NextResponse.json({
      stats,
      sessions: sessions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      printer,
    });

  } catch (err) {
    console.error("[OPERATOR STATS]", err);
    return NextResponse.json({ error: "Napaka pri nalaganju statistik" }, { status: 500 });
  }
}
