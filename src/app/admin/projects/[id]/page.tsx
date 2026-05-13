import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectForm, type ProjectFormData } from "@/components/forms/ProjectForm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Uredi projekt" };

interface Props {
  params: { id: string };
}

export default async function EditProjectPage({ params }: Props) {
  await requireAdmin();

  const project = await prisma.project.findUnique({
    where:   { id: params.id },
    include: { config: true },
  });

  if (!project) notFound();

  // Pretvori DB model v obliko za form
  const config   = project.config;
  const branding = config?.branding as Record<string, string> | null;
  const printer  = config?.printerConfig as Record<string, string> | null;
  const features = config?.enabledFeatures ?? [];

  const defaultValues: Partial<ProjectFormData> = {
    general: {
      naziv:    project.naziv,
      slug:     project.slug,
      narocnik: project.narocnik,
      opis:     project.opis ?? "",
    },
    branding: {
      primaryColor: branding?.primaryColor ?? "#FFB020",
      logoUrl:      branding?.logoUrl ?? "",
      logoPublicId: branding?.logoPublicId ?? "",
      font:         (branding?.font as "geist" | "playfair" | "syne") ?? "geist",
    },
    features: {
      enablePhoto: features.includes("photo"),
      enableVideo: features.includes("video"),
      enablePrint: features.includes("print"),
      enableQR:    features.includes("qr"),
    },
    ai: {
      aiModel:         config?.aiModel ?? "RUNWAY_GEN3",
      maxGenSeconds:   60,
      emotionalStyles: config?.emotionalStyles ?? ["Dramatično"],
    },
    print: {
      dpi:        (printer?.dpi as "150" | "300" | "600") ?? "300",
      format:     (printer?.format as "4x6" | "5x7") ?? "4x6",
      headerText: printer?.headerText ?? "",
      footerText: printer?.footerText ?? "",
    },
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <Link
        href="/admin"
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Nazaj na projekte
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Uredi projekt</h1>
        <p className="text-ink-muted text-sm mt-1 font-mono">/{project.slug}</p>
      </div>

      <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6">
        <ProjectForm
          mode="edit"
          projectId={project.id}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  );
}
