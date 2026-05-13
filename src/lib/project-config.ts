import { prisma } from "@/lib/prisma";
import {
  ProjectConfigSchema,
  PartialProjectConfigSchema,
} from "@/lib/schemas/project-config.schema";
import type {
  ProjectConfig,
  PartialProjectConfig,
  ProjectConfigWithMeta,
  ConfigValidationResult,
} from "@/types/project-config";

// ─── Privzete vrednosti ───────────────────────────────────────

export const DEFAULT_CONFIG: ProjectConfig = {
  branding: {
    primaryColor:    "#FFB020",
    logoUrl:         "",
    logoPublicId:    "",
    fontFamily:      "geist",
    backgroundStyle: "dark",
  },
  features: {
    photoCapture:   true,
    aiVideo:        true,
    printing:       false,
    qrDistribution: false,
    offlineMode:    false,
  },
  aiVideo: {
    defaultModel:      "RUNWAY_GEN3",
    enabledModels:     ["RUNWAY_GEN3"],
    maxGenerationTime: 60,
    emotionalStyles:   ["Dramatično"],
  },
  print: {
    dpi:        300,
    format:     "4x6",
    headerText: "",
    footerText: "",
    copies:     1,
  },
  event: {
    eventName:     "",
    date:          "",
    location:      "",
    organizerName: "",
  },
};

// ─── Deep merge ───────────────────────────────────────────────

/**
 * Deep merge dveh konfiguracij.
 * Override vrednosti nadomestijo base vrednosti na vsakem nivoju.
 */
export function mergeConfig(
  base: ProjectConfig,
  override: PartialProjectConfig
): ProjectConfig {
  return {
    branding: { ...base.branding, ...(override.branding ?? {}) },
    features: { ...base.features, ...(override.features ?? {}) },
    aiVideo:  { ...base.aiVideo,  ...(override.aiVideo  ?? {}) },
    print:    { ...base.print,    ...(override.print    ?? {}) },
    event:    { ...base.event,    ...(override.event    ?? {}) },
  };
}

// ─── Validacija ───────────────────────────────────────────────

/**
 * Validira konfiguracijo z Zod shemo.
 * Vrne typed config ali strukturirane napake.
 */
export function validateConfig(data: unknown): ConfigValidationResult {
  const result = ProjectConfigSchema.safeParse(data);

  if (result.success) {
    return { success: true, config: result.data, errors: null };
  }

  // Pretvori Zod napake v strukturiran format
  const fieldErrors = result.error.flatten().fieldErrors;
  const errors = {
    branding: {} as Record<string, string[]>,
    features: {} as Record<string, string[]>,
    aiVideo:  {} as Record<string, string[]>,
    print:    {} as Record<string, string[]>,
    event:    {} as Record<string, string[]>,
  };

  for (const [key, messages] of Object.entries(fieldErrors)) {
    const [section, field] = key.split(".");
    if (section && field && section in errors) {
      (errors as Record<string, Record<string, string[]>>)[section]![field] =
        messages as string[];
    }
  }

  return { success: false, config: null, errors };
}

// ─── Branje iz baze ───────────────────────────────────────────

/**
 * Vrne združeno konfiguracijo projekta (defaults + DB nastavitve).
 * Nikoli ne vrne null — vedno vsaj DEFAULT_CONFIG.
 */
export async function getProjectConfig(
  projectId: string
): Promise<ProjectConfigWithMeta> {
  const projectConfig = await prisma.projectConfig.findUnique({
    where: { projectId },
  });

  // Ni konfiguracije → vrni defaults
  if (!projectConfig) {
    return {
      ...DEFAULT_CONFIG,
      projectId,
      updatedAt: new Date(),
      isDefault: true,
    };
  }

  // Pretvori DB JSON v typed config
  const dbConfig: PartialProjectConfig = {
    branding: projectConfig.branding as PartialProjectConfig["branding"],
    features: buildFeaturesFromArray(projectConfig.enabledFeatures),
    aiVideo: {
      defaultModel:      projectConfig.aiModel,
      enabledModels:     [projectConfig.aiModel],
      maxGenerationTime: 60,
      emotionalStyles:   projectConfig.emotionalStyles,
    },
    print: projectConfig.printerConfig as PartialProjectConfig["print"],
  };

  const merged = mergeConfig(DEFAULT_CONFIG, dbConfig);
  const validation = validateConfig(merged);

  return {
    ...(validation.success ? validation.config : merged as ProjectConfig),
    projectId,
    updatedAt: projectConfig.updatedAt,
    isDefault: false,
  };
}

// ─── Shranjevanje v bazo ──────────────────────────────────────

/**
 * Posodobi posamezne dele konfiguracije projekta.
 * Uporablja deep merge — ne prepiše celotne konfiguracije.
 */
export async function updateProjectConfig(
  projectId: string,
  patch: PartialProjectConfig
): Promise<ProjectConfigWithMeta> {
  // Validiraj patch
  const patchResult = PartialProjectConfigSchema.safeParse(patch);
  if (!patchResult.success) {
    throw new Error(
      `Neveljaven patch: ${patchResult.error.flatten().formErrors.join(", ")}`
    );
  }

  // Pridobi obstoječo konfiguracijo
  const current = await getProjectConfig(projectId);

  // Združi z novimi podatki
  const merged = mergeConfig(current, patchResult.data);

  // Pretvori nazaj v DB format
  const enabledFeatures = buildArrayFromFeatures(
    merged.features as Record<string, boolean>
  );

  await prisma.projectConfig.upsert({
    where: { projectId },
    create: {
      projectId,
      branding:        merged.branding as object,
      enabledFeatures,
      emotionalStyles: merged.aiVideo.emotionalStyles,
      printerConfig:   merged.print as object,
      aiModel:         merged.aiVideo.defaultModel,
    },
    update: {
      branding:        merged.branding as object,
      enabledFeatures,
      emotionalStyles: merged.aiVideo.emotionalStyles,
      printerConfig:   merged.print as object,
      aiModel:         merged.aiVideo.defaultModel,
    },
  });

  return { ...merged, projectId, updatedAt: new Date(), isDefault: false };
}

// ─── Pomožne funkcije ─────────────────────────────────────────

function buildFeaturesFromArray(arr: string[]): PartialProjectConfig["features"] {
  return {
    photoCapture:   arr.includes("photo"),
    aiVideo:        arr.includes("video"),
    printing:       arr.includes("print"),
    qrDistribution: arr.includes("qr"),
    offlineMode:    arr.includes("offline"),
  };
}

function buildArrayFromFeatures(features: Record<string, boolean>): string[] {
  const map: Record<string, string> = {
    photoCapture:   "photo",
    aiVideo:        "video",
    printing:       "print",
    qrDistribution: "qr",
    offlineMode:    "offline",
  };
  return Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => map[key] ?? key);
}
