"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  ProjectFormSchema,
  type ProjectFormData,
} from "@/lib/schemas/projects";

// ─── Pomožna funkcija — sestavi JSON objekte ──────────────────

function buildProjectData(data: ProjectFormData) {
  const { general, branding, features, ai, print } = data;

  return {
    naziv:     general.naziv,
    slug:      general.slug,
    narocnik:  general.narocnik,
    opis:      general.opis ?? null,
    nastavitve: {},
    config: {
      branding: {
        primaryColor: branding.primaryColor,
        logoUrl:      branding.logoUrl ?? "",
        logoPublicId: branding.logoPublicId ?? "",
        font:         branding.font,
      },
      enabledFeatures: [
        features.enablePhoto ? "photo"  : null,
        features.enableVideo ? "video"  : null,
        features.enablePrint ? "print"  : null,
        features.enableQR    ? "qr"     : null,
      ].filter(Boolean) as string[],
      emotionalStyles: ai.emotionalStyles,
      printerConfig: {
        dpi:        print.dpi,
        format:     print.format,
        headerText: print.headerText ?? "",
        footerText: print.footerText ?? "",
      },
      aiModel:       ai.aiModel,
    },
  };
}

// ─── Server Actions ───────────────────────────────────────────

export async function createProject(data: ProjectFormData) {
  const user   = await requireAdmin();
  const parsed = ProjectFormSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.project.findUnique({
    where: { slug: parsed.data.general.slug },
  });
  if (existing) {
    return { success: false as const, error: { slug: ["Slug je že zaseden"] } };
  }

  const built = buildProjectData(parsed.data);

  await prisma.project.create({
    data: {
      naziv:     built.naziv,
      slug:      built.slug,
      narocnik:  built.narocnik,
      opis:      built.opis,
      nastavitve: built.nastavitve,
      userId:    user.id,
      config: { create: built.config },
    },
  });

  revalidatePath("/admin/projects");
  return { success: true as const };
}

export async function updateProject(id: string, data: ProjectFormData) {
  await requireAdmin();
  const parsed = ProjectFormSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const built = buildProjectData(parsed.data);

  await prisma.project.update({
    where: { id },
    data: {
      naziv:    built.naziv,
      slug:     built.slug,
      narocnik: built.narocnik,
      opis:     built.opis,
      config: {
        upsert: {
          create: built.config,
          update: built.config,
        },
      },
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  return { success: true as const };
}

export async function deleteProject(id: string) {
  await requireAdmin();

  await prisma.project.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true as const };
}

export async function duplicateProject(id: string) {
  const user    = await requireAdmin();
  const project = await prisma.project.findUnique({
    where:   { id },
    include: { config: true },
  });

  if (!project) {
    return { success: false as const, error: "Projekt ne obstaja" };
  }

  const newSlug = `${project.slug}-kopija-${Date.now().toString(36)}`;

  await prisma.project.create({
    data: {
      naziv:     `${project.naziv} (kopija)`,
      slug:      newSlug,
      narocnik:  project.narocnik,
      opis:      project.opis,
      nastavitve: project.nastavitve as object,
      userId:    user.id,
      ...(project.config && {
        config: {
          create: {
            branding:        project.config.branding as object,
            enabledFeatures: project.config.enabledFeatures,
            emotionalStyles: project.config.emotionalStyles,
            printerConfig:   project.config.printerConfig as object,
            aiModel:         project.config.aiModel,
          },
        },
      }),
    },
  });

  revalidatePath("/admin");
  return { success: true as const };
}
