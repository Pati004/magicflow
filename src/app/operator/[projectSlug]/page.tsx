import { requireOperator }  from "@/lib/auth";
import { prisma }           from "@/lib/prisma";
import { notFound }         from "next/navigation";
import { getTodayStats, getRecentSessions, getPrinterStatus } from "@/lib/operator/stats";
import { formatDate }       from "@/lib/utils";
import { OperatorDashboardClient } from "./OperatorDashboardClient";

export const metadata = { title: "Operator Dashboard" };

export default async function OperatorDashboardPage({
  params,
}: { params: { projectSlug: string } }) {
  await requireOperator();

  const project = await prisma.project.findUnique({
    where:   { slug: params.projectSlug },
    include: { config: true },
  });

  if (!project) notFound();

  const [stats, sessions, printer] = await Promise.all([
    getTodayStats(project.id),
    getRecentSessions(project.id, 10),
    getPrinterStatus(project.id),
  ]);

  const branding     = project.config?.branding as Record<string, string> | null;
  const primaryColor = branding?.primaryColor ?? "#FFB020";
  const kioskUrl     = `${process.env.NEXT_PUBLIC_APP_URL}/kiosk/${project.slug}`;

  return (
    <OperatorDashboardClient
      project={{
        id:    project.id,
        naziv: project.naziv,
        slug:  project.slug,
        createdAt: project.createdAt.toISOString(),
      }}
      initialStats={stats}
      initialSessions={sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      }))}
      printerStatus={printer}
      primaryColor={primaryColor}
      kioskUrl={kioskUrl}
    />
  );
}
