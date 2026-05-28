import Link                from "next/link";
import { requireAdmin }    from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { ComparisonConsole } from "./ComparisonConsole";
import { FlaskConical, GitCompare } from "lucide-react";

export const metadata = { title: "Admin — Primerjava promptov (T2)" };

export default async function PromptComparisonPage() {
  await requireAdmin();

  const [photos, comparisons] = await Promise.all([
    prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id:            true,
        cloudinaryUrl: true,
        createdAt:     true,
        session: { select: { project: { select: { naziv: true } } } },
      },
    }),
    prisma.promptComparison.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { pairs: true } },
        pairs:  { select: { contextualStatus: true, genericStatus: true, ratings: { select: { id: true } } } },
      },
    }),
  ]);

  const comparisonsData = comparisons.map((c) => ({
    id:             c.id,
    name:           c.name,
    model:          c.model,
    notes:          c.notes,
    createdAt:      c.createdAt.toISOString(),
    totalPairs:     c._count.pairs,
    contextualDone: c.pairs.filter((p) => p.contextualStatus === "DONE").length,
    genericDone:    c.pairs.filter((p) => p.genericStatus    === "DONE").length,
    totalRatings:   c.pairs.reduce((sum, p) => sum + p.ratings.length, 0),
  }));

  const photosData = photos.map((p) => ({
    id:            p.id,
    cloudinaryUrl: p.cloudinaryUrl,
    projectNaziv:  p.session.project.naziv,
  }));

  return (
    <div>
      <div className="border-b border-ink-ghost px-8 flex gap-6 bg-background-surface">
        <Link href="/admin/eval" className="py-3 text-sm font-medium text-ink-muted hover:text-ink flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />Primerjava modelov (RV1)
        </Link>
        <Link href="/admin/eval/prompt-comparison" className="py-3 text-sm font-medium text-gold border-b-2 border-gold flex items-center gap-1.5">
          <GitCompare className="h-3.5 w-3.5" />Primerjava promptov (T2)
        </Link>
      </div>
      <ComparisonConsole initialComparisons={comparisonsData} availablePhotos={photosData} />
    </div>
  );
}
