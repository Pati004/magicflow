"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Save, Square, AlertTriangle, XCircle, ThumbsUp, HelpCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { PREDEFINED_THEMES } from "@/lib/ux/thematic-analysis";

// ─── Tipi ──────────────────────────────────────────────────────

type EventType = "confusion" | "error" | "positive" | "question" | "quote";

type KioskStep = "welcome" | "camera" | "actions" | "style" | "generating" | "result";

interface ObsEvent {
  id?:         string;   // prisoten samo za shranjene
  type:        EventType;
  timestampMs: number;
  quote:       string;
  kioskStep:   string;
  theme:       string;
  subtheme:    string;
  saved:       boolean;
}

interface ObserveClientProps {
  sessionId:      string;
  participantCode: string;
  startedAt:      string;
  endedAt:        string | null;
  existingEvents: Omit<ObsEvent, "saved">[];
  notes:          string;
}

// ─── Konfig gumbov za opazke ──────────────────────────────────

const EVENT_BUTTONS: Array<{ type: EventType; label: string; icon: typeof AlertTriangle; color: string; bg: string }> = [
  { type: "confusion", label: "Točka nerazumevanja", icon: AlertTriangle, color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { type: "error",     label: "Napaka",              icon: XCircle,       color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  { type: "positive",  label: "Pozitivna opazka",    icon: ThumbsUp,      color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  { type: "question",  label: "Vprašanje udeleženca", icon: HelpCircle,   color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  { type: "quote",     label: "Citat",               icon: MessageSquare, color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
];

const KIOSK_STEPS: Array<{ value: KioskStep; label: string }> = [
  { value: "welcome",    label: "Dobrodošlica" },
  { value: "camera",     label: "Kamera" },
  { value: "actions",    label: "Akcije" },
  { value: "style",      label: "Stil videa" },
  { value: "generating", label: "Generiranje" },
  { value: "result",     label: "Rezultat" },
];

const EVENT_COLORS: Record<EventType, string> = {
  confusion: "#f97316",
  error:     "#ef4444",
  positive:  "#22c55e",
  question:  "#6366f1",
  quote:     "#0ea5e9",
};

// ─── Timer ────────────────────────────────────────────────────

function useTimer(startedAt: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick  = () => setElapsed(Date.now() - start);
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1000);
  return { elapsed, formatted: `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}` };
}

// ─── Glavna komponenta ────────────────────────────────────────

export function ObserveClient({
  sessionId,
  participantCode,
  startedAt,
  endedAt: initialEndedAt,
  existingEvents,
  notes: initialNotes,
}: ObserveClientProps) {
  const { elapsed, formatted } = useTimer(startedAt);

  const [events,     setEvents]     = useState<ObsEvent[]>(
    existingEvents.map((e) => ({ ...e, saved: true })),
  );
  const [quoteInput,  setQuoteInput]  = useState("");
  const [currentStep, setCurrentStep] = useState<KioskStep>("welcome");
  const [notes,       setNotes]       = useState(initialNotes);
  const [ended,       setEnded]       = useState(!!initialEndedAt);
  const [saving,      setSaving]      = useState(false);
  const [lastSaved,   setLastSaved]   = useState<Date | null>(null);
  const [codeMode,    setCodeMode]    = useState<string | null>(null); // event ID being coded
  const logRef = useRef<HTMLDivElement>(null);

  const unsavedCount = events.filter((e) => !e.saved).length;

  // ─── Auto-scroll log ──────────────────────────────────────

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  // ─── Dodaj opazko ─────────────────────────────────────────

  const addEvent = useCallback((type: EventType) => {
    const newEvent: ObsEvent = {
      type,
      timestampMs: elapsed,
      quote:       type === "quote" ? quoteInput : quoteInput,
      kioskStep:   currentStep,
      theme:       "",
      subtheme:    "",
      saved:       false,
    };
    setEvents((prev) => [...prev, newEvent]);
    if (type === "quote") setQuoteInput("");
  }, [elapsed, quoteInput, currentStep]);

  // ─── Shrani v DB ──────────────────────────────────────────

  const saveToServer = useCallback(async (finalEnd = false) => {
    const unsaved = events.filter((e) => !e.saved);
    if (unsaved.length === 0 && !finalEnd) return;

    setSaving(true);
    try {
      await fetch("/api/ux-study/observations", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          events:  unsaved.map((e) => ({ type: e.type, timestampMs: e.timestampMs, quote: e.quote || undefined, kioskStep: e.kioskStep || undefined, theme: e.theme || undefined, subtheme: e.subtheme || undefined })),
          ...(finalEnd && { endedAt: new Date().toISOString() }),
          notes: notes || undefined,
        }),
      });
      setEvents((prev) => prev.map((e) => ({ ...e, saved: true })));
      setLastSaved(new Date());
      if (finalEnd) setEnded(true);
    } finally {
      setSaving(false);
    }
  }, [events, sessionId, notes]);

  // ─── Auto-save vsakih 60s ─────────────────────────────────

  useEffect(() => {
    if (ended) return;
    const iv = setInterval(() => { void saveToServer(); }, 60_000);
    return () => clearInterval(iv);
  }, [ended, saveToServer]);

  // ─── LocalStorage backup ──────────────────────────────────

  useEffect(() => {
    localStorage.setItem(`obs_${sessionId}`, JSON.stringify(events));
  }, [events, sessionId]);

  // ─── Izvoz JSON ───────────────────────────────────────────

  const exportJSON = () => {
    const data = {
      sessionId, participantCode, startedAt,
      durationMs: elapsed,
      events: events.map((e) => ({
        type: e.type, timestampMs: e.timestampMs,
        time: formatMs(e.timestampMs),
        kioskStep: e.kioskStep, quote: e.quote,
        theme: e.theme, subtheme: e.subtheme,
      })),
      notes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `obs_${participantCode}_${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ─── Kodiranje teme ───────────────────────────────────────

  const applyTheme = (eventIdx: number, theme: string, subtheme: string) => {
    setEvents((prev) => prev.map((e, i) => i === eventIdx ? { ...e, theme, subtheme, saved: false } : e));
    setCodeMode(null);
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background text-ink overflow-hidden">

      {/* ─── Leva stran — kontekst + vhod ─────────────────── */}
      <div className="w-80 shrink-0 border-r border-ink-ghost flex flex-col bg-background-surface">
        {/* Header */}
        <div className="px-4 py-4 border-b border-ink-ghost">
          <p className="text-xs text-ink-muted uppercase tracking-widest mb-1">Udeleženec</p>
          <p className="text-lg font-bold text-ink">{participantCode}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", ended ? "bg-ink-faint" : "bg-green-400")} />
            <span className="text-3xl font-mono font-bold" style={{ color: ended ? undefined : "#FFB020" }}>
              {formatted}
            </span>
          </div>
        </div>

        {/* Kiosk korak */}
        <div className="px-4 py-4 border-b border-ink-ghost">
          <p className="text-xs text-ink-muted uppercase tracking-wide mb-2">Trenutni korak kioska</p>
          <div className="flex flex-wrap gap-1.5">
            {KIOSK_STEPS.map((s) => (
              <button
                key={s.value}
                onClick={() => setCurrentStep(s.value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                  currentStep === s.value
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : "bg-background-elevated text-ink-muted hover:text-ink border border-transparent",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Citat vhod */}
        <div className="px-4 py-4 border-b border-ink-ghost">
          <p className="text-xs text-ink-muted uppercase tracking-wide mb-2">Citat / opazka</p>
          <textarea
            value={quoteInput}
            onChange={(e) => setQuoteInput(e.target.value)}
            placeholder="Zapiši citat udeleženca ali opazko..."
            rows={3}
            className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-3 py-2 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-ink-muted"
          />
        </div>

        {/* Gumbi za opazke */}
        <div className="px-4 py-3 space-y-1.5 flex-1">
          <p className="text-xs text-ink-muted uppercase tracking-wide mb-2">Zabeleži opazko</p>
          {EVENT_BUTTONS.map(({ type, label, icon: Icon, color, bg }) => (
            <button
              key={type}
              onClick={() => addEvent(type)}
              disabled={ended}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: bg, color, minHeight: 48 }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Opombe in gumbi */}
        <div className="px-4 py-3 border-t border-ink-ghost space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Splošne opombe moderatorja..."
            rows={2}
            className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-3 py-2 text-xs text-ink placeholder-ink-faint resize-none focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => saveToServer()}
              disabled={saving || unsavedCount === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-background-elevated border border-ink-ghost text-ink-muted hover:text-ink disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Shranjujem..." : `Shrani${unsavedCount > 0 ? ` (${unsavedCount})` : ""}`}
            </button>
            {!ended && (
              <button
                onClick={() => saveToServer(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              >
                <Square className="h-3 w-3" />
                Zaključi
              </button>
            )}
            <button
              onClick={exportJSON}
              className="p-2 rounded-xl bg-background-elevated border border-ink-ghost text-ink-muted hover:text-ink"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
          {lastSaved && (
            <p className="text-[10px] text-ink-faint text-center">Shranjeno: {lastSaved.toLocaleTimeString("sl-SI")}</p>
          )}
        </div>
      </div>

      {/* ─── Desna stran — log opazk ───────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-3 border-b border-ink-ghost flex items-center gap-3">
          <p className="text-sm font-medium text-ink">Dnevnik opazovanj</p>
          <span className="text-xs text-ink-muted ml-auto">{events.length} opazk · {events.filter((e) => e.type === "confusion").length} nerazumevanj</span>
        </div>

        <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {events.length === 0 && (
            <div className="flex items-center justify-center h-full text-ink-faint text-sm">
              Pritisni gumb za beleženje prve opazke
            </div>
          )}

          {events.map((e, i) => {
            const color = EVENT_COLORS[e.type as EventType] ?? "#999";
            const btnConfig = EVENT_BUTTONS.find((b) => b.type === e.type);
            const Icon = btnConfig?.icon ?? MessageSquare;

            return (
              <div
                key={i}
                className={cn(
                  "flex gap-3 p-3 rounded-xl border transition-all",
                  !e.saved ? "border-dashed border-ink-ghost opacity-70" : "border-ink-ghost",
                )}
                style={{ backgroundColor: `${color}08` }}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs" style={{ color }}>{formatMs(e.timestampMs)}</span>
                    <span className="text-xs text-ink-muted">{e.kioskStep}</span>
                    {e.theme && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold">{e.theme} › {e.subtheme}</span>
                    )}
                    {!e.saved && <span className="text-[10px] text-ink-faint ml-auto">unsaved</span>}
                  </div>
                  {e.quote && <p className="text-sm text-ink italic">"{e.quote}"</p>}
                </div>

                {/* Kodiranje teme */}
                <button
                  onClick={() => setCodeMode(codeMode === String(i) ? null : String(i))}
                  className="text-ink-faint hover:text-ink shrink-0 px-1"
                  title="Dodeli temo"
                >
                  <span className="text-[10px]">{e.theme ? "✓" : "+"}</span>
                </button>

                {codeMode === String(i) && (
                  <div className="absolute right-16 z-10 bg-background-surface border border-ink-ghost rounded-xl shadow-card p-2 w-64 space-y-1 max-h-48 overflow-y-auto">
                    {PREDEFINED_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => applyTheme(i, t.theme, t.subtheme)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-background-elevated text-xs flex items-center gap-2"
                      >
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-ink-muted">{t.theme} ›</span>
                        <span className="text-ink">{t.subtheme}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Statistike spodaj */}
        {events.length > 0 && (
          <div className="border-t border-ink-ghost px-5 py-3 flex gap-6">
            {EVENT_BUTTONS.map(({ type, color }) => {
              const count = events.filter((e) => e.type === type).length;
              if (count === 0) return null;
              return (
                <div key={type} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-ink-muted capitalize">{type}</span>
                  <span className="font-bold" style={{ color }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}
