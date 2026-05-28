"use client";

import { useState } from "react";
import Link         from "next/link";
import { Eye, MessageCircle, Plus, Download, AlertTriangle, ThumbsUp, XCircle, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { interpretSUS } from "@/lib/ux/sus-scoring";

interface Session {
  id:              string;
  participantCode: string;
  startedAt:       string;
  durationMs:      number | null;
  eventCount:      number;
  confusionCount:  number;
  errorCount:      number;
  positiveCount:   number;
  hasInterview:    boolean;
  wouldWatchAgain: number | null;
  waitingFeelings: number | null;
  videoQuality:    number | null;
  susScore:        number | null;
  susGrade:        string | null;
  participantAge:  number | null;
  techExperience:  string | null;
}

interface UXDashboardClientProps {
  sessions:          Session[];
  avgSUS:            number | null;
  totalSUSResponses: number;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string | undefined }) {
  return (
    <div className="bg-background-surface border border-ink-ghost rounded-2xl p-5">
      <p className="text-xs text-ink-muted uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color: color ?? undefined }}>{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function UXDashboardClient({ sessions, avgSUS, totalSUSResponses }: UXDashboardClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newCode,    setNewCode]    = useState("");
  const [creating,   setCreating]   = useState(false);

  const confTotal = sessions.reduce((s, r) => s + r.confusionCount, 0);
  const confAvg   = sessions.length > 0 ? (confTotal / sessions.length).toFixed(1) : "—";
  const durations = sessions.filter((s) => s.durationMs).map((s) => s.durationMs!);
  const avgDurMs  = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const interp    = avgSUS ? interpretSUS(avgSUS) : null;

  const createSession = async () => {
    if (!newCode.trim()) return;
    setCreating(true);
    try {
      const res  = await fetch("/api/ux-study/observations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantCode: newCode.trim() }),
      });
      const data = await res.json() as { success: boolean; sessionId?: string };
      if (data.success && data.sessionId) {
        window.location.href = `/admin/ux-study/session/${data.sessionId}/observe`;
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">UX Study Dashboard</h1>
          <p className="text-ink-muted text-sm mt-0.5">Glasno razmišljanje · Intervjuji · SUS</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold hover:bg-gold-500 text-black font-medium text-sm gap-2"
          >
            <Plus className="h-4 w-4" />Nova seja
          </button>
          <a href="/api/ux-study/observations?format=regression-csv">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-ghost text-ink-muted hover:text-ink text-sm">
              <Download className="h-4 w-4" />Regresija CSV
            </button>
          </a>
          <a href="/api/ux-study/observations?format=atlas">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-ghost text-ink-muted hover:text-ink text-sm">
              <Download className="h-4 w-4" />Atlas.ti JSON
            </button>
          </a>
          <Link href="/admin/ux-study/regression">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 text-sm">
              <TrendingUp className="h-4 w-4" />Regresija T4
            </button>
          </Link>
        </div>
      </div>

      {/* Nova seja */}
      {showCreate && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl p-5 flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-ink-muted uppercase tracking-wide">Koda udeleženca</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="npr. P01, P02..."
              onKeyDown={(e) => e.key === "Enter" && createSession()}
              className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-ink-muted"
            />
          </div>
          <button
            onClick={createSession}
            disabled={creating || !newCode.trim()}
            className="px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-500 text-black font-medium text-sm disabled:opacity-40"
          >
            {creating ? "Ustvarjam..." : "Začni opazovanje"}
          </button>
        </div>
      )}

      {/* Statistike */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Opazovalne seje" value={sessions.length} sub="skupaj" />
        <StatCard
          label="Povprečni SUS"
          value={avgSUS ? avgSUS.toFixed(1) : "—"}
          sub={interp?.grade ?? `${totalSUSResponses} odgovorov`}
          color={interp?.color}
        />
        <StatCard label="Avg. zmede/sejo" value={confAvg} sub="točke nerazumevanja" color={Number(confAvg) > 3 ? "#f97316" : undefined} />
        <StatCard label="Avg. čas seje" value={formatDuration(avgDurMs)} sub="min:sec" />
      </div>

      {/* Tabela sej */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-ghost">
          <p className="text-sm font-medium text-ink">Vse seje</p>
        </div>

        {sessions.length === 0 ? (
          <div className="py-12 text-center text-ink-muted text-sm">
            Še ni opazovalnih sej. Ustvari prvo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-ghost">
                  {["Udel.", "Datum", "Trajanje", "Zmede", "Napake", "+", "SUS", "WA", "Intervju", "Akcije"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-ink-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-ghost">
                {sessions.map((s) => {
                  const susInterp = s.susScore ? interpretSUS(s.susScore) : null;
                  return (
                    <tr key={s.id} className="hover:bg-background-elevated transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{s.participantCode}</td>
                      <td className="px-4 py-3 text-ink-muted text-xs">
                        {new Date(s.startedAt).toLocaleDateString("sl-SI")}
                      </td>
                      <td className="px-4 py-3 text-ink-muted font-mono text-xs">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(s.durationMs)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("flex items-center gap-1 text-xs font-semibold", s.confusionCount > 3 ? "text-orange-400" : "text-ink-muted")}>
                          <AlertTriangle className="h-3 w-3" />{s.confusionCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("flex items-center gap-1 text-xs font-semibold", s.errorCount > 0 ? "text-red-400" : "text-ink-muted")}>
                          <XCircle className="h-3 w-3" />{s.errorCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                          <ThumbsUp className="h-3 w-3" />{s.positiveCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.susScore !== null ? (
                          <span className="font-semibold text-sm" style={{ color: susInterp?.color }}>
                            {s.susScore.toFixed(0)}
                          </span>
                        ) : <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-muted text-xs">
                        {s.wouldWatchAgain !== null ? `${s.wouldWatchAgain}/7` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn("h-2 w-2 rounded-full", s.hasInterview ? "bg-green-400" : "bg-ink-faint")} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/ux-study/session/${s.id}/observe`}
                            className="p-1.5 rounded-lg hover:bg-background-elevated text-ink-muted hover:text-gold transition-colors"
                            title="Konzola opazovanja"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/ux-study/session/${s.id}/interview`}
                            className="p-1.5 rounded-lg hover:bg-background-elevated text-ink-muted hover:text-gold transition-colors"
                            title="Intervju"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Regresijska opomba */}
      {sessions.length >= 5 && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl p-5">
          <p className="text-sm font-medium text-ink mb-2">Regresijska analiza (R)</p>
          <p className="text-xs text-ink-muted mb-3">Prenesi CSV in uvozi v R za analizo vpliva demografskih faktorjev na SUS score:</p>
          <code className="block text-xs bg-background-elevated rounded-xl p-3 text-ink font-mono whitespace-pre-wrap">
            {`df <- read.csv("regression_export.csv")
model <- lm(sus_score ~ age + tech_experience + confusion_count + duration_s, data=df)
summary(model)`}
          </code>
        </div>
      )}
    </div>
  );
}
