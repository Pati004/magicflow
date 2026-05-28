import { requireAdmin } from "@/lib/auth";
import { prisma }       from "@/lib/prisma";
import { notFound }     from "next/navigation";
import { InterviewClient } from "./InterviewClient";

interface Props { params: { id: string } }

export const metadata = { title: "Pol-strukturiran intervju" };

export default async function InterviewPage({ params }: Props) {
  await requireAdmin();

  const session = await prisma.observationSession.findUnique({
    where:   { id: params.id },
    include: { interview: true },
  });

  if (!session) notFound();

  const existing = session.interview ? {
    waitingFeelings:     session.interview.waitingFeelings,
    waitingDuration:     session.interview.waitingDuration,
    waitingNotes:        session.interview.waitingNotes     ?? "",
    videoDescription:    session.interview.videoDescription ?? "",
    wouldWatchAgain:     session.interview.wouldWatchAgain,
    videoQuality:        session.interview.videoQuality,
    videoNotes:          session.interview.videoNotes       ?? "",
    preferredStyle:      session.interview.preferredStyle   ?? "",
    wantsMoreOptions:    session.interview.wantsMoreOptions,
    styleNotes:          session.interview.styleNotes       ?? "",
    overallSatisfaction: session.interview.overallSatisfaction,
    interfaceRating:     session.interview.interfaceRating,
    totalLatencyMs:      session.interview.totalLatencyMs,
    generalNotes:        session.interview.generalNotes     ?? "",
  } : null;

  return (
    <InterviewClient
      sessionId={session.id}
      participantCode={session.participantCode}
      existing={existing}
    />
  );
}
