"use client";

import { useState, useEffect, useCallback } from "react";
import { GitCompare, Plus, Download, ExternalLink, CheckCircle2, Loader2, TrendingUp, Play } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { cn }      from "@/lib/utils";
import { GENERIC_PROMPTS } from "@/lib/eval/generic-prompts";

// ─── Tipi ──────────────────────────────────────────────────────

type Model = "RUNWAY_GEN3" | "KLING_V1" | "KLING_V2" | "LUMA_DREAM" | "PIKA_V2";

interface Comparison {
  id:             string;
  name:           string;
  model:          string;
  notes:          string | null;
  createdAt:      string;
  totalPairs:     number;
  contextualDone: number;
  genericDone:    number;
  totalRatings:   number;
}

interface Photo {
  id:            string;
  cloudinaryUrl: string;
  projectNaziv:  string;
}

interface StatsResult {
  n:            number;
  means:        { contextual: number; generic: number };
  mannWhitneyU: { U: number; z: number; p: number; significant: boolean; interpretation: string } | null;
  wilcoxon:     { W: number; z: number; p: number; significant: boolean; interpretation: string } | null;
  preferences:  { contextualCount: number; genericCount: number; equalCount: number; contextualPct: number; p: number; significant: boolean; interpretation: string };
}

interface ProgressData {
  totalPairs:   number;
  readyPairs:   number;
  complete:     boolean;
  contextual:   { done: number; pct: number };
  generic:      { done: number; pct: number };
  totalCost:    number;
  ratingsCount: number;
}

interface ComparisonConsoleProps {
  initialComparisons: Comparison[];
  availablePhotos:    Photo[];
}

const MODELS: { value: Model; label: string }[] = [
  { value: "RUNWAY_GEN3", label: "Runway Gen-3 Turbo" },
  { value: "KLING_V1",    label: "Kling v1" },
  { value: "KLING_V2",    label: "Kling v1.5" },
  { value: "LUMA_DREAM",  label: "Luma Dream Machine" },
  { value: "PIKA_V2",     label: "Pika 2.0" },
];

// ─── Komponenta ───────────────────────────────────────────────

export function ComparisonConsole({ initialComparisons, availablePhotos }: ComparisonConsoleProps) {
  const [comparisons,  setComparisons]  = useState<Comparison[]>(initialComparisons);
  const [showForm,     setShowForm]     = useState(false);
  const [activeId,     setActiveId]     = useState<string | null>(null);
  const [progress,     setProgress]     = useState<ProgressData | null>(null);
  const [stats,        setStats]        = useState<StatsResult | null>(null);

  const [formName,    setFormName]   = useState("");
  const [formNotes,   setFormNotes]  = useState("");
  const [selModel,    setSelModel]   = useState<Model>("RUNWAY_GEN3");
  const [selPhotos,   setSelPhotos]  = useState<string[]>([]);
  const [submitting,  setSubmitting] = useState(false);

  const estimatedVideos = selPhotos.length * 10; // 5 pari × 2 videa
  const estimatedCost   = selPhotos.length * 5 * 0.25 * 2; // rough estimate

  const pollProgress = useCallback(async (id: string) => {
    const res  = await fetch(`/api/eval/prompt-comparison/${id}`);
    const data = await res.json() as { success: boolean; progress: ProgressData; stats: StatsResult | null };
    if (data.success) {
      setProgress(data.progress);
      setStats(data.stats);
    }
  }, []);

  useEffect(() => {
    if (!activeId || progress?.complete) return;
    pollProgress(activeId);
    const iv = setInterval(() => pollProgress(activeId), 4_000);
    return () => clearInterval(iv);
  }, [activeId, progress?.complete, pollProgress]);

  const handleSubmit = async () => {
    if (!formName || selPhotos.length === 0) return;
    setSubmitting(true);
    try {
      const res  = await fetch("/api/eval/prompt-comparison", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, model: selModel, notes: formNotes || undefined, photoIds: selPhotos, duration: 5 }),
      });
      const data = await res.json() as { success: boolean; comparisonId?: string };
      if (data.success && data.comparisonId) {
        setShowForm(false);
        setActiveId(data.comparisonId);
        setProgress(null);
        setStats(null);
        const list = await (await fetch("/api/eval/prompt-comparison")).json() as { success: boolean; comparisons: Comparison[] };
        if (list.success) setComparisons(list.comparisons);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePhoto = (id: string) =>
    setSelPhotos((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCompare className="h-5 w-5 text-gold" />
            <h1 className="text-2xl font-semibold text-ink">Primerjava promptov — T2</h1>
          </div>
          <p className="text-ink-muted text-sm">Kontekstualni (GPT-4o) vs. generični prompti · Wilcoxon Signed-Rank</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-gold hover:bg-gold-500 text-black font-medium gap-2">
          <Plus className="h-4 w-4" />Nova primerjava
        </Button>
      </div>

      {/* ─── Forma ────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6 mb-6 space-y-5">
          <h2 className="text-base font-semibold text-ink">Nova primerjava T2</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted uppercase tracking-wide">Ime *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="npr. T2 Poroke — Runway" className="bg-background-elevated border-ink-ghost" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted uppercase tracking-wide">Opombe</label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Kontekst..." className="bg-background-elevated border-ink-ghost" />
            </div>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-xs text-ink-muted uppercase tracking-wide">Model (fiksni za primerjavo)</label>
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button key={m.value} type="button" onClick={() => setSelModel(m.value)}
                  className={cn("px-3 py-2 rounded-xl text-sm border transition-all",
                    selModel === m.value ? "border-gold bg-gold/10 text-gold" : "border-ink-ghost text-ink-muted hover:border-ink-faint")}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generični stili — prikaz */}
          <div className="p-4 rounded-xl bg-background-elevated border border-ink-ghost">
            <p className="text-xs text-ink-muted uppercase tracking-wide mb-2">5 generičnih stilov (fiksni)</p>
            <div className="flex flex-wrap gap-1.5">
              {GENERIC_PROMPTS.map((g) => (
                <span key={g.id} className="px-2.5 py-1 rounded-full text-xs bg-background-surface border border-ink-ghost text-ink-muted">{g.name}</span>
              ))}
            </div>
          </div>

          {/* Fotografije */}
          <div className="space-y-2">
            <label className="text-xs text-ink-muted uppercase tracking-wide">Fotografije ({selPhotos.length} izbranih · priporočenih 10)</label>
            <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
              {availablePhotos.map((p) => (
                <button key={p.id} type="button" onClick={() => togglePhoto(p.id)} title={p.projectNaziv}
                  className={cn("relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    selPhotos.includes(p.id) ? "border-gold" : "border-transparent opacity-60 hover:opacity-100")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${p.cloudinaryUrl}?w=96&h=96&c=fill`} alt="" className="w-full h-full object-cover" />
                  {selPhotos.includes(p.id) && (
                    <div className="absolute inset-0 bg-gold/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-gold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-background-elevated rounded-xl border border-ink-ghost">
            <p className="text-sm text-ink-muted">
              <span className="text-ink font-medium">{estimatedVideos}</span> videov ·
              <span className="text-ink font-medium ml-1.5">~${estimatedCost.toFixed(0)}</span> strošek
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-ink-muted">Prekliči</Button>
              <Button onClick={handleSubmit} disabled={submitting || !formName || selPhotos.length === 0}
                className="bg-gold hover:bg-gold-500 text-black font-medium gap-2">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Zaganjam...</> : <><Play className="h-4 w-4" />Zaženi</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Napredek aktivne primerjave ──────────────────────── */}
      {activeId && progress && (
        <div className="bg-background-surface border border-gold/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-ink">Generiranje v teku</p>
            <p className="text-xs text-ink-muted">{progress.readyPairs}/{progress.totalPairs} parov · ${progress.totalCost.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {(["contextual", "generic"] as const).map((type) => {
              const d = progress[type];
              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">{type === "contextual" ? "Kontekstualni (GPT-4o)" : "Generični"}</span>
                    <span className="text-ink">{d.done}/{progress.totalPairs}</span>
                  </div>
                  <div className="h-2 rounded-full bg-background-elevated">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: type === "contextual" ? "#FFB020" : "#6B7280" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {progress.complete && (
            <div className="flex items-center gap-3 pt-4 border-t border-ink-ghost">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-ink">Generiranje zaključeno · {progress.ratingsCount} ocen</span>
              <a href={`/eval/blind-compare/${activeId}`} target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-sm text-gold hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />Odpri ocenjevanje
              </a>
              <a href={`/api/eval/prompt-comparison?export=${activeId}`}
                className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
                <Download className="h-3.5 w-3.5" />CSV
              </a>
            </div>
          )}
        </div>
      )}

      {/* ─── Statistika ───────────────────────────────────────── */}
      {stats && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-gold" />
            <p className="text-sm font-medium text-ink">Statistična analiza ({stats.n} ocen)</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatBox label="Kontekstualni M̄" value={stats.means.contextual.toFixed(2)} unit="/ 5" color="gold" />
            <StatBox label="Generični M̄"     value={stats.means.generic.toFixed(2)}    unit="/ 5" color="gray" />
            <StatBox label="Preferenca" value={`${Math.round(stats.preferences.contextualPct * 100)}%`} unit="kontekst." color={stats.preferences.significant ? "gold" : "gray"} />
          </div>
          {stats.wilcoxon && (
            <div className="p-3 rounded-xl bg-background-elevated border border-ink-ghost text-xs">
              <p className="text-ink-muted mb-1">Wilcoxon Signed-Rank (parjeni podatki)</p>
              <p className={cn("font-medium", stats.wilcoxon.significant ? "text-green-400" : "text-ink-muted")}>
                {stats.wilcoxon.interpretation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Seznam primerjav ─────────────────────────────────── */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-ghost flex items-center justify-between">
          <p className="text-sm font-medium text-ink">T2 Primerjave</p>
          <p className="text-xs text-ink-muted">{comparisons.length} sej</p>
        </div>
        {comparisons.length === 0 ? (
          <div className="py-12 text-center text-ink-muted text-sm">Še ni primerjav.</div>
        ) : (
          <div className="divide-y divide-ink-ghost">
            {comparisons.map((c) => (
              <div key={c.id} className={cn("px-5 py-4 flex items-center justify-between", activeId === c.id && "bg-gold/5")}>
                <div>
                  <p className="text-sm font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {c.model.replace("_", " ")} · {c.totalPairs} parov · {c.totalRatings} ocen
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { setActiveId(c.id); setProgress(null); setStats(null); }}
                    className="text-xs text-gold hover:underline">Napredek</button>
                  <a href={`/eval/blind-compare/${c.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-ink-muted hover:text-ink flex items-center gap-0.5">
                    <ExternalLink className="h-3 w-3" />Ocenjevanje
                  </a>
                  <a href={`/api/eval/prompt-comparison?export=${c.id}`}
                    className="text-xs text-ink-muted hover:text-ink flex items-center gap-0.5">
                    <Download className="h-3 w-3" />CSV
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: "gold" | "gray" }) {
  return (
    <div className="p-3 bg-background-elevated rounded-xl border border-ink-ghost text-center">
      <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">{label}</p>
      <p className={cn("text-xl font-bold", color === "gold" ? "text-gold" : "text-ink")}>{value}</p>
      <p className="text-[10px] text-ink-faint">{unit}</p>
    </div>
  );
}
