import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProjectConfig } from "@/lib/project-config";
import { KioskWizard } from "@/components/kiosk/KioskWizard";

// ─── Metadata ─────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const project = await prisma.project.findUnique({ where: { slug: params.slug } });
  return {
    title: project?.naziv ?? "Magicflow Kiosk",
  };
}

// ─── Offline fallback ─────────────────────────────────────────

function OfflineFallback({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-3xl font-bold text-white mb-3">Brez povezave</h1>
      <p className="text-white/50 text-lg mb-8 max-w-xs">
        Kiosk deluje v offline načinu. AI video generiranje ni na voljo.
      </p>
      <a
        href={`/kiosk/${slug}`}
        className="px-8 py-4 rounded-2xl bg-white/10 text-white font-medium text-lg border border-white/20"
      >
        Poskusi znova
      </a>
    </div>
  );
}

// ─── Stran ────────────────────────────────────────────────────

export default async function KioskPage({
  params,
}: {
  params: { slug: string };
}) {
  // Poišči projekt po slugu
  const project = await prisma.project.findUnique({
    where: { slug: params.slug },
  });

  if (!project) notFound();

  // Naloži konfiguracijo (vedno vrne vsaj defaults)
  const config = await getProjectConfig(project.id);

  return (
    <main
      className="fixed inset-0 bg-black overflow-hidden touch-none select-none"
      style={{ height: "100dvh", width: "100dvw" }}
    >
      {/* Dinamično ozadje glede na branding */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${config.branding.primaryColor}, transparent 60%)`,
        }}
      />

      {/* Wizard */}
      <div className="relative h-full w-full">
        <KioskWizard
          config={config}
          projectId={project.id}
        />
      </div>
    </main>
  );
}
