import { z } from "zod";

// ─── BrandingConfig ───────────────────────────────────────────

export const BrandingConfigSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Neveljaven HEX barvni kod")
    .default("#FFB020"),
  logoUrl:         z.string().url("Neveljaven URL").or(z.literal("")).default(""),
  logoPublicId:    z.string().default(""),
  fontFamily:      z.enum(["geist", "playfair", "syne"]).default("geist"),
  backgroundStyle: z.enum(["dark", "light", "gradient", "custom"]).default("dark"),
  customBgUrl:     z.string().url().optional(),
}).refine(
  (data) => data.backgroundStyle !== "custom" || !!data.customBgUrl,
  { message: "customBgUrl je obvezen ko je backgroundStyle 'custom'", path: ["customBgUrl"] }
);

// ─── FeatureFlags ─────────────────────────────────────────────

export const FeatureFlagsSchema = z.object({
  photoCapture:   z.boolean().default(true),
  aiVideo:        z.boolean().default(true),
  printing:       z.boolean().default(false),
  qrDistribution: z.boolean().default(false),
  offlineMode:    z.boolean().default(false),
});

// ─── AIVideoConfig ────────────────────────────────────────────

export const AIVideoModelSchema = z.enum([
  "RUNWAY_GEN3",
  "KLING_V1",
  "KLING_V2",
  "LUMA_DREAM",
  "PIKA_V2",
]);

export const AIVideoConfigSchema = z.object({
  defaultModel: AIVideoModelSchema.default("RUNWAY_GEN3"),
  enabledModels: z
    .array(AIVideoModelSchema)
    .min(1, "Izberi vsaj en AI model")
    .default(["RUNWAY_GEN3"]),
  maxGenerationTime: z
    .number()
    .min(10,  "Minimalni čas je 10 sekund")
    .max(300, "Maksimalni čas je 300 sekund")
    .default(60),
  emotionalStyles: z
    .array(z.string().min(1).max(50))
    .min(1, "Dodaj vsaj en emocionalni stil")
    .default(["Dramatično"]),
  promptTemplate: z.string().max(500).optional(),
}).refine(
  (data) => data.enabledModels.includes(data.defaultModel),
  { message: "Privzeti model mora biti med vklopljenimi modeli", path: ["defaultModel"] }
);

// ─── PrintConfig ──────────────────────────────────────────────

export const PrintConfigSchema = z.object({
  dpi:        z.union([z.literal(150), z.literal(300), z.literal(600)]).default(300),
  format:     z.enum(["4x6", "5x7"]).default("4x6"),
  headerText: z.string().max(100).default(""),
  footerText: z.string().max(100).default(""),
  copies:     z.number().int().min(1).max(5).default(1),
});

// ─── EventInfo ────────────────────────────────────────────────

export const EventInfoSchema = z.object({
  eventName:     z.string().max(100).default(""),
  date:          z.string().datetime({ message: "Neveljaven datum" }).or(z.literal("")).default(""),
  location:      z.string().max(200).default(""),
  organizerName: z.string().max(100).default(""),
  logoUrl:       z.string().url().optional().or(z.literal("")),
});

// ─── Glavni ProjectConfig schema ──────────────────────────────

export const ProjectConfigSchema = z.object({
  branding: BrandingConfigSchema,
  features: FeatureFlagsSchema,
  aiVideo:  AIVideoConfigSchema,
  print:    PrintConfigSchema,
  event:    EventInfoSchema,
});

// ─── Parcialni schema za PATCH ────────────────────────────────

export const PartialProjectConfigSchema = z.object({
  branding: z.object({
    primaryColor:    z.string().optional(),
    logoUrl:         z.string().optional(),
    logoPublicId:    z.string().optional(),
    fontFamily:      z.enum(["geist", "playfair", "syne"]).optional(),
    backgroundStyle: z.enum(["dark", "light", "gradient", "custom"]).optional(),
    customBgUrl:     z.string().optional(),
  }).optional(),
  features: FeatureFlagsSchema.partial().optional(),
  aiVideo: z.object({
    defaultModel:      AIVideoModelSchema.optional(),
    enabledModels:     z.array(AIVideoModelSchema).optional(),
    maxGenerationTime: z.number().optional(),
    emotionalStyles:   z.array(z.string()).optional(),
    promptTemplate:    z.string().optional(),
  }).optional(),
  print:    PrintConfigSchema.partial().optional(),
  event:    EventInfoSchema.partial().optional(),
});

// ─── Tipi iz shem ─────────────────────────────────────────────

export type BrandingConfigInput      = z.input<typeof BrandingConfigSchema>;
export type FeatureFlagsInput        = z.input<typeof FeatureFlagsSchema>;
export type AIVideoConfigInput       = z.input<typeof AIVideoConfigSchema>;
export type PrintConfigInput         = z.input<typeof PrintConfigSchema>;
export type EventInfoInput           = z.input<typeof EventInfoSchema>;
export type ProjectConfigInput       = z.input<typeof ProjectConfigSchema>;
export type PartialProjectConfigInput = z.input<typeof PartialProjectConfigSchema>;
