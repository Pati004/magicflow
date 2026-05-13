import { prisma } from "@/lib/prisma";

// ─── Tipi ─────────────────────────────────────────────────────

export interface TodayStats {
  photos:      number;
  videos:      number;
  successRate: number;   // 0–100
  avgLatency:  number;   // ms
  failedVideos: number;
}

export interface PrinterStatus {
  online:      boolean;
  paperLevel?: "ok" | "low" | "empty";
  message:     string;
}

export interface RecentSession {
  id:          string;
  guestName:   string | null;
  status:      string;
  createdAt:   Date;
  photoCount:  number;
  videoCount:  number;
  thumbnail:   string | null;  // Cloudinary URL prve fotografije
}

// ─── Začetek dneva ────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── getTodayStats ────────────────────────────────────────────

export async function getTodayStats(projectId: string): Promise<TodayStats> {
  const since = todayStart();

  // Seje danes
  const sessions = await prisma.session.findMany({
    where:   { projectId, createdAt: { gte: since } },
    include: {
      photos: {
        include: {
          generatedVideos: {
            select: { status: true, latencyMs: true },
          },
        },
      },
    },
  });

  let photos      = 0;
  let videos      = 0;
  let doneVideos  = 0;
  let failedVideos = 0;
  let totalLatency = 0;
  let latencyCount = 0;

  for (const session of sessions) {
    photos += session.photos.length;
    for (const photo of session.photos) {
      for (const video of photo.generatedVideos) {
        videos++;
        if (video.status === "DONE") {
          doneVideos++;
          if (video.latencyMs) {
            totalLatency += video.latencyMs;
            latencyCount++;
          }
        }
        if (video.status === "ERROR") failedVideos++;
      }
    }
  }

  return {
    photos,
    videos,
    successRate: videos > 0 ? Math.round((doneVideos / videos) * 100) : 100,
    avgLatency:  latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
    failedVideos,
  };
}

// ─── getRecentSessions ────────────────────────────────────────

export async function getRecentSessions(
  projectId: string,
  limit:      number = 10,
  filter:     "today" | "week" | "all" = "today"
): Promise<RecentSession[]> {
  const since = filter === "today" ? todayStart()
              : filter === "week"  ? weekStart()
              : undefined;

  const sessions = await prisma.session.findMany({
    where: {
      projectId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take:    limit,
    include: {
      photos: {
        take:    1,
        orderBy: { createdAt: "asc" },
        include: {
          generatedVideos: {
            select: { status: true },
          },
        },
      },
      _count: {
        select: { photos: true },
      },
    },
  });

  return sessions.map((s) => ({
    id:         s.id,
    guestName:  s.guestName,
    status:     s.status,
    createdAt:  s.createdAt,
    photoCount: s._count.photos,
    videoCount: s.photos[0]?.generatedVideos.length ?? 0,
    thumbnail:  s.photos[0]?.cloudinaryUrl ?? null,
  }));
}

// ─── getPrinterStatus ─────────────────────────────────────────
// Simulacija — v produkciji bi se pogovarjal z lokalnim printerjem

export async function getPrinterStatus(
  _projectId: string
): Promise<PrinterStatus> {
  try {
    // TODO: zamenjaj z dejanskim API klicem na lokalni printer agent
    // const res = await fetch("http://localhost:9100/status", { signal: AbortSignal.timeout(2000) });
    // const data = await res.json();

    // Simulacija — vedno "ok" za zdaj
    return {
      online:     true,
      paperLevel: "ok",
      message:    "Tiskalnik deluje normalno",
    };
  } catch {
    return {
      online:  false,
      message: "Tiskalnik ni dosegljiv",
    };
  }
}

// ─── getAllSessions (za tabelo) ───────────────────────────────

export async function getAllSessions(
  projectId: string,
  filter:    "today" | "week" | "all" = "all"
) {
  const since = filter === "today" ? todayStart()
              : filter === "week"  ? weekStart()
              : undefined;

  return prisma.session.findMany({
    where: {
      projectId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      photos: {
        include: {
          generatedVideos: {
            select: { id: true, status: true, videoUrl: true, model: true },
          },
        },
        take: 1,
      },
      _count: { select: { photos: true } },
    },
  });
}
