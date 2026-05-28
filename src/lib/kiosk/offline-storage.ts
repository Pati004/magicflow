"use client";

import { openDB, type IDBPDatabase } from "idb";

// ─── Tipi ─────────────────────────────────────────────────────

export interface PendingUpload {
  id:        string;
  base64:    string;
  sessionId: string;
  projectId: string;
  savedAt:   number;
  attempts:  number;
}

interface MagicflowDB {
  "pending-uploads": {
    key:   string;
    value: PendingUpload;
  };
  "offline-sessions": {
    key:   string;
    value: { id: string; projectId: string; createdAt: number };
  };
}

// ─── DB inicializacija ────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<MagicflowDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MagicflowDB>("magicflow-offline", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("pending-uploads")) {
          db.createObjectStore("pending-uploads", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("offline-sessions")) {
          db.createObjectStore("offline-sessions", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Shrani fotografijo offline ───────────────────────────────

export async function savePhotoOffline(
  base64:    string,
  sessionId: string,
  projectId: string
): Promise<string> {
  const db = await getDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const upload: PendingUpload = {
    id,
    base64,
    sessionId,
    projectId,
    savedAt:  Date.now(),
    attempts: 0,
  };

  await db.put("pending-uploads", upload);
  console.log(`[OfflineStorage] Fotografija shranjena: ${id}`);
  return id;
}

// ─── Pridobi čakajoče uploade ─────────────────────────────────

export async function getPendingUploads(): Promise<PendingUpload[]> {
  const db = await getDB();
  return db.getAll("pending-uploads");
}

// ─── Sync ob vzpostavitvi povezave ───────────────────────────

export async function syncPendingUploads(): Promise<{
  synced:  number;
  failed:  number;
}> {
  const db      = await getDB();
  const pending = await db.getAll("pending-uploads");

  let synced = 0;
  let failed = 0;

  for (const upload of pending) {
    try {
      const res = await fetch("/api/upload-photo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          base64:    upload.base64,
          sessionId: upload.sessionId,
        }),
      });

      if (res.ok) {
        await db.delete("pending-uploads", upload.id);
        synced++;
        console.log(`[OfflineStorage] Sinhroniziran: ${upload.id}`);
      } else {
        // Poveča attempt counter
        await db.put("pending-uploads", { ...upload, attempts: upload.attempts + 1 });
        failed++;
      }
    } catch {
      await db.put("pending-uploads", { ...upload, attempts: upload.attempts + 1 });
      failed++;
    }
  }

  return { synced, failed };
}

// ─── Počisti stare offline zapise ────────────────────────────

export async function cleanOldOfflineData(maxAgeHours = 48): Promise<void> {
  const db      = await getDB();
  const cutoff  = Date.now() - maxAgeHours * 60 * 60 * 1000;
  const pending = await db.getAll("pending-uploads");

  for (const upload of pending) {
    if (upload.savedAt < cutoff || upload.attempts >= 5) {
      await db.delete("pending-uploads", upload.id);
    }
  }
}

// ─── Število čakajočih uploadov ──────────────────────────────

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count("pending-uploads");
}
