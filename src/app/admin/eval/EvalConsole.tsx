"use client";

import { useState, useEffect, useCallback } from "react";
import { FlaskConical, Plus, Download, ExternalLink, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Play } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { cn }      from "@/lib/utils";

// ─── Tipi ──────────────────────────────────────────────────────

type AiModel = "RUNWAY_GEN3" | "KLING_V1" | "KLING_V2" | "LUMA_DREAM" | "PIKA_V2";

interface Session {
  id:          string;
  testSetName: string;
  notes:       string | null;
  createdAt:   string;
  total:       number;
  done:        number;
  error:       number;
  pending:     number;
  totalCost:   number;
}

interface Photo {
  id:            string;
  cloudinaryUrl: string;
  createdAt:     string;
  projectNaziv:  string;
}

interface ProgressResult {
  id:           string;
  model:        string;
  status:       string;
  videoUrl:     string | null;
  latencyMs:    number | null;
  ratingsCount: number;
}

interface EvalConsoleProps {
  initialSessions:  Session[];
  availablePhotos:  Photo[];
}

const MODELS: { value: AiModel; label: string; cost5s: number }[] = [
  { value: "RUNWAY_GEN3", label: "Runway Gen-3 Turbo", cost5s: 0.25 },
  { value: "KLING_V1",    label: "Kling v1",           cost5s: 0.14 },
  { value: "KLING_V2",    label: "Kling v1.5",         cost5s: 0.25 },
  { value: "LUMA_DREAM",  label: "Luma Dream Machine", cost5s: 0.25 },
  { value: "PIKA_V2",     label: "Pika 2.0",           cost5s: 0.13 },
];

const DEFAULT_PROMPTS = [
  "Cinematic portrait animation with dramatic lighting and subtle camera movement",
  "Elegant slow-motion bokeh effect with warm golden hour atmosphere",
  "Dynamic energetic style with colorful particle effects and upbeat movement",
];

// ─── Komponenta ───────────────────────────────────────────────

export function EvalConsole({ initialSessions, availablePhotos }: EvalConsoleProps) {
  const [sessions,    setSessions]   = useState<Session[]>(initialSessions);
  const [showForm,    setShowForm]   = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [progress,    setProgress]   = useState<{ pct: number; done: number; total: number; byModel: Record<string, { done: number; total: number; error: number }>; complete: boolean; totalCost: number } | null>(null);
  const [results,     setResults]    = useState<ProgressResult[]>([]);

  // ─── Forma stanje ─────────────────────────────────────────
  const [formName,    setFormName]   = useState("");
  const [formNotes,   setFormNotes]  = useState("");
  const [selPhotos,   setSelPhotos]  = useState<string[]>([]);
  const [selModels,   setSelModels]  = useState<AiModel[]>(["RUNWAY_GEN3"]);
  const [prompts,     setPrompts]    = useState<string[]>([DEFAULT_PROMPTS[0] ?? ""]);
  const [submitting,  setSubmitting] = useState(false);

  const totalJobs    = selPhotos.length * selModels.length * prompts.length;
  const estimatedCost = selModels.reduce((sum, m) => {
    const model = MODELS.find((x) => x.value === m);
    return sum + (model?.cost5s ?? 0.25) * selPhotos.length * prompts.length;
  }, 0);

  // ─── Polling napredka ─────────────────────────────────────

  const pollProgress = useCallback(async (sessionId: string) => {
    try {
      const res  = await fetch(`/api/eval/sessions/${sessionId}/progress`);
      const data = await res.json() as { success: boolean; progress: typeof progress; results: ProgressResult[] };
      if (data.success) {
        setProgress(data.progress);
        setResults(data.results ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeSession || progress?.complete) return;
    pollProgress(activeSession);
    const interval = setInterval(() => pollProgress(activeSession), 3_000);
    return () => clearInterval(interval);
  }, [activeSession, progress?.complete, pollProgress]);

  // ─── Submit forme ─────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formName || selPhotos.length === 0 || selModels.length === 0 || prompts.length === 0) return;
    setSubmitting(true);
    try {
      const res  = await fetch("/api/eval/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testSetName: formName,
          notes:       formNotes || undefined,
          photoIds:    selPhotos,
          models:      selModels,
          prompts,
          duration:    5,
        }),
      });
      const data = await res.json() as { success: boolean; sessionId?: string };
      if (data.success && data.sessionId) {
        setShowForm(false);
        setActiveSession(data.sessionId);
        setProgress(null);
        setResults([]);
        // Osveži seznam sej
        const sessRes = await fetch("/api/eval/sessions");
        const sessData = await sessRes.json() as { success: boolean; sessions: Session[] };
        if (sessData.success) setSessions(sessData.sessions);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePhoto  = (id: string) => setSelPhotos((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleModel  = (m: AiModel) => setSelModels((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-5 w-5 text-gold" />
            <h1 className="text-2xl font-semibold text-ink">Evalvacija modelov</h1>
          </div>
          <p className="text-ink-muted text-sm">Primerjava I2V modelov — RV1 / T1 evalvacijski protokol</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gold hover:bg-gold-500 text-black font-medium gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova evalvacija
        </Button>
      </div>

      {/* ─── Nova seja — forma ─────────────────────────────── */}
      {showForm && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6 mb-6 space-y-6">
          <h2 className="text-lg font-semibold text-ink">Nova evalvacijska seja</h2>

          {/* Osnovno */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted uppercase tracking-wide">Ime testnega nabora *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="npr. Pilot RV1 — Poroke"
                className="bg-background-elevated border-ink-ghost"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted uppercase tracking-wide">Opombe</label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Kontekst, datum, konfiguracija..."
                className="bg-background-elevated border-ink-ghost"
              />
            </div>
          </div>

          {/* Izbira modelov */}
          <div className="space-y-2">
            <label className="text-xs text-ink-muted uppercase tracking-wide">Modeli za primerjavo</label>
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => toggleModel(m.value)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm border transition-all",
                    selModels.includes(m.value)
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-ink-ghost text-ink-muted hover:border-ink-faint",
                  )}
                >
                  {m.label}
                  <span className="ml-1.5 text-[10px] opacity-60">${m.cost5s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompts */}
          <div className="space-y-2">
            <label className="text-xs text-ink-muted uppercase tracking-wide">Prompts / stili</label>
            {prompts.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={p}
                  onChange={(e) => setPrompts((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                  className="bg-background-elevated border-ink-ghost text-sm"
                  placeholder="Opis stila za AI model..."
                />
                {prompts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPrompts((prev) => prev.filter((_, j) => j !== i))}
                    className="text-ink-faint hover:text-destructive transition-colors px-2"
                  >✕</button>
                )}
              </div>
            ))}
            {prompts.length < 10 && (
              <button
                type="button"
                onClick={() => setPrompts((p) => [...p, ""])}
                className="text-xs text-gold hover:underline"
              >+ Dodaj prompt</button>
            )}
          </div>

          {/* Izbira fotografij */}
          <div className="space-y-2">
            <label className="text-xs text-ink-muted uppercase tracking-wide">
              Fotografije ({selPhotos.length} izbranih)
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
              {availablePhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => togglePhoto(photo.id)}
                  title={photo.projectNaziv}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    selPhotos.includes(photo.id) ? "border-gold" : "border-transparent opacity-60 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${photo.cloudinaryUrl}?w=120&h=120&c=fill`} alt="" className="w-full h-full object-cover" />
                  {selPhotos.includes(photo.id) && (
                    <div className="absolute inset-0 bg-gold/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-gold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Povzetek in strošek */}
          <div className="flex items-center justify-between p-4 bg-background-elevated rounded-xl border border-ink-ghost">
            <div className="text-sm text-ink-muted">
              <span className="text-ink font-medium">{totalJobs}</span> generiranj
              <span className="mx-2">·</span>
              <span className="text-ink font-medium">${estimatedCost.toFixed(2)}</span> ocenjeni strošek
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-ink-muted">
                Prekliči
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || totalJobs === 0 || !formName}
                className="bg-gold hover:bg-gold-500 text-black font-medium gap-2"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Zaganjam...</>
                  : <><Play className="h-4 w-4" /> Zaženi batch</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Napredek aktivne seje ─────────────────────────── */}
      {activeSession && progress && (
        <div className="bg-background-surface border border-gold/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink">Generiranje v teku</h2>
            <span className="text-xs text-ink-muted">{progress.done}/{progress.total} • ${progress.totalCost.toFixed(2)}</span>
          </div>
          {/* Skupna vrstica */}
          <div className="w-full bg-background-elevated rounded-full h-2 mb-4">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%`, backgroundColor: "var(--gold)" }}
            />
          </div>
          {/* Po modelu */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(progress.byModel).map(([model, stats]) => (
              <div key={model} className="bg-background-elevated rounded-xl p-3">
                <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">{model.replace("_", " ")}</p>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-sm font-medium text-ink">{stats.done}</span>
                  {stats.error > 0 && <><XCircle className="h-3.5 w-3.5 text-red-400 ml-1" /><span className="text-sm text-red-400">{stats.error}</span></>}
                  <span className="text-xs text-ink-faint ml-auto">/{stats.total}</span>
                </div>
              </div>
            ))}
          </div>
          {progress.complete && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-ink-ghost">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <span className="text-sm text-ink">Generiranje zaključeno</span>
              <a
                href={`/eval/rate/${activeSession}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-sm text-gold hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Odpri ocenjevanje
              </a>
              <a
                href={`/api/eval/export?sessionId=${activeSession}&format=csv`}
                className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </a>
            </div>
          )}
        </div>
      )}

      {/* ─── Rezultati aktivne seje ────────────────────────── */}
      {results.length > 0 && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-ghost">
            <p className="text-sm font-medium text-ink">Rezultati</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {results.filter((r) => r.videoUrl).map((r) => (
              <div key={r.id} className="bg-background-elevated rounded-xl overflow-hidden border border-ink-ghost">
                <video
                  src={r.videoUrl!}
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="w-full aspect-video object-contain bg-black"
                />
                <div className="p-2">
                  <p className="text-[10px] text-gold font-mono uppercase">{r.model}</p>
                  <p className="text-[10px] text-ink-muted">{r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"} · {r.ratingsCount} ocen</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Seznam sej ────────────────────────────────────── */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-ghost flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Evalvacijske seje</p>
          <p className="text-xs text-ink-muted">{sessions.length} sej</p>
        </div>
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-ink-muted text-sm">
            Še ni evalvacijskih sej. Ustvari prvo.
          </div>
        ) : (
          <div className="divide-y divide-ink-ghost">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onActivate={() => { setActiveSession(s.id); setProgress(null); setResults([]); }}
                active={activeSession === s.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SessionRow ──────────────────────────────────────────────

function SessionRow({ session: s, onActivate, active }: { session: Session; onActivate: () => void; active: boolean }) {
  const [open, setOpen] = useState(false);
  const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;

  return (
    <div className={cn("px-5 py-4 transition-colors", active && "bg-gold/5")}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink truncate">{s.testSetName}</p>
            {s.pending > 0 && <Loader2 className="h-3.5 w-3.5 text-gold animate-spin shrink-0" />}
            {s.pending === 0 && s.error === 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {new Date(s.createdAt).toLocaleDateString("sl-SI")} ·
            {s.done}/{s.total} generiranj ·
            ${s.totalCost.toFixed(2)}
          </p>
          {s.total > 0 && (
            <div className="w-32 bg-background-elevated rounded-full h-1 mt-2">
              <div className="h-1 rounded-full bg-gold" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button onClick={onActivate} className="text-xs text-gold hover:underline">Napredek</button>
          <a
            href={`/eval/rate/${s.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Ocenjevanje
          </a>
          <a
            href={`/api/eval/export?sessionId=${s.id}&format=csv`}
            className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            CSV
          </a>
          <button onClick={() => setOpen(!open)} className="text-ink-faint hover:text-ink">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && s.notes && (
        <p className="text-xs text-ink-muted mt-3 pt-3 border-t border-ink-ghost">{s.notes}</p>
      )}
    </div>
  );
}
