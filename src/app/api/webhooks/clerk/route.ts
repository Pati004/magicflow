import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import type { WebhookEvent } from "@clerk/nextjs/server";

// ─── Clerk Webhook Handler ─────────────────────────────────────
// Posluša Clerk evente in sinhronizira uporabnike z bazo
// Nastavi webhook URL v Clerk Dashboard:
// https://dashboard.clerk.com → Webhooks → + Add Endpoint
// URL: https://yourdomain.com/api/webhooks/clerk
// Events: user.created, user.updated, user.deleted

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET ni nastavljen");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // ─── Preveri Svix podpis ─────────────────────────────────────
  const headerPayload = await headers();
  const svixId        = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Manjkajo Svix headers" },
      { status: 400 }
    );
  }

  const payload = await request.json();
  const body    = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verifikacija neuspešna:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // ─── Obdelaj evente ──────────────────────────────────────────

  try {
    switch (event.type) {

      // Nov uporabnik se je registriral
      case "user.created": {
        const { id, email_addresses, first_name, last_name } = event.data;

        const email = email_addresses[0]?.email_address ?? "";
        const name  = [first_name, last_name].filter(Boolean).join(" ") || email;

        await prisma.user.create({
          data: {
            clerkId: id,
            email,
            name,
            role: "OPERATOR",
          },
        });

        console.log(`✅ Uporabnik ustvarjen: ${email}`);
        break;
      }

      // Uporabnik je posodobil profil
      case "user.updated": {
        const { id, email_addresses, first_name, last_name } = event.data;

        const email = email_addresses[0]?.email_address ?? "";
        const name  = [first_name, last_name].filter(Boolean).join(" ") || email;

        await prisma.user.update({
          where: { clerkId: id },
          data:  { email, name },
        });

        console.log(`✅ Uporabnik posodobljen: ${email}`);
        break;
      }

      // Uporabnik je izbrisan
      case "user.deleted": {
        const { id } = event.data;

        if (!id) break;

        await prisma.user.delete({
          where: { clerkId: id },
        });

        console.log(`✅ Uporabnik izbrisan: ${id}`);
        break;
      }

      default:
        console.log(`ℹ️ Neobdelan event: ${event.type}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    console.error("Webhook obdelava neuspešna:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
