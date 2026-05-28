import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ProjectActions } from "@/components/admin/ProjectActions";
import {
  Plus, FolderKanban, Calendar, Building2, Edit2, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Admin — Projekti" };

export default async function AdminProjectsPage() {
  await requireAdmin();

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      config:   { select: { enabledFeatures: true, aiModel: true } },
      _count:   { select: { sessions: true } },
    },
  });

  return (
    <div className="p-8">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Projekti</h1>
          <p className="text-ink-muted text-sm mt-0.5">
            {projects.length} {projects.length === 1 ? "projekt" : "projektov"} skupaj
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button className="bg-gold hover:bg-gold-500 text-black font-medium gap-2">
            <Plus className="h-4 w-4" />
            Nov projekt
          </Button>
        </Link>
      </div>

      {/* ─── Prazno stanje ───────────────────────────────────── */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 rounded-2xl bg-background-surface border border-ink-ghost mb-4">
            <FolderKanban className="h-10 w-10 text-ink-faint" />
          </div>
          <h2 className="text-lg font-medium text-ink mb-2">Še ni projektov</h2>
          <p className="text-ink-muted text-sm mb-6 max-w-xs">
            Ustvari prvi projekt in začni ustvarjati magične izkušnje.
          </p>
          <Link href="/admin/projects/new">
            <Button className="bg-gold hover:bg-gold-500 text-black font-medium gap-2">
              <Plus className="h-4 w-4" />
              Nov projekt
            </Button>
          </Link>
        </div>
      )}

      {/* ─── Grid projektov ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group bg-background-surface border border-ink-ghost rounded-2xl p-5 hover:border-gold/30 hover:shadow-gold-sm transition-all"
          >
            {/* Kartica — header */}
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink truncate group-hover:text-gold transition-colors">
                  {project.naziv}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5 font-mono">
                  /{project.slug}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] border-ink-ghost text-ink-muted ml-2 shrink-0"
              >
                {project._count.sessions} sej
              </Badge>
            </div>

            {/* Naročnik & datum */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <Building2 className="h-3.5 w-3.5" />
                {project.narocnik}
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.createdAt)}
              </div>
            </div>

            {/* Features badges */}
            {project.config?.enabledFeatures && (
              <div className="flex flex-wrap gap-1 mb-4">
                {project.config.enabledFeatures.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-background-elevated text-ink-muted border border-ink-ghost capitalize"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Akcije */}
            <div className="flex items-center gap-2 pt-4 border-t border-ink-ghost">
              <Link href={`/admin/projects/${project.id}`} className="flex-1">
                <Button
                  size="sm"
                  className="w-full bg-gold/10 hover:bg-gold/20 text-gold border-0 gap-1.5 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Uredi
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
              </Link>
              <ProjectActions projectId={project.id} slug={project.slug} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
