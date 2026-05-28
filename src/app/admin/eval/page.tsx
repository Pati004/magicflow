import Link             from "next/link";
import { requireAdmin }  from "@/lib/auth";
import { prisma }        from "@/lib/prisma";
import { EvalConsole }   from "./EvalConsole";
import { GitCompare }   from "lucide-react";

export const metadata = { title: "Admin — Evalvacija modelov" };

export default async function EvalPage() {
  await requireAdmin();

  // Pridobi razpoložljive fotografije za testiranje
  const photos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id:            true,
      cloudinaryUrl: true,
      createdAt:     true,
      session:       { select: { project: { select: { naziv: true } } } },
    },
  });

  // Pridobi obstoječe eval seje
  const sessions = await prisma.evalSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count:  { select: { results: true } },
      results: { select: { status: true, costUsd: true } },
    },
  });

  const sessionsData = sessions.map((s) => ({
    id:          s.id,
    testSetName: s.testSetName,
    notes:       s.notes,
    createdAt:   s.createdAt.toISOString(),
    total:       s._count.results,
    done:        s.results.filter((r) => r.status === "DONE").length,
    error:       s.results.filter((r) => r.status === "ERROR").length,
    pending:     s.results.filter((r) => r.status === "PENDING" || r.status === "PROCESSING").length,
    totalCost:   s.results.reduce((sum, r) => r.costUsd ? sum + Number(r.costUsd) : sum, 0),
  }));

  const photosData = photos.map((p) => ({
    id:            p.id,
    cloudinaryUrl: p.cloudinaryUrl,
    createdAt:     p.createdAt.toISOString(),
    projectNaziv:  p.session.project.naziv,
  }));

  return (
    <div>
      {/* Sub-navigacija */}
      <div className="border-b border-ink-ghost px-8 flex gap-6 bg-background-surface">
        <Link href="/admin/eval" className="py-3 text-sm font-medium text-gold border-b-2 border-gold">Primerjava modelov (RV1)</Link>
        <Link href="/admin/eval/prompt-comparison" className="py-3 text-sm font-medium text-ink-muted hover:text-ink flex items-center gap-1.5">
          <GitCompare className="h-3.5 w-3.5" />Primerjava promptov (T2)
        </Link>
      </div>
      <EvalConsole
        initialSessions={sessionsData}
        availablePhotos={photosData}
      />
    </div>
  );
}
