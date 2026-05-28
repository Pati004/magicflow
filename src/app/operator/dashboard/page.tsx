import { requireOperator } from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { formatDate }      from "@/lib/utils";
import Link                from "next/link";
import {
  FolderKanban, Camera, Video, ExternalLink,
  MonitorPlay, Plus, BarChart3,
} from "lucide-react";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";

export const metadata = { title: "Operator — Moji projekti" };

export default async function OperatorDashboardPage() {
  const user = await requireOperator();

  // Operator vidi samo SVOJE projekte
  const projects = await prisma.project.findMany({
    where:   { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      config: { select: { enabledFeatures: true, branding: true } },
      _count: { select: { sessions: true } },
      sessions: {
        where:   { createdAt: { gte: todayStart() } },
        include: {
          _count: { select: { photos: true } },
          photos: {
            include: {
              generatedVideos: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  // Izračunaj statistike za vsak projekt danes
  const projectsWithStats = projects.map((p) => {
    const todayPhotos = p.sessions.reduce((sum, s) => sum + s._count.photos, 0);
    const todayVideos = p.sessions.reduce((sum, s) =>
      sum + s.photos.reduce((v, ph) => v + ph.generatedVideos.length, 0), 0
    );
    const doneVideos = p.sessions.reduce((sum, s) =>
      sum + s.photos.reduce((v, ph) =>
        v + ph.generatedVideos.filter((g) => g.status === "DONE").length, 0
      ), 0
    );
    const branding = p.config?.branding as Record<string, string> | null;
    return {
      ...p,
      todayPhotos,
      todayVideos,
      successRate: todayVideos > 0 ? Math.round((doneVideos / todayVideos) * 100) : 100,
      primaryColor: branding?.primaryColor ?? "#FFB020",
    };
  });

  const totalSessions = projects.reduce((s, p) => s + p._count.sessions, 0);
  const totalToday    = projectsWithStats.reduce((s, p) => s + p.todayPhotos, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-ink-ghost bg-background-surface/50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink">Pozdravljeni, {user.name.split(" ")[0]}</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {projects.length} {projects.length === 1 ? "projekt" : "projektov"} • {totalSessions} sej skupaj
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-muted bg-background-elevated px-3 py-1.5 rounded-lg border border-ink-ghost">
            <BarChart3 className="h-3.5 w-3.5 text-gold" />
            Danes: {totalToday} fotografij
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Prazno stanje */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="p-4 rounded-2xl bg-background-surface border border-ink-ghost mb-4">
              <FolderKanban className="h-10 w-10 text-ink-faint" />
            </div>
            <h2 className="text-lg font-medium text-ink mb-2">Še nimate projektov</h2>
            <p className="text-ink-muted text-sm max-w-xs">
              Administrator vam bo dodelil projekte. Ko bodo na voljo, se bodo prikazali tukaj.
            </p>
          </div>
        )}

        {/* Projekti grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projectsWithStats.map((project) => (
            <div
              key={project.id}
              className="group bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden hover:border-gold/30 transition-all hover:shadow-gold-sm"
            >
              {/* Barvni top bar */}
              <div className="h-1" style={{ backgroundColor: project.primaryColor }} />

              <div className="p-5">
                {/* Naziv + slug */}
                <div className="mb-4">
                  <h3 className="font-semibold text-ink group-hover:text-gold transition-colors truncate">
                    {project.naziv}
                  </h3>
                  <p className="text-xs text-ink-muted font-mono mt-0.5">/{project.slug}</p>
                </div>

                {/* Statistike danes */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Seje skupaj", value: project._count.sessions, icon: FolderKanban },
                    { label: "Foto danes",  value: project.todayPhotos,      icon: Camera },
                    { label: "Videi danes", value: project.todayVideos,      icon: Video },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-background-elevated rounded-xl p-3 text-center">
                      <Icon className="h-4 w-4 text-ink-faint mx-auto mb-1" />
                      <p className="text-lg font-bold text-ink">{value}</p>
                      <p className="text-[10px] text-ink-muted leading-tight">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                {project.config?.enabledFeatures && project.config.enabledFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.config.enabledFeatures.map((f) => (
                      <Badge key={f} variant="outline" className="text-[10px] border-ink-ghost text-ink-muted capitalize">
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-xs text-ink-faint mb-4">{formatDate(project.createdAt)}</p>

                {/* Akcije */}
                <div className="flex gap-2 border-t border-ink-ghost pt-4">
                  {/* Dashboard */}
                  <Link href={`/operator/${project.slug}`} className="flex-1">
                    <Button size="sm" className="w-full bg-gold/10 hover:bg-gold/20 text-gold border-0 gap-1.5 text-xs">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Dashboard
                    </Button>
                  </Link>

                  {/* Odpri kiosk */}
                  <a href={`/kiosk/${project.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-ink-muted hover:text-gold h-8 px-3 gap-1.5 text-xs border border-ink-ghost">
                      <MonitorPlay className="h-3.5 w-3.5" />
                      Kiosk
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
