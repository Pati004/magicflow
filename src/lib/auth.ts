import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

// ─── Tipi ─────────────────────────────────────────────────────

export type AuthUser = User;

// ─── Helper funkcije ──────────────────────────────────────────

/**
 * Vrne trenutnega uporabnika iz baze ali null.
 * Uporablja Clerk userId za iskanje v bazi.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const existing = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (existing) return existing;

    // Prvič — sinhroniziraj iz Clerk in ustvari zapis
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ") || email;

    // Če je baza prazna → prvi uporabnik dobi ADMIN vlogo
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "OPERATOR";

    const created = await prisma.user.create({
      data: { clerkId: userId, email, name, role },
    });

    return created;
  } catch {
    return null;
  }
}

/**
 * Zahteva prijavljenega uporabnika z ADMIN vlogo.
 * Preusmeri na /unauthorized če pogoj ni izpolnjen.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Zahteva prijavljenega uporabnika z OPERATOR ali ADMIN vlogo.
 * Preusmeri na /unauthorized če pogoj ni izpolnjen.
 */
export async function requireOperator(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Vrne Clerk userId ali vrže napako.
 * Uporabi v API route handlers.
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

/**
 * Sinhronizira Clerk uporabnika z bazo.
 * Ustvari zapis če ne obstaja, posodobi če obstaja.
 */
export async function syncUserToDatabase(clerkUserId: string): Promise<AuthUser> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Clerk user not found");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ") || email;

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    update: { email, name },
    create: {
      clerkId: clerkUserId,
      email,
      name,
      role: "OPERATOR", // privzeta vloga
    },
  });

  return user;
}
