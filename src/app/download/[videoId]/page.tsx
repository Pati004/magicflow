import { notFound }  from "next/navigation";
import { prisma }    from "@/lib/prisma";
import { Metadata }  from "next";
import { generateVideoThumbnail } from "@/lib/cloudinary";
import { DownloadClient }         from "./DownloadClient";

// ─── Metadata ─────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { videoId: string } }): Promise<Metadata> {
  const video = await prisma.generatedVideo.findUnique({ where: { id: params.videoId } });
  return {
    title:       video ? "Tvoj Magicflow video 🎬" : "Video ne obstaja",
    description: "Prenesi svoj personaliziran AI video",
  };
}

// ─── Download stran ───────────────────────────────────────────

export default async function DownloadPage({ params }: { params: { videoId: string } }) {
  const video = await prisma.generatedVideo.findUnique({
    where:   { id: params.videoId },
    include: {
      photo: {
        include: {
          session: {
            include: { project: { include: { config: true } } },
          },
        },
      },
    },
  });

  if (!video || video.status !== "DONE" || !video.videoUrl) notFound();

  // Beleži prenos v DB (incrementalna statistika)
  await prisma.generatedVideo.update({
    where: { id: params.videoId },
    data:  { updatedAt: new Date() }, // TODO: dodaj downloadCount polje v shemo
  });

  const project   = video.photo.session.project;
  const config    = project.config;
  const branding  = config?.branding as Record<string, string> | null;
  const primary   = branding?.primaryColor ?? "#FFB020";
  const logoUrl   = branding?.logoUrl ?? "";

  // Thumbnail iz Cloudinary
  const thumbnailUrl = video.photo.cloudinaryUrl;

  return (
    <DownloadClient
      videoUrl={video.videoUrl}
      thumbnailUrl={thumbnailUrl}
      projectName={project.naziv}
      primaryColor={primary}
      logoUrl={logoUrl}
      videoId={params.videoId}
      model={video.model}
    />
  );
}
