import { requireAdmin }    from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { UXDashboardClient } from "./UXDashboardClient";

export const metadata = { title: "Admin — UX Study Dashboard" };

export default async function UXDashboardPage() {
  await requireAdmin();

  const [obsSessions, susSessions] = await Promise.all([
    prisma.observationSession.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        _count:    { select: { events: true } },
        interview: { select: { wouldWatchAgain: true, waitingFeelings: true, videoQuality: true } },
        events:    { select: { type: true, timestampMs: true } },
        susSession: { include: { response: { select: { score: true, grade: true, participantAge: true, techExperience: true } } } },
      },
    }),
    prisma.sUSStudySession.findMany({
      where:   { used: true },
      include: { response: { select: { score: true } } },
    }),
  ]);

  const sessionsData = obsSessions.map((s) => {
    const durationMs = s.endedAt
      ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
      : null;

    return {
      id:              s.id,
      participantCode: s.participantCode,
      startedAt:       s.startedAt.toISOString(),
      durationMs,
      eventCount:      s._count.events,
      confusionCount:  s.events.filter((e) => e.type === "confusion").length,
      errorCount:      s.events.filter((e) => e.type === "error").length,
      positiveCount:   s.events.filter((e) => e.type === "positive").length,
      hasInterview:    !!s.interview,
      wouldWatchAgain: s.interview?.wouldWatchAgain ?? null,
      waitingFeelings: s.interview?.waitingFeelings ?? null,
      videoQuality:    s.interview?.videoQuality ?? null,
      susScore:        s.susSession?.response?.score ?? null,
      susGrade:        s.susSession?.response?.grade ?? null,
      participantAge:  s.susSession?.response?.participantAge ?? null,
      techExperience:  s.susSession?.response?.techExperience ?? null,
    };
  });

  const allSUSScores = susSessions.map((s) => s.response?.score).filter((s): s is number => s !== null && s !== undefined);
  const avgSUS = allSUSScores.length > 0
    ? allSUSScores.reduce((a, b) => a + b, 0) / allSUSScores.length
    : null;

  return (
    <UXDashboardClient
      sessions={sessionsData}
      avgSUS={avgSUS}
      totalSUSResponses={allSUSScores.length}
    />
  );
}
