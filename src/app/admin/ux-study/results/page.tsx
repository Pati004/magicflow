import { requireAdmin }      from "@/lib/auth";
import { prisma }            from "@/lib/prisma";
import { calculateSUSStats } from "@/lib/ux/sus-scoring";
import { UXResultsClient }   from "./UXResultsClient";

export const metadata = { title: "Admin — SUS Rezultati (T3)" };

export default async function UXResultsPage() {
  await requireAdmin();

  const responses = await prisma.sUSResponse.findMany({
    orderBy: { createdAt: "desc" },
    include: { studySession: { select: { label: true } } },
  });

  const sessions = await prisma.sUSStudySession.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, used: true, expiresAt: true, createdAt: true },
  });

  const scores = responses.map((r) => r.score);
  const stats  = scores.length > 0 ? calculateSUSStats(scores) : null;

  const responsesData = responses.map((r) => ({
    id:             r.id,
    score:          r.score,
    grade:          r.grade,
    participantAge: r.participantAge,
    techExperience: r.techExperience,
    answers:        r.answers as number[],
    sessionLabel:   r.studySession.label,
    createdAt:      r.createdAt.toISOString(),
  }));

  const sessionsData = sessions.map((s) => ({
    id:        s.id,
    label:     s.label,
    used:      s.used,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <UXResultsClient
      responses={responsesData}
      sessions={sessionsData}
      stats={stats}
    />
  );
}
