"use server";

import { z }       from "zod";
import { prisma }  from "@/lib/prisma";
import type { VideoStyle, PoseAnalysisResponse } from "@/types/pose-analysis";
import { DEFAULT_VIDEO_STYLES }                   from "@/types/pose-analysis";

// ─── Tipi ─────────────────────────────────────────────────────

export interface UploadPhotoResult {
  success:  true;
  photoId:  string;
  sessionId: string;
}

export interface KioskActionError {
  success: false;
  error:   string;
}

// ─── Validacijske sheme ───────────────────────────────────────

const AnalyzePhotoSchema = z.object({
  photoId:   z.string().min(1),
  sessionId: z.string().min(1),
});

const CreateSessionSchema = z.object({
  projectId: z.string().min(1),
  guestName: z.string().max(100).optional(),
});

const SavePhotoSchema = z.object({
  sessionId:          z.string().min(1),
  cloudinaryUrl:      z.string().url(),
  cloudinaryPublicId: z.string().min(1),
});

// ─── Action: Ustvari sejo ─────────────────────────────────────

export async function createSessionAction(
  data: z.infer<typeof CreateSessionSchema>
): Promise<{ success: true; sessionId: string } | KioskActionError> {
  const parsed = CreateSessionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Neveljaven vnos" };
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) return { success: false, error: "Projekt ne obstaja" };

    const session = await prisma.session.create({
      data: {
        projectId: parsed.data.projectId,
        guestName: parsed.data.guestName ?? null,
        status:    "ACTIVE",
      },
    });

    return { success: true, sessionId: session.id };
  } catch {
    return { success: false, error: "Napaka pri ustvarjanju seje" };
  }
}

// ─── Action: Shrani fotografijo ───────────────────────────────

export async function savePhotoAction(
  data: z.infer<typeof SavePhotoSchema>
): Promise<UploadPhotoResult | KioskActionError> {
  const parsed = SavePhotoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Neveljaven vnos" };
  }

  try {
    // Preveri da seja obstaja in je aktivna
    const session = await prisma.session.findUnique({
      where: { id: parsed.data.sessionId },
    });

    if (!session) return { success: false, error: "Seja ne obstaja" };
    if (session.status !== "ACTIVE") return { success: false, error: "Seja ni aktivna" };

    const photo = await prisma.photo.create({
      data: {
        sessionId:          parsed.data.sessionId,
        cloudinaryUrl:      parsed.data.cloudinaryUrl,
        cloudinaryPublicId: parsed.data.cloudinaryPublicId,
        poseAnalysis:       {},
      },
    });

    return {
      success:   true,
      photoId:   photo.id,
      sessionId: session.id,
    };
  } catch {
    return { success: false, error: "Napaka pri shranjevanju fotografije" };
  }
}

// ─── Action: Analiziraj fotografijo ───────────────────────────

/**
 * Validira da Photo pripada aktivni Session,
 * pokliče API endpoint za AI analizo,
 * vrne VideoStyle[] za prikaz v kiosku.
 */
export async function analyzePhotoAction(
  data: z.infer<typeof AnalyzePhotoSchema>
): Promise<{ success: true; styles: VideoStyle[]; fallback: boolean } | KioskActionError> {
  const parsed = AnalyzePhotoSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Neveljaven vnos" };
  }

  const { photoId, sessionId } = parsed.data;

  try {
    // Preveri da Photo pripada aktivni Session
    const photo = await prisma.photo.findUnique({
      where:   { id: photoId },
      include: { session: true },
    });

    if (!photo) {
      return { success: false, error: "Fotografija ne obstaja" };
    }

    if (photo.sessionId !== sessionId) {
      return { success: false, error: "Fotografija ne pripada tej seji" };
    }

    if (photo.session.status !== "ACTIVE") {
      return { success: false, error: "Seja ni aktivna" };
    }

    // Pokliči API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/analyze-pose`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ photoId }),
    });

    if (!res.ok) {
      // Vračamo fallback stile — kiosk mora vedno delovati
      console.error("[analyzePhotoAction] API napaka:", res.status);
      return {
        success:  true,
        styles:   DEFAULT_VIDEO_STYLES,
        fallback: true,
      };
    }

    const data = await res.json() as PoseAnalysisResponse;

    if (!data.success) {
      return {
        success:  true,
        styles:   DEFAULT_VIDEO_STYLES,
        fallback: true,
      };
    }

    return {
      success:  true,
      styles:   data.styles,
      fallback: data.analysis.fallback,
    };

  } catch (err) {
    console.error("[analyzePhotoAction]", err);
    // Nikoli ne vrnemo napake kiosku — vedno fallback stili
    return {
      success:  true,
      styles:   DEFAULT_VIDEO_STYLES,
      fallback: true,
    };
  }
}

// ─── Action: Zaključi sejo ────────────────────────────────────

export async function completeSessionAction(
  sessionId: string
): Promise<{ success: true } | KioskActionError> {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data:  { status: "COMPLETED" },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Napaka pri zaključevanju seje" };
  }
}
