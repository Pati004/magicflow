// =============================================================
//  MAGICFLOW — JWT token za SUS vprašalnik (1-use only)
//  Algoritem: HS256 z Node.js crypto (brez zunanjih knjižnic)
//  Env: SUS_JWT_SECRET (min 32 znakov)
// =============================================================

import { createHmac, randomBytes } from "crypto";

// ─── Pomočniki ────────────────────────────────────────────────

function b64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str: string): string {
  const pad = str.length % 4;
  const padded = str + "=".repeat(pad ? 4 - pad : 0);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function getSecret(): string {
  const s = process.env.SUS_JWT_SECRET;
  if (!s || s.length < 16) throw new Error("SUS_JWT_SECRET ni nastavljen ali je prekratek (min 16 znakov).");
  return s;
}

// ─── Podpis JWT ───────────────────────────────────────────────

function sign(header: string, payload: string, secret: string): string {
  return b64url(
    createHmac("sha256", secret).update(`${header}.${payload}`).digest(),
  );
}

// ─── Ustvari token za SUS sejo ────────────────────────────────

export interface SUSTokenPayload {
  sub:  string;    // SUSStudySession.id
  iat:  number;    // issued at (unix)
  exp:  number;    // expires at (unix)
  jti:  string;    // unique token id
}

export function createSUSToken(sessionId: string, ttlDays = 7): string {
  const secret  = getSecret();
  const now     = Math.floor(Date.now() / 1000);
  const payload: SUSTokenPayload = {
    sub: sessionId,
    iat: now,
    exp: now + ttlDays * 86_400,
    jti: randomBytes(8).toString("hex"),
  };

  const header  = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body    = b64url(JSON.stringify(payload));
  const sig     = sign(header, body, secret);

  return `${header}.${body}.${sig}`;
}

// ─── Preveri in dekodiraj token ───────────────────────────────

export type TokenVerifyResult =
  | { ok: true;  payload: SUSTokenPayload }
  | { ok: false; reason: "invalid" | "expired" | "malformed" };

export function verifySUSToken(token: string): TokenVerifyResult {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { ok: false, reason: "malformed" };

    const [header, body, sig] = parts as [string, string, string];

    // Preveri podpis
    const secret   = getSecret();
    const expected = sign(header, body, secret);
    if (expected !== sig) return { ok: false, reason: "invalid" };

    // Dekodiraj payload
    const payload = JSON.parse(b64urlDecode(body)) as SUSTokenPayload;

    // Preveri čas veljavnosti
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return { ok: false, reason: "expired" };

    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

// ─── Generiraj batch tokenov (za CSV izvoz) ───────────────────

export function createBatchTokens(
  sessions: Array<{ id: string; label: string }>,
  baseUrl:  string,
  ttlDays = 7,
): Array<{ sessionId: string; label: string; link: string; expiresAt: string }> {
  return sessions.map((s) => {
    const token = createSUSToken(s.id, ttlDays);
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();
    return { sessionId: s.id, label: s.label, link: `${baseUrl}/ux-study/sus/${token}`, expiresAt };
  });
}
