// =============================================================
//  MAGICFLOW — Tematska analiza UX opazovalnih sej
//  Podpira: kodiranje citatov, izvoz za Atlas.ti / NVivo / R
// =============================================================

import { prisma } from "@/lib/prisma";

// ─── Tipi ─────────────────────────────────────────────────────

export interface ThematicCode {
  id:          string;
  theme:       string;
  subtheme:    string;
  description: string;
  color:       string;
}

export interface CodedQuote {
  quoteId:      string;
  sessionId:    string;
  participant:  string;
  timestampMs:  number;
  kioskStep:    string | null;
  eventType:    string;
  quote:        string;
  theme:        string | null;
  subtheme:     string | null;
}

// ─── Vnaprej definirani tematski kodi (induktivna + deduktivna) ──

export const PREDEFINED_THEMES: ThematicCode[] = [
  // Orientacija
  { id: "nav-confusion",   theme: "Navigacija",   subtheme: "Zmeda",          description: "Udeleženec ne ve, kaj narediti naprej",    color: "#ef4444" },
  { id: "nav-flow",        theme: "Navigacija",   subtheme: "Tekoč tok",      description: "Gladka navigacija brez težav",             color: "#22c55e" },
  // Čakanje
  { id: "wait-anxiety",    theme: "Čakanje",      subtheme: "Tesnoba",        description: "Negotovost med generiranjem videa",        color: "#f97316" },
  { id: "wait-acceptable", theme: "Čakanje",      subtheme: "Sprejemljivo",   description: "Čakanje doživljeno kot normalno",          color: "#eab308" },
  { id: "wait-long",       theme: "Čakanje",      subtheme: "Predolgo",       description: "Eksplicitna frustracija z dolžino čakanja", color: "#ef4444" },
  // Video rezultat
  { id: "video-delight",   theme: "Video",        subtheme: "Navdušenje",     description: "Pozitivna presenečenost z rezultatom",     color: "#22c55e" },
  { id: "video-quality",   theme: "Video",        subtheme: "Kakovost",       description: "Opazka glede vizualne kakovosti",          color: "#6366f1" },
  { id: "video-mismatch",  theme: "Video",        subtheme: "Neujemanje",     description: "Video se ne ujema z pričakovanji",         color: "#f97316" },
  // Stil
  { id: "style-choice",    theme: "Stil",         subtheme: "Izbira",         description: "Proces izbire emocionalnega stila",        color: "#8b5cf6" },
  { id: "style-unclear",   theme: "Stil",         subtheme: "Nejasnost",      description: "Opis stila je nejasen ali neustrezen",     color: "#f97316" },
  // Tehnično
  { id: "tech-error",      theme: "Tehnično",     subtheme: "Napaka",         description: "Tehnična napaka ali neodzivnost UI",       color: "#ef4444" },
  { id: "tech-camera",     theme: "Tehnično",     subtheme: "Kamera",         description: "Težava ali opazka glede kamere",           color: "#f97316" },
  // Splošno
  { id: "general-pos",     theme: "Splošno",      subtheme: "Pozitivno",      description: "Splošna pozitivna opazka",                 color: "#22c55e" },
  { id: "general-suggest", theme: "Splošno",      subtheme: "Predlog",        description: "Predlog za izboljšavo",                    color: "#0ea5e9" },
];

// ─── Skupni podatki za UX analizo ─────────────────────────────

export interface UXStudyData {
  generatedAt:  string;
  sessions: Array<{
    id:             string;
    participant:    string;
    startedAt:      string;
    durationMs:     number | null;
    susScore:       number | null;
    eventCounts:    Record<string, number>;
    quotes:         CodedQuote[];
    interview:      Record<string, unknown> | null;
  }>;
  thematicSummary: Array<{
    theme:    string;
    subtheme: string;
    count:    number;
    pct:      number;
    quotes:   string[];
  }>;
}

export async function exportForAtlas(_studyLabel?: string): Promise<UXStudyData> {
  const sessions = await prisma.observationSession.findMany({
    orderBy: { startedAt: "asc" },
    include: {
      events:    true,
      interview: true,
      susSession: {
        include: { response: { select: { score: true, grade: true } } },
      },
    },
  });

  const allQuotes: CodedQuote[] = [];

  const sessionsData = sessions.map((s) => {
    const durationMs = s.endedAt
      ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
      : null;

    const eventCounts: Record<string, number> = {};
    for (const e of s.events) {
      eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1;
    }

    const quotes: CodedQuote[] = s.events
      .filter((e) => e.quote)
      .map((e) => ({
        quoteId:     e.id,
        sessionId:   s.id,
        participant: s.participantCode,
        timestampMs: e.timestampMs,
        kioskStep:   e.kioskStep,
        eventType:   e.type,
        quote:       e.quote ?? "",
        theme:       e.theme,
        subtheme:    e.subtheme,
      }));

    allQuotes.push(...quotes);

    const interviewData = s.interview ? {
      waitingFeelings:  s.interview.waitingFeelings,
      waitingDuration:  s.interview.waitingDuration,
      waitingNotes:     s.interview.waitingNotes,
      wouldWatchAgain:  s.interview.wouldWatchAgain,
      videoQuality:     s.interview.videoQuality,
      videoDescription: s.interview.videoDescription,
      preferredStyle:   s.interview.preferredStyle,
      wantsMoreOptions: s.interview.wantsMoreOptions,
      styleNotes:       s.interview.styleNotes,
      generalNotes:     s.interview.generalNotes,
    } : null;

    return {
      id:          s.id,
      participant: s.participantCode,
      startedAt:   s.startedAt.toISOString(),
      durationMs,
      susScore:    s.susSession?.response?.score ?? null,
      eventCounts,
      quotes,
      interview:   interviewData as Record<string, unknown> | null,
    };
  });

  // Tematski povzetek
  const themeMap = new Map<string, { count: number; quotes: string[] }>();
  for (const q of allQuotes) {
    if (!q.theme) continue;
    const key = `${q.theme}::${q.subtheme ?? ""}`;
    const entry = themeMap.get(key) ?? { count: 0, quotes: [] };
    entry.count++;
    if (q.quote) entry.quotes.push(`[${q.participant}] "${q.quote}"`);
    themeMap.set(key, entry);
  }

  const total = allQuotes.filter((q) => q.theme).length || 1;
  const thematicSummary = [...themeMap.entries()]
    .map(([key, val]) => {
      const [theme, subtheme] = key.split("::") as [string, string];
      return { theme, subtheme, count: val.count, pct: parseFloat(((val.count / total) * 100).toFixed(1)), quotes: val.quotes.slice(0, 5) };
    })
    .sort((a, b) => b.count - a.count);

  return { generatedAt: new Date().toISOString(), sessions: sessionsData, thematicSummary };
}

// ─── CSV format za Atlas.ti / NVivo / R ──────────────────────

export async function exportQuotesCSV(): Promise<string> {
  const events = await prisma.observationEvent.findMany({
    where:   { quote: { not: null } },
    include: { observationSession: { select: { participantCode: true } } },
    orderBy: { observationSession: { startedAt: "asc" } },
  });

  const lines = [
    "participant,session_id,timestamp_ms,kiosk_step,event_type,theme,subtheme,quote",
    ...events.map((e) =>
      [
        e.observationSession.participantCode,
        e.observationSessionId,
        e.timestampMs,
        e.kioskStep ?? "",
        e.type,
        e.theme ?? "",
        e.subtheme ?? "",
        `"${(e.quote ?? "").replace(/"/g, '""')}"`,
      ].join(","),
    ),
  ];

  return lines.join("\n");
}

// ─── Podatki za regresijsko analizo ──────────────────────────

export async function exportRegressionCSV(): Promise<string> {
  const sessions = await prisma.observationSession.findMany({
    include: {
      events:    { select: { type: true } },
      interview: {
        select: {
          waitingFeelings: true,
          waitingDuration: true,
          wouldWatchAgain: true,
          videoQuality:    true,
          wantsMoreOptions: true,
        },
      },
      susSession: {
        include: {
          response: { select: { score: true, participantAge: true, techExperience: true } },
        },
      },
    },
  });

  const lines = [
    "participant,sus_score,age,tech_experience,duration_s,confusion_count,error_count,positive_count,waiting_feelings,waiting_duration,would_watch_again,video_quality,wants_more_options",
    ...sessions.map((s) => {
      const durationS = s.endedAt
        ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
        : "";
      const confusion = s.events.filter((e) => e.type === "confusion").length;
      const errors    = s.events.filter((e) => e.type === "error").length;
      const positive  = s.events.filter((e) => e.type === "positive").length;
      return [
        s.participantCode,
        s.susSession?.response?.score ?? "",
        s.susSession?.response?.participantAge ?? "",
        s.susSession?.response?.techExperience ?? "",
        durationS,
        confusion, errors, positive,
        s.interview?.waitingFeelings  ?? "",
        s.interview?.waitingDuration  ?? "",
        s.interview?.wouldWatchAgain  ?? "",
        s.interview?.videoQuality     ?? "",
        s.interview?.wantsMoreOptions ?? "",
      ].join(",");
    }),
  ];

  return lines.join("\n");
}
