// =============================================================
//  MAGICFLOW — I2V Model Factory
//
//  Glede na AiModel enum iz ProjectConfig vrne ustrezni adapter.
//  Env spremenljivke se berejo lazy (ob prvem klicu).
// =============================================================

import type { I2VModel } from "./models/base";
import { RunwayAdapter } from "./models/runway";
import { KlingAdapter }  from "./models/kling";
import { LumaAdapter }   from "./models/luma";
import { PikaAdapter }   from "./models/pika";

// ─── Tipi ─────────────────────────────────────────────────────

// Ujema z AiModel enum iz Prisma sheme
export type AiModelEnum =
  | "RUNWAY_GEN3"
  | "KLING_V1"
  | "KLING_V2"
  | "LUMA_DREAM"
  | "PIKA_V2";

// Ujema z VideoModel enum iz Prisma sheme (za GeneratedVideo.model)
export type VideoModelEnum = "RUNWAY" | "KLING" | "LUMA" | "PIKA";

// ─── Mapping: AiModel → VideoModel (za DB) ───────────────────

export const AI_TO_VIDEO_MODEL: Record<AiModelEnum, VideoModelEnum> = {
  RUNWAY_GEN3: "RUNWAY",
  KLING_V1:    "KLING",
  KLING_V2:    "KLING",
  LUMA_DREAM:  "LUMA",
  PIKA_V2:     "PIKA",
};

// ─── Env pomočniki ────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Manjka env spremenljivka: ${key}`);
  return val;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

// ─── Factory ─────────────────────────────────────────────────

export function getModel(aiModel: AiModelEnum): I2VModel {
  switch (aiModel) {
    case "RUNWAY_GEN3":
      return new RunwayAdapter(
        requireEnv("RUNWAY_API_KEY"),
        "gen3a_turbo",
        "1280:768",
      );

    case "KLING_V1":
      return new KlingAdapter(
        requireEnv("KLING_ACCESS_KEY"),
        requireEnv("KLING_SECRET_KEY"),
        "kling-v1",
      );

    case "KLING_V2":
      return new KlingAdapter(
        requireEnv("KLING_ACCESS_KEY"),
        requireEnv("KLING_SECRET_KEY"),
        "kling-v1-5",
      );

    case "LUMA_DREAM":
      return new LumaAdapter(requireEnv("LUMA_API_KEY"));

    case "PIKA_V2":
      return new PikaAdapter(requireEnv("PIKA_API_KEY"), "16:9");

    default: {
      // Fallback — Runway če je model neznan
      const key = optionalEnv("RUNWAY_API_KEY");
      if (!key) throw new Error(`Neznan AI model in ni RUNWAY_API_KEY fallbacka: ${aiModel as string}`);
      console.warn(`[ModelFactory] Neznan AI model "${aiModel as string}" — padec na Runway`);
      return new RunwayAdapter(key, "gen3a_turbo");
    }
  }
}

// ─── Preveri ali je model konfiguriran ───────────────────────

export function isModelConfigured(aiModel: AiModelEnum): boolean {
  try {
    getModel(aiModel);
    return true;
  } catch {
    return false;
  }
}
