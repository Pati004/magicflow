import { NextResponse } from "next/server";
import { z }            from "zod";
import { prisma }       from "@/lib/prisma";

const Schema = z.object({
  projectId: z.string().min(1),
  guestName: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Neveljaven vnos" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Projekt ne obstaja" }, { status: 404 });
    }

    const session = await prisma.session.create({
      data: {
        projectId: parsed.data.projectId,
        guestName: parsed.data.guestName ?? null,
        status:    "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, sessionId: session.id });

  } catch (err) {
    console.error("[KIOSK SESSION]", err);
    return NextResponse.json({ error: "Napaka pri ustvarjanju seje" }, { status: 500 });
  }
}
