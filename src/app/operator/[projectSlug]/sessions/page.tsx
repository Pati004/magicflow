import { requireOperator } from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { notFound }        from "next/navigation";
import { getAllSessions }  from "@/lib/operator/stats";
import { SessionsClient } from "./SessionsClient";

export const metadata = { title: "Seje" };

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params:       { projectSlug: string };
  searchParams: { filter?: string };
}) {
  await requireOperator();

  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
  });
  if (!project) notFound();

  const filter = (searchParams.filter ?? "today") as "today" | "week" | "all";
  const sessions = await getAllSessions(project.id, filter);

  return (
    <SessionsClient
      projectSlug={params.projectSlug}
      projectId={project.id}
      sessions={sessions.map((s) => ({
        id:         s.id,
        guestName:  s.guestName,
        status:     s.status,
        createdAt:  s.createdAt.toISOString(),
        photoCount: s._count.photos,
        thumbnail:  s.photos[0]?.cloudinaryUrl ?? null,
        videos:     s.photos[0]?.generatedVideos ?? [],
      }))}
      filter={filter}
    />
  );
}
