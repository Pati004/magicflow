import { z } from "zod";

export const ProjectGeneralSchema = z.object({
  naziv: z
    .string({ error: "Naziv mora imeti vsaj 2 znaka" })
    .min(2, "Naziv mora imeti vsaj 2 znaka")
    .max(100, "Naziv je predolg"),
  slug: z
    .string({ error: "Slug mora imeti vsaj 2 znaka" })
    .min(2, "Slug mora imeti vsaj 2 znaka")
    .max(60, "Slug je predolg")
    .regex(/^[a-z0-9-]+$/, "Slug sme vsebovati samo male črke, številke in -"),
  narocnik: z
    .string({ error: "Ime naročnika je obvezno" })
    .min(2, "Ime naročnika je obvezno")
    .max(100, "Ime naročnika je predolgo"),
  opis: z.string().max(500, "Opis je predolg").optional(),
});

export const ProjectBrandingSchema = z.object({
  primaryColor: z
    .string({ error: "Neveljaven barvni kod" })
    .regex(/^#[0-9A-Fa-f]{6}$/, "Neveljaven hex barvni kod"),
  logoUrl:      z.string().url("Neveljaven URL").optional().or(z.literal("")),
  logoPublicId: z.string().optional(),
  font:         z.enum(["geist", "playfair", "syne"], {
    error: "Izberi veljavno pisavo",
  }),
});

export const ProjectFeaturesSchema = z.object({
  enablePhoto: z.boolean(),
  enableVideo: z.boolean(),
  enablePrint: z.boolean(),
  enableQR:    z.boolean(),
});

export const ProjectAISchema = z.object({
  aiModel: z.enum(["RUNWAY_GEN3", "KLING_V1", "KLING_V2", "LUMA_DREAM", "PIKA_V2"], {
    error: "Izberi veljaven AI model",
  }),
  maxGenSeconds: z
    .number({ error: "Vnesite veljavno število" })
    .min(10, "Najmanj 10 sekund")
    .max(300, "Največ 300 sekund"),
  emotionalStyles: z.array(z.string()).min(1, "Izberi vsaj en stil"),
});

export const ProjectPrintSchema = z.object({
  dpi:        z.enum(["150", "300", "600"], { error: "Izberi veljaven DPI" }),
  format:     z.enum(["4x6", "5x7"], { error: "Izberi veljaven format" }),
  headerText: z.string().max(100, "Besedilo je predolgo").optional(),
  footerText: z.string().max(100, "Besedilo je predolgo").optional(),
});

export const ProjectFormSchema = z.object({
  general:  ProjectGeneralSchema,
  branding: ProjectBrandingSchema,
  features: ProjectFeaturesSchema,
  ai:       ProjectAISchema,
  print:    ProjectPrintSchema,
});

export type ProjectFormData = z.infer<typeof ProjectFormSchema>;
