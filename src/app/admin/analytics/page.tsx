import { requireAdmin } from "@/lib/auth";
import { prisma }       from "@/lib/prisma";
import { BarChart3, Camera, Video, FolderKanban, Users } from "lucide-react";

export const metadata = { title: "Admin — Analitika" };

export default async function AnalyticsPage() {
  await requireAdmin();

  const [projects, sessions, photos, videos, users] = await Promise.all([
    prisma.project.count(),
    prisma.session.count(),
    prisma.photo.count(),
    prisma.generatedVideo.count(),
    prisma.user.count(),
  ]);

  const doneVideos    = await prisma.generatedVideo.count({ where: { status: "DONE" } });
  const successRate   = videos > 0 ? Math.round((doneVideos / videos) * 100) : 0;

  const stats = [
    { label: "Skupaj projektov",  value: projects,    icon: FolderKanban, color: "text-gold" },
    { label: "Skupaj sej",        value: sessions,    icon: Camera,       color: "text-blue-400" },
    { label: "Fotografij",        value: photos,      icon: Camera,       color: "text-green-400" },
    { label: "Generiranih videov",value: videos,      icon: Video,        color: "text-purple-400" },
    { label: "Uspešnost videov",  value: `${successRate}%`, icon: BarChart3, color: "text-gold" },
    { label: "Uporabnikov",       value: users,       icon: Users,        color: "text-ink-muted" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Analitika</h1>
        <p className="text-ink-muted text-sm mt-0.5">Pregled platforme</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-background-surface border border-ink-ghost rounded-2xl p-6">
            <Icon className={`h-5 w-5 mb-3 ${color}`} />
            <p className="text-3xl font-bold text-ink mb-1">{value}</p>
            <p className="text-sm text-ink-muted">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
