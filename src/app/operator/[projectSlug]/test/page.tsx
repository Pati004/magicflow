import { requireOperator } from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { notFound }        from "next/navigation";
import { getProjectConfig } from "@/lib/project-config";
import { KioskWizard }     from "@/components/kiosk/KioskWizard";

export const metadata = { title: "Test Mode" };

export default async function TestModePage({
  params,
}: { params: { projectSlug: string } }) {
  await requireOperator();

  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
  });
  if (!project) notFound();

  const config = await getProjectConfig(project.id);

  return (
    <div className="flex flex-col h-screen">
      {/* Test mode banner */}
      <div className="flex items-center justify-between px-6 py-2 bg-yellow-500/10 border-b border-yellow-500/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-sm font-medium">TEST MODE — podatki se ne shranjujejo v produkcijsko bazo</span>
        </div>
        <a href={`/operator/${params.projectSlug}`}
          className="text-yellow-400/70 hover:text-yellow-400 text-xs transition-colors">
          ← Nazaj na dashboard
        </a>
      </div>

      {/* Kiosk vmesnik v test načinu */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <KioskWizard
          config={{ ...config, projectId: `test_${project.id}` }}
          projectId={`test_${project.id}`}
        />
      </div>
    </div>
  );
}
