import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  getProjectConfig,
  updateProjectConfig,
} from "@/lib/project-config";
import { PartialProjectConfigSchema } from "@/lib/schemas/project-config.schema";

// ─── Pomožna funkcija — preveri dostop do projekta ────────────

async function verifyProjectAccess(projectId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) return null;

  // Admin vidi vse projekte, operator samo svoje
  if (user.role === "ADMIN") return user;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });

  return project ? user : null;
}

// ─── GET /api/projects/[id]/config ───────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyProjectAccess(params.id, userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await getProjectConfig(params.id);

    return NextResponse.json({
      success:   true,
      projectId: params.id,
      config,
      isDefault: config.isDefault,
      updatedAt: config.updatedAt,
    });

  } catch (error) {
    console.error("[CONFIG GET]", error);
    return NextResponse.json(
      { error: "Napaka pri branju konfiguracije" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/projects/[id]/config ─────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyProjectAccess(params.id, userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Preberemo body
    const body = await request.json();

    // Validiramo patch
    const parsed = PartialProjectConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:  "Neveljaven request body",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Preverimo da projekt obstaja
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Projekt ne obstaja" }, { status: 404 });
    }

    // Posodobimo konfiguracijo
    const updated = await updateProjectConfig(params.id, parsed.data);

    return NextResponse.json({
      success:   true,
      projectId: params.id,
      config:    updated,
      updatedAt: updated.updatedAt,
    });

  } catch (error) {
    console.error("[CONFIG PATCH]", error);
    return NextResponse.json(
      { error: "Napaka pri posodabljanju konfiguracije" },
      { status: 500 }
    );
  }
}
