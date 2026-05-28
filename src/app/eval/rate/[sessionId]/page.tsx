import { prisma }       from "@/lib/prisma";
import { notFound }    from "next/navigation";
import { RatingClient } from "./RatingClient";

export const metadata = { title: "Ocenjevanje videov — Magicflow Eval" };

interface Props {
  params: { sessionId: string };
}

export default async function RatingPage({ params }: Props) {
  const session = await prisma.evalSession.findUnique({
    where: { id: params.sessionId },
    include: {
      _count: { select: { results: true } },
      results: {
        where:  { status: "DONE" },
        select: { id: true },
      },
    },
  });

  if (!session) notFound();

  const readyCount = session.results.length;

  return (
    <RatingClient
      sessionId={session.id}
      sessionName={session.testSetName}
      readyCount={readyCount}
    />
  );
}
