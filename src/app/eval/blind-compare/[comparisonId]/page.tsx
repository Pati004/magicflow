import { prisma }           from "@/lib/prisma";
import { notFound }        from "next/navigation";
import { BlindCompareClient } from "./BlindCompareClient";

export const metadata = { title: "Slepa primerjava videov — Magicflow T2" };

interface Props { params: { comparisonId: string } }

export default async function BlindComparePage({ params }: Props) {
  const comparison = await prisma.promptComparison.findUnique({
    where: { id: params.comparisonId },
    include: {
      _count: { select: { pairs: true } },
      pairs: {
        where:  { contextualStatus: "DONE", genericStatus: "DONE" },
        select: { id: true },
      },
    },
  });

  if (!comparison) notFound();

  return (
    <BlindCompareClient
      comparisonId={comparison.id}
      comparisonName={comparison.name}
      readyPairs={comparison.pairs.length}
    />
  );
}
