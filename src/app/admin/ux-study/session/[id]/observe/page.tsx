import { requireAdmin } from "@/lib/auth";
import { prisma }       from "@/lib/prisma";
import { notFound }     from "next/navigation";
import { ObserveClient } from "./ObserveClient";

interface Props { params: { id: string } }

export const metadata = { title: "Moderatorska konzola — Glasno razmišljanje" };

export default async function ObservePage({ params }: Props) {
  await requireAdmin();

  const session = await prisma.observationSession.findUnique({
    where:   { id: params.id },
    include: {
      events:    { orderBy: { timestampMs: "asc" } },
      susSession: { select: { label: true } },
    },
  });

  if (!session) notFound();

  const existingEvents: Array<{
    id:          string;
    type:        "confusion" | "error" | "positive" | "question" | "quote";
    timestampMs: number;
    quote:       string;
    kioskStep:   string;
    theme:       string;
    subtheme:    string;
  }> = session.events.map((e) => ({
    id:          e.id,
    type:        e.type as "confusion" | "error" | "positive" | "question" | "quote",
    timestampMs: e.timestampMs,
    quote:       e.quote ?? "",
    kioskStep:   e.kioskStep ?? "",
    theme:       e.theme ?? "",
    subtheme:    e.subtheme ?? "",
  }));

  return (
    <ObserveClient
      sessionId={session.id}
      participantCode={session.participantCode}
      startedAt={session.startedAt.toISOString()}
      endedAt={session.endedAt?.toISOString() ?? null}
      existingEvents={existingEvents}
      notes={session.notes ?? ""}
    />
  );
}
