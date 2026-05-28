import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { FolderKanban, Film, Camera, Users, ArrowRight, TrendingUp } from "lucide-react";

export const metadata = { title: "Admin — Pregled" };

export default async function AdminPage() {
  await requireAdmin();

  const [projectCount, sessionCount, photoCount, videoCount, recentProjects, userCount] =
    await Promise.all([
      prisma.project.count(),
      prisma.session.count(),
      prisma.photo.count(),
      prisma.generatedVideo.count(),
      prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { sessions: true } } },
      }),
      prisma.user.count(),
    ]);

  const stats = [
    { label: "Projekti",   value: projectCount, icon: FolderKanban, href: "/admin/projects" },
    { label: "Seje",       value: sessionCount,  icon: Users,        href: "/admin/analytics" },
    { label: "Fotografije", value: photoCount,   icon: Camera,       href: "/admin/analytics" },
    { label: "Videi",      value: videoCount,    icon: Film,         href: "/admin/analytics" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Pregled</h1>
        <p className="text-ink-muted text-sm mt-0.5">
          {userCount} {userCount === 1 ? "uporabnik" : "uporabnikov"} · platforma Magicflow
        </p>
      </div>

      {/* ─── Statistika ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-background-surface border border-ink-ghost rounded-2xl p-5 hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-ink-muted tracking-wide uppercase">{label}</span>
              <Icon className="h-4 w-4 text-ink-faint group-hover:text-gold transition-colors" />
            </div>
            <p className="text-3xl font-semibold text-ink">{value}</p>
          </Link>
        ))}
      </div>

      {/* ─── Zadnji projekti ─────────────────────────────────── */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-ghost">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium text-ink">Zadnji projekti</span>
          </div>
          <Link
            href="/admin/projects"
            className="text-xs text-ink-muted hover:text-gold transition-colors flex items-center gap-1"
          >
            Vsi projekti
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="py-12 text-center text-ink-muted text-sm">
            Še ni projektov.{" "}
            <Link href="/admin/projects/new" className="text-gold hover:underline">
              Ustvari prvega.
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-ink-ghost">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-background-elevated transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-ink group-hover:text-gold transition-colors">
                    {project.naziv}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5 font-mono">/{project.slug}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                  <span>{project._count.sessions} sej</span>
                  <span>{formatDate(project.createdAt)}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
