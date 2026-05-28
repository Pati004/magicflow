"use client";

import { useState } from "react";
import { Download, Users, Plus, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { cn }     from "@/lib/utils";
import type { SUSStats } from "@/lib/ux/sus-scoring";
import { interpretSUS } from "@/lib/ux/sus-scoring";

// ─── Tipi ──────────────────────────────────────────────────────

interface Response {
  id:             string;
  score:          number;
  grade:          string;
  participantAge: number | null;
  techExperience: string | null;
  answers:        number[];
  sessionLabel:   string;
  createdAt:      string;
}

interface Session {
  id:        string;
  label:     string;
  used:      boolean;
  expiresAt: string;
  createdAt: string;
}

interface UXResultsClientProps {
  responses: Response[];
  sessions:  Session[];
  stats:     SUSStats | null;
}

// ─── SVG Gauge ───────────────────────────────────────────────

function SUSGauge({ score, color }: { score: number; color: string }) {
  const R    = 80;
  const cx   = 100;
  const cy   = 100;
  const startAngle = -210; // -210° od desne
  const totalArc   = 240;  // skupni lok 240°
  const pct        = Math.min(score / 100, 1);
  const angle      = startAngle + totalArc * pct;

  const toRad    = (deg: number) => (deg * Math.PI) / 180;
  const arcStart = { x: cx + R * Math.cos(toRad(startAngle)), y: cy + R * Math.sin(toRad(startAngle)) };
  const arcEnd   = { x: cx + R * Math.cos(toRad(angle)),      y: cy + R * Math.sin(toRad(angle)) };
  const fullEnd  = { x: cx + R * Math.cos(toRad(startAngle + totalArc)), y: cy + R * Math.sin(toRad(startAngle + totalArc)) };
  const largeArc = totalArc * pct > 180 ? 1 : 0;

  return (
    <svg viewBox="0 0 200 160" className="w-48 mx-auto">
      {/* Ozadje loka */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 1 1 ${fullEnd.x} ${fullEnd.y}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} strokeLinecap="round"
      />
      {/* Vrednost loka */}
      {score > 0 && (
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      )}
      {/* Score besedilo */}
      <text x={cx} y={cy + 10} textAnchor="middle" className="text-4xl font-bold" fill="white" fontSize={36} fontWeight="700">
        {score.toFixed(0)}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={11}>
        / 100
      </text>
      {/* Oznake */}
      <text x={arcStart.x - 4} y={arcStart.y + 4} fill="rgba(255,255,255,0.25)" fontSize={10} textAnchor="end">0</text>
      <text x={fullEnd.x + 4}  y={fullEnd.y + 4}  fill="rgba(255,255,255,0.25)" fontSize={10}>100</text>
    </svg>
  );
}

// ─── Histogram ────────────────────────────────────────────────

function ScoreHistogram({ distribution }: { distribution: SUSStats["distribution"] }) {
  const max = Math.max(...distribution.map((d) => d.count), 1);
  const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

  return (
    <div className="space-y-2">
      {distribution.map((d, i) => (
        <div key={d.range} className="flex items-center gap-3">
          <span className="text-xs text-white/40 w-20 shrink-0">{d.range}</span>
          <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: colors[i] ?? "#fff", minWidth: d.count > 0 ? "2rem" : 0 }}
            >
              {d.count > 0 && <span className="text-[10px] font-bold text-black">{d.count}</span>}
            </div>
          </div>
          <span className="text-xs text-white/40 w-10 text-right shrink-0">{d.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Generiranje novih sej ────────────────────────────────────

function CreateSessionsForm({ onCreated }: { onCreated: (links: LinkResult[]) => void }) {
  const [label,    setLabel]    = useState("");
  const [count,    setCount]    = useState("10");
  const [ttl,      setTtl]      = useState("14");
  const [loading,  setLoading]  = useState(false);
  const [newLinks, setNewLinks] = useState<LinkResult[] | null>(null);

  const handleCreate = async () => {
    if (!label || loading) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/ux-study/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, count: parseInt(count), ttlDays: parseInt(ttl) }),
      });
      const data = await res.json() as { success: boolean; links?: LinkResult[] };
      if (data.success && data.links) {
        setNewLinks(data.links);
        onCreated(data.links);
      }
    } finally {
      setLoading(false);
    }
  };

  if (newLinks) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-green-400">✓ Ustvarjenih {newLinks.length} enolično povabil</p>
        <div className="max-h-48 overflow-y-auto space-y-1.5">
          {newLinks.map((l) => (
            <div key={l.sessionId} className="flex items-center gap-2 bg-white/4 rounded-xl px-3 py-2">
              <span className="text-xs text-white/40 flex-1 truncate font-mono">{l.link}</span>
              <a href={l.link} target="_blank" rel="noopener noreferrer" className="text-gold shrink-0">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
        <a href="/api/ux-study/sessions?format=csv" className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-gold">
          <Download className="h-3.5 w-3.5" />Prenesi vse linke (CSV)
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 space-y-1.5">
          <label className="text-xs text-ink-muted uppercase tracking-wide">Oznaka serije</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="npr. Batch 1 — Operator testi" className="bg-background-elevated border-ink-ghost" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-ink-muted uppercase tracking-wide">Število</label>
          <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} min="1" max="200" className="bg-background-elevated border-ink-ghost" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-ink-muted uppercase tracking-wide">Veljavnost (dni)</label>
          <Input type="number" value={ttl} onChange={(e) => setTtl(e.target.value)} min="1" max="90" className="bg-background-elevated border-ink-ghost" />
        </div>
        <div className="flex items-end">
          <Button onClick={handleCreate} disabled={!label || loading} className="w-full bg-gold hover:bg-gold-500 text-black font-medium gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ustvari
          </Button>
        </div>
      </div>
    </div>
  );
}

interface LinkResult { sessionId: string; label: string; link: string; expiresAt: string }

// ─── Glavna komponenta ────────────────────────────────────────

export function UXResultsClient({ responses, sessions, stats }: UXResultsClientProps) {
  const [ageFilter,  setAgeFilter]  = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = responses.filter((r) => {
    if (ageFilter !== "all") {
      const age = r.participantAge ?? 0;
      if (ageFilter === "18-35" && !(age >= 18 && age <= 35)) return false;
      if (ageFilter === "36-55" && !(age >= 36 && age <= 55)) return false;
      if (ageFilter === "56+"   && !(age > 55))                return false;
    }
    if (techFilter !== "all" && r.techExperience !== techFilter) return false;
    return true;
  });

  const filteredScores = filtered.map((r) => r.score);
  const filteredStats  = filteredScores.length > 0
    ? { mean: filteredScores.reduce((a, b) => a + b, 0) / filteredScores.length }
    : null;

  const interp = stats ? interpretSUS(stats.mean) : null;

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">SUS Rezultati — T3</h1>
          <p className="text-ink-muted text-sm mt-0.5">System Usability Scale · Brooke (1996)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-gold hover:bg-gold-500 text-black font-medium gap-2">
            <Plus className="h-4 w-4" />Nova povabila
          </Button>
          <a href="/api/ux-study/sessions?format=csv">
            <Button variant="outline" className="border-ink-ghost text-ink-muted gap-1.5">
              <Download className="h-4 w-4" />CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Ustvari povabila */}
      {showCreate && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl p-5">
          <h2 className="text-sm font-medium text-ink mb-4">Generiraj enkratne SUS linke</h2>
          <CreateSessionsForm onCreated={() => setShowCreate(false)} />
        </div>
      )}

      {/* Gauge + stats */}
      {stats && interp ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gauge */}
          <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6 flex flex-col items-center gap-3">
            <SUSGauge score={stats.mean} color={interp.color} />
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: interp.color }}>{interp.grade}</p>
              <p className="text-xs text-ink-muted mt-0.5">{interp.adjective}</p>
            </div>
            <div className="flex gap-4 text-center pt-2 border-t border-ink-ghost w-full">
              <div className="flex-1"><p className="text-[10px] text-ink-muted">n</p><p className="font-semibold text-ink">{stats.n}</p></div>
              <div className="flex-1"><p className="text-[10px] text-ink-muted">SD</p><p className="font-semibold text-ink">{stats.std}</p></div>
              <div className="flex-1"><p className="text-[10px] text-ink-muted">95% CI</p><p className="font-semibold text-ink text-xs">[{stats.ci95[0]}, {stats.ci95[1]}]</p></div>
            </div>
          </div>

          {/* Histogram */}
          <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6">
            <p className="text-sm font-medium text-ink mb-4">Porazdelitev ocen</p>
            <ScoreHistogram distribution={stats.distribution} />
            <div className="mt-4 flex justify-between text-xs text-ink-muted">
              <span>Min: {stats.min}</span>
              <span>Median: {stats.median}</span>
              <span>Max: {stats.max}</span>
            </div>
          </div>

          {/* Interpretacija */}
          <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6 space-y-4">
            <p className="text-sm font-medium text-ink">Interpretacija</p>
            <p className="text-sm text-ink-muted leading-relaxed">{interp.description}</p>
            <div className="space-y-2">
              {[
                { range: "> 90",  label: "Odlično",      color: "#22c55e" },
                { range: "80–90", label: "Dobro",         color: "#84cc16" },
                { range: "68–80", label: "Sprejemljivo",  color: "#eab308" },
                { range: "51–68", label: "Marginalno",    color: "#f97316" },
                { range: "< 51",  label: "Nesprejmljivo", color: "#ef4444" },
              ].map((b) => (
                <div key={b.range} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <span className="text-ink-muted w-12">{b.range}</span>
                  <span className="text-ink">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl p-12 text-center text-ink-muted">
          <Users className="h-10 w-10 mx-auto mb-3 text-ink-faint" />
          <p>Še ni odgovorov. Ustvari povabila in pošlji udeležencem.</p>
        </div>
      )}

      {/* Filtri + tabela */}
      {responses.length > 0 && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-ghost flex items-center gap-4 flex-wrap">
            <p className="text-sm font-medium text-ink mr-auto">Individualni odgovori</p>
            {/* Filtri */}
            <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}
              className="text-xs bg-background-elevated border border-ink-ghost rounded-lg px-3 py-1.5 text-ink-muted">
              <option value="all">Vse starosti</option>
              <option value="18-35">18–35</option>
              <option value="36-55">36–55</option>
              <option value="56+">56+</option>
            </select>
            <select value={techFilter} onChange={(e) => setTechFilter(e.target.value)}
              className="text-xs bg-background-elevated border border-ink-ghost rounded-lg px-3 py-1.5 text-ink-muted">
              <option value="all">Vse izkušnje</option>
              <option value="nizka">Nizka</option>
              <option value="srednja">Srednja</option>
              <option value="visoka">Visoka</option>
            </select>
            {filteredStats && (
              <span className="text-xs text-ink-muted">
                Filtrirano: {filtered.length} · M̄ = {filteredStats.mean.toFixed(1)}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-ghost">
                  {["Seja", "Score", "Ocena", "Starost", "Izkušnje", "Datum"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-ink-muted font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-ghost">
                {filtered.map((r) => {
                  const interp = interpretSUS(r.score);
                  return (
                    <tr key={r.id} className="hover:bg-background-elevated transition-colors">
                      <td className="px-4 py-3 text-ink-muted text-xs">{r.sessionLabel}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: interp.color }}>{r.score.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${interp.color}20`, color: interp.color }}>{r.grade}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{r.participantAge ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-muted capitalize">{r.techExperience ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-muted text-xs">{new Date(r.createdAt).toLocaleDateString("sl-SI")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seje / povabila */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-ghost flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Posredovana povabila</p>
          <p className="text-xs text-ink-muted">{sessions.length} sej · {sessions.filter((s) => s.used).length} izpolnjenih</p>
        </div>
        <div className="divide-y divide-ink-ghost">
          {sessions.slice(0, 20).map((s) => (
            <div key={s.id} className="px-5 py-3 flex items-center gap-3">
              <div className={cn("h-2 w-2 rounded-full shrink-0", s.used ? "bg-green-400" : "bg-ink-faint")} />
              <p className="text-sm text-ink flex-1">{s.label}</p>
              <p className="text-xs text-ink-muted">{s.used ? "Izpolnjeno" : `Poteče ${new Date(s.expiresAt).toLocaleDateString("sl-SI")}`}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
