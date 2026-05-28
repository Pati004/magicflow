"use client";

import { Download, Info } from "lucide-react";
import { cn }             from "@/lib/utils";
import type { OLSResult, CorrelationResult } from "@/lib/ux/simple-ols";
import type { RegressionRow }                from "@/lib/ux/regression-data";

// ─── Props ────────────────────────────────────────────────────

interface Props {
  rows:         RegressionRow[];
  corr:         CorrelationResult | null;
  ols:          OLSResult | null;
  descStats:    Record<string, { n: number; mean: number; sd: number; min: number; max: number }>;
  warning:      string | null;
  generatedAt:  string;
}

// ─── Pomožne komponente ───────────────────────────────────────

function pLabel(p: number): string {
  if (p < 0.001) return "***";
  if (p < 0.01)  return "**";
  if (p < 0.05)  return "*";
  if (p < 0.10)  return "†";
  return "";
}

function pColor(p: number): string {
  if (p < 0.05) return "#22c55e";
  if (p < 0.10) return "#eab308";
  return "#6b7280";
}

/** Barvna kodiranje korelacij: modra=pozitivna, rdeča=negativna */
function corrColor(r: number): string {
  const a = Math.abs(r);
  if (r > 0) {
    const g = Math.round(87  + (1 - a) * 168);
    const b = Math.round(255 - (1 - a) * 105);
    return `rgb(59,${g},${b})`;
  } else {
    const g = Math.round(68  + (1 - a) * 187);
    return `rgb(${Math.round(239 - (1 - a) * 80)},${g},68)`;
  }
}

// ─── Korelacijska matrika ─────────────────────────────────────

function CorrelationMatrix({ corr }: { corr: CorrelationResult }) {
  const vars     = corr.variables;
  const LABELS: Record<string, string> = {
    overallSatisfaction: "Zadovoljstvo",
    latencyMin:          "Latenca (min)",
    susScore:            "SUS",
    confusionCount:      "Zmede",
    errorCount:          "Napake",
    waitingFeelings:     "Čakanje",
    videoQuality:        "Kakovost videa",
    interfaceRating:     "Vmesnik",
    techLevel:           "Tehn. izkušenost",
    ageGroup:            "Starostna skupina",
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-1 text-ink-muted text-right min-w-[120px]" />
            {vars.map((v) => (
              <th key={v} className="px-2 py-1 text-ink-muted font-medium text-center min-w-[80px]">
                {LABELS[v] ?? v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vars.map((vi, i) => (
            <tr key={vi}>
              <td className="px-2 py-1 text-ink-muted text-right font-medium whitespace-nowrap">
                {LABELS[vi] ?? vi}
              </td>
              {vars.map((vj, j) => {
                const r = corr.matrix[i]![j]!;
                const p = corr.pMatrix[i]![j]!;
                const isDiag = i === j;
                return (
                  <td
                    key={vj}
                    className="px-2 py-1 text-center rounded font-mono"
                    style={{
                      backgroundColor: isDiag ? "#1f2937" : corrColor(r) + "44",
                      color: isDiag ? "#6b7280" : corrColor(r),
                      fontWeight: Math.abs(r) > 0.5 && !isDiag ? 700 : 400,
                    }}
                    title={`r=${r.toFixed(3)}, p=${p.toFixed(3)}`}
                  >
                    {isDiag ? "─" : (
                      <span>
                        {r.toFixed(2)}
                        <sup className="ml-0.5 text-[9px] opacity-80">{pLabel(p)}</sup>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-ink-muted">
        *** p&lt;0.001 &nbsp;** p&lt;0.01 &nbsp;* p&lt;0.05 &nbsp;† p&lt;0.10
      </p>
    </div>
  );
}

// ─── OLS tabela ───────────────────────────────────────────────

const VAR_LABELS: Record<string, string> = {
  "(Intercept)":       "Konstanta (β₀)",
  latencyMin:          "Latenca generiranja (min)",
  susScore:            "SUS score",
  confusionCount:      "Število zaznav zmede",
  errorCount:          "Število napak",
  waitingFeelings:     "Zaznano čakanje (1–7)",
  videoQuality:        "Kakovost videa (1–7)",
  interfaceRating:     "Intuitivnost vmesnika (1–7)",
  ageGroup:            "Starostna skupina (1–3)",
  techLevel:           "Tehnična izkušenost (1–3)",
};

function OLSTable({ ols }: { ols: OLSResult }) {
  const allNames = ["(Intercept)", ...ols.variableNames];

  return (
    <div className="space-y-4">
      {/* Fit statistics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "R²",            value: ols.rSquared.toFixed(3) },
          { label: "Adj. R²",       value: ols.adjRSquared.toFixed(3) },
          { label: "n",             value: String(ols.n) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-background-elevated rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-ink-muted uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-ink mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Koeficienti */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-ghost">
              {["Spremenljivka", "β", "SE", "t", "p", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs text-ink-muted font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-ghost">
            {allNames.map((name, i) => {
              const b  = ols.coefficients[i]!;
              const se = ols.stdErrors[i]!;
              const t  = ols.tStats[i]!;
              const p  = ols.pValues[i]!;
              const isLatency = name === "latencyMin";
              return (
                <tr
                  key={name}
                  className={cn(
                    "hover:bg-background-elevated transition-colors",
                    isLatency && "bg-background-elevated/50",
                  )}
                >
                  <td className="px-3 py-2 font-medium text-ink flex items-center gap-1.5">
                    {isLatency && (
                      <span className="inline-block h-2 w-2 rounded-full bg-gold shrink-0" />
                    )}
                    {VAR_LABELS[name] ?? name}
                  </td>
                  <td className="px-3 py-2 font-mono text-ink tabular-nums">
                    {b >= 0 ? "+" : ""}{b.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 font-mono text-ink-muted tabular-nums">
                    {se.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 font-mono text-ink-muted tabular-nums">
                    {t.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums" style={{ color: pColor(p) }}>
                    {p < 0.001 ? "<0.001" : p.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 font-bold" style={{ color: pColor(p) }}>
                    {pLabel(p)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-ink-muted">
        *** p&lt;0.001 &nbsp;** p&lt;0.01 &nbsp;* p&lt;0.05 &nbsp;† p&lt;0.10
        &nbsp;·&nbsp; Odvisna spremenljivka: skupno zadovoljstvo (1–7)
        &nbsp;·&nbsp; Rumena pika = spremenljivka zanimanja (latenca)
      </p>
    </div>
  );
}

// ─── Opisna statistika ────────────────────────────────────────

function DescTable({ stats }: { stats: Record<string, { n: number; mean: number; sd: number; min: number; max: number }> }) {
  const LABELS = VAR_LABELS as Record<string, string>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-ghost">
            {["Spremenljivka", "n", "M", "SD", "Min", "Max"].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs text-ink-muted font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-ghost">
          {Object.entries(stats).map(([k, v]) => (
            <tr key={k} className="hover:bg-background-elevated transition-colors">
              <td className="px-3 py-2 font-medium text-ink">{LABELS[k] ?? k}</td>
              <td className="px-3 py-2 font-mono text-ink-muted tabular-nums">{v.n}</td>
              <td className="px-3 py-2 font-mono text-ink tabular-nums">{v.mean.toFixed(2)}</td>
              <td className="px-3 py-2 font-mono text-ink-muted tabular-nums">{v.sd.toFixed(2)}</td>
              <td className="px-3 py-2 font-mono text-ink-muted tabular-nums">{v.min.toFixed(2)}</td>
              <td className="px-3 py-2 font-mono text-ink-muted tabular-nums">{v.max.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Scatter mini ─────────────────────────────────────────────

function ScatterLatency({ rows }: { rows: RegressionRow[] }) {
  if (rows.length < 2) return null;

  const maxL = Math.max(...rows.map((r) => r.latencyMin));
  const W = 360;
  const H = 200;
  const PAD = 28;

  return (
    <svg width={W} height={H} className="block">
      {/* axes */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#374151" strokeWidth={1} />
      <line x1={PAD} y1={PAD}     x2={PAD}       y2={H - PAD} stroke="#374151" strokeWidth={1} />

      {/* axis labels */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#6b7280">Latenca (min)</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="#6b7280"
            transform={`rotate(-90, 10, ${H / 2})`}>Zadovoljstvo</text>

      {/* OLS trend line */}
      {rows.length >= 3 && (() => {
        const xs = rows.map((r) => r.latencyMin);
        const ys = rows.map((r) => r.overallSatisfaction);
        const n  = xs.length;
        const mx = xs.reduce((a, b) => a + b, 0) / n;
        const my = ys.reduce((a, b) => a + b, 0) / n;
        const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0);
        const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
        if (Math.abs(den) < 1e-10) return null;
        const slope = num / den;
        const inter = my - slope * mx;

        const scaleX = (v: number) => PAD + (v / (maxL || 1)) * (W - 2 * PAD);
        const scaleY = (v: number) => H - PAD - ((v - 1) / 6) * (H - 2 * PAD);

        const x1 = scaleX(0);
        const y1 = scaleY(inter);
        const x2 = scaleX(maxL);
        const y2 = scaleY(inter + slope * maxL);
        return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#eab308" strokeWidth={1.5} strokeDasharray="4 2" />;
      })()}

      {/* dots */}
      {rows.map((r) => {
        const scaleX = (v: number) => PAD + (v / (maxL || 1)) * (W - 2 * PAD);
        const scaleY = (v: number) => H - PAD - ((v - 1) / 6) * (H - 2 * PAD);
        const techColor = ["", "#ef4444", "#eab308", "#22c55e"][r.techLevel] ?? "#6366f1";
        return (
          <circle
            key={r.sessionId}
            cx={scaleX(r.latencyMin)}
            cy={scaleY(r.overallSatisfaction)}
            r={4}
            fill={techColor}
            fillOpacity={0.85}
            stroke="#111827"
            strokeWidth={0.5}
          >
            <title>{r.participantCode}: lat={r.latencyMin.toFixed(2)}min, sat={r.overallSatisfaction}</title>
          </circle>
        );
      })}
    </svg>
  );
}

// ─── Glavni komponent ─────────────────────────────────────────

export function RegressionClient({ rows, corr, ols, descStats, warning, generatedAt }: Props) {
  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Regresijska analiza (T4)</h1>
          <p className="text-ink-muted text-sm mt-0.5">
            Dejavniki skupnega zadovoljstva z izkušnjo · n={rows.length}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/ux-study/regression?format=csv">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold hover:bg-gold-500 text-black font-medium text-sm">
              <Download className="h-4 w-4" />CSV za R
            </button>
          </a>
          <a href="/api/ux-study/regression?format=r">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-ghost text-ink-muted hover:text-ink text-sm">
              <Download className="h-4 w-4" />R skripta
            </button>
          </a>
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-600/30 rounded-2xl px-5 py-4">
          <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Opozorilo glede vzorca</p>
            <p className="text-xs text-amber-400/80 mt-0.5">{warning}</p>
            <p className="text-xs text-amber-400/60 mt-2">
              Vnesi <code className="font-mono bg-amber-900/40 px-1 rounded">overallSatisfaction</code> in{" "}
              <code className="font-mono bg-amber-900/40 px-1 rounded">interfaceRating</code> v intervjujih udeležencev.
            </p>
          </div>
        </div>
      )}

      {/* Opisna statistika */}
      {rows.length > 0 && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-ghost">
            <p className="text-sm font-medium text-ink">Opisna statistika</p>
          </div>
          <div className="p-5">
            <DescTable stats={descStats} />
          </div>
        </div>
      )}

      {/* Korelacijska matrika */}
      {corr && rows.length >= 3 && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-ghost">
            <p className="text-sm font-medium text-ink">Pearsonova korelacijska matrika</p>
            <p className="text-xs text-ink-muted mt-0.5">Barva = smer, intenziteta = moč. Vrednosti ≥ |0.5| so poudarjene.</p>
          </div>
          <div className="p-5">
            <CorrelationMatrix corr={corr} />
          </div>
        </div>
      )}

      {/* OLS regresija */}
      {ols && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-ghost">
            <p className="text-sm font-medium text-ink">OLS regresija — polni model</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Odvisna spremenljivka: skupno zadovoljstvo (1–7)
            </p>
          </div>
          <div className="p-5">
            <OLSTable ols={ols} />
          </div>
        </div>
      )}

      {/* Scatter: latenca vs zadovoljstvo */}
      {rows.length >= 2 && (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-ghost">
            <p className="text-sm font-medium text-ink">Latenca vs. skupno zadovoljstvo</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Barva = tehnična izkušenost (🔴 nizka / 🟡 srednja / 🟢 visoka)
              · Prekinjena črta = OLS trend
            </p>
          </div>
          <div className="p-5">
            <ScatterLatency rows={rows} />
          </div>
        </div>
      )}

      {/* R navodila */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl p-5 space-y-3">
        <p className="text-sm font-medium text-ink">Napredna analiza v R / RStudio</p>
        <p className="text-xs text-ink-muted">
          Prenesi CSV in R skripto ter ju zaženi v RStudio za hierarhično regresijo,
          standardizirane beta koeficiente (lm.beta) in VIF test multikolinearnosti.
        </p>
        <code className="block text-xs bg-background-elevated rounded-xl p-3 text-ink font-mono whitespace-pre-wrap">
          {`# 1. Prenesi datoteki z zgornjih gumbov
# 2. Odpri analysis_t4.R v RStudio
# 3. Nastavi delovni imenik: setwd("pot/do/map")
# 4. Zaženi celotno skripto (Ctrl+Shift+Enter)

# Hierarhični modeli:
# m1 <- lm(overall_satisfaction ~ age_group + tech_level, data=df)
# m2 <- lm(overall_satisfaction ~ ... + sus_score + confusion_count, data=df)
# m3 <- lm(overall_satisfaction ~ ... + latency_min + video_quality, data=df)
# anova(m1, m2, m3)  # primerjava prispevka latence`}
        </code>
        <div className="flex gap-2 pt-1">
          <a href="/api/ux-study/regression?format=csv">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-ink-ghost text-ink-muted hover:text-ink">
              regression_t4.csv
            </button>
          </a>
          <a href="/api/ux-study/regression?format=r">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-ink-ghost text-ink-muted hover:text-ink">
              analysis_t4.R
            </button>
          </a>
        </div>
      </div>

      <p className="text-xs text-ink-faint">Generirano: {new Date(generatedAt).toLocaleString("sl-SI")}</p>
    </div>
  );
}
