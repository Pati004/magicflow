// =============================================================
//  MAGICFLOW — Mann-Whitney U Test (non-parametric)
//
//  Primeren za ordinalne podatke (MOS 1–5) in majhne vzorce.
//  Za parjene podatke iz iste fotografije (isti ocenjevalec,
//  kontekstualni vs. generični prompt) je bolj primeren
//  Wilcoxon Signed-Rank test — implementiran spodaj.
// =============================================================

// ─── Tipi ─────────────────────────────────────────────────────

export interface MannWhitneyResult {
  U:           number;
  U1:          number;
  U2:          number;
  n1:          number;
  n2:          number;
  z:           number;
  p:           number;          // dvostranski p-value
  significant: boolean;         // α = 0.05
  effect:      "negligible" | "small" | "medium" | "large";
  interpretation: string;
}

export interface WilcoxonResult {
  W:           number;
  n:           number;          // pari brez razlike 0
  z:           number;
  p:           number;
  significant: boolean;
  effect:      "negligible" | "small" | "medium" | "large";
  interpretation: string;
}

// ─── Standardna normalna CDF (Abramowitz & Stegun aproksimacija) ──

function normalCDF(z: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * z);
  const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  const erf = 1 - poly * Math.exp(-z * z);
  return 0.5 * (1 + sign * erf);
}

function pValueTwoTailed(z: number): number {
  return 2 * Math.min(normalCDF(z), 1 - normalCDF(z));
}

// ─── Rangiranje s povprečnimi rangi pri enačajih ──────────────

function rank(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);

  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    const curVal = indexed[i]?.v;
    while (j < indexed.length && indexed[j]?.v === curVal) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      const idx = indexed[k]?.i;
      if (idx !== undefined) ranks[idx] = avgRank;
    }
    i = j;
  }
  return ranks;
}

// ─── Mann-Whitney U test ──────────────────────────────────────

export function calculateU(
  group1: number[],
  group2: number[],
): MannWhitneyResult {
  if (group1.length < 2 || group2.length < 2) {
    throw new Error("Vsaka skupina mora imeti vsaj 2 vrednosti.");
  }

  const n1  = group1.length;
  const n2  = group2.length;
  const all = [...group1, ...group2];
  const r   = rank(all);

  const R1 = r.slice(0, n1).reduce((s, x) => s + x, 0);

  const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - R1;
  const U2 = n1 * n2 - U1;
  const U  = Math.min(U1, U2);

  // Korekcija za enačaje
  const tieCorrection = (() => {
    const counts: Record<number, number> = {};
    for (const v of all) counts[v] = (counts[v] ?? 0) + 1;
    return Object.values(counts)
      .filter((c): c is number => typeof c === "number" && c > 1)
      .reduce((s, c) => s + (c ** 3 - c), 0);
  })();

  const N     = n1 + n2;
  const meanU = (n1 * n2) / 2;
  const varU  = (n1 * n2 * (N + 1 - tieCorrection / (N * (N - 1)))) / 12;
  const z     = varU > 0 ? (U - meanU) / Math.sqrt(varU) : 0;
  const p     = pValueTwoTailed(z);

  // Effect size r = z / sqrt(N)
  const r_effect = Math.abs(z) / Math.sqrt(N);
  const effect   = effectSize(r_effect);

  const m1 = mean(group1);
  const m2 = mean(group2);
  const interpretation = p < 0.05
    ? `Statistično značilna razlika (p=${p.toFixed(4)}). ` +
      `Skupina 1 (M=${m1.toFixed(2)}) ${m1 > m2 ? ">" : "<"} Skupina 2 (M=${m2.toFixed(2)}). ` +
      `Velikost učinka: ${effect} (r=${r_effect.toFixed(3)}).`
    : `Ni statistično značilne razlike (p=${p.toFixed(4)}, n1=${n1}, n2=${n2}).`;

  return { U, U1, U2, n1, n2, z: parseFloat(z.toFixed(4)), p: parseFloat(p.toFixed(4)), significant: p < 0.05, effect, interpretation };
}

// ─── Wilcoxon Signed-Rank test (za parjene podatke) ──────────

export function wilcoxonSignedRank(
  before: number[],  // kontekstualni fit
  after:  number[],  // generični fit
): WilcoxonResult {
  if (before.length !== after.length) {
    throw new Error("Parjeni skupini morata biti enake dolžine.");
  }

  const diffs = before.map((b, i) => b - (after[i] ?? 0));
  const nonzero = diffs.filter((d) => d !== 0);
  const n = nonzero.length;

  if (n === 0) {
    return { W: 0, n: 0, z: 0, p: 1, significant: false, effect: "negligible", interpretation: "Vse razlike so nič — ni razlike med skupinama." };
  }

  const absDiffs = nonzero.map(Math.abs);
  const ranks    = rank(absDiffs);

  let Wplus = 0, Wminus = 0;
  for (let i = 0; i < nonzero.length; i++) {
    if ((nonzero[i] ?? 0) > 0) Wplus  += ranks[i] ?? 0;
    else                        Wminus += ranks[i] ?? 0;
  }

  const W     = Math.min(Wplus, Wminus);
  const meanW = (n * (n + 1)) / 4;
  const stdW  = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
  const z     = stdW > 0 ? (W - meanW) / stdW : 0;
  const p     = pValueTwoTailed(z);

  const r_effect = Math.abs(z) / Math.sqrt(n);
  const effect   = effectSize(r_effect);

  const mBefore = mean(before);
  const mAfter  = mean(after);
  const interpretation = p < 0.05
    ? `Statistično značilna razlika (p=${p.toFixed(4)}). ` +
      `Kontekstualni (M=${mBefore.toFixed(2)}) ${mBefore > mAfter ? ">" : "<"} Generični (M=${mAfter.toFixed(2)}). ` +
      `Učinek: ${effect} (r=${r_effect.toFixed(3)}).`
    : `Ni statistično značilne razlike (p=${p.toFixed(4)}, n=${n} parov).`;

  return { W, n, z: parseFloat(z.toFixed(4)), p: parseFloat(p.toFixed(4)), significant: p < 0.05, effect, interpretation };
}

// ─── Analiza preference (binomski test) ──────────────────────

export interface PreferenceResult {
  contextualCount: number;
  genericCount:    number;
  equalCount:      number;
  total:           number;
  contextualPct:   number;
  p:               number;    // binomski test proti H0: p=0.5
  significant:     boolean;
  interpretation:  string;
}

export function analyzePreferences(preferences: string[]): PreferenceResult {
  const contextualCount = preferences.filter((p) => p === "contextual").length;
  const genericCount    = preferences.filter((p) => p === "generic").length;
  const equalCount      = preferences.filter((p) => p === "equal").length;
  const decisiveN       = contextualCount + genericCount;
  const contextualPct   = decisiveN > 0 ? contextualCount / decisiveN : 0.5;

  // Binomski test (normalna aproksimacija za n > 20)
  const p = decisiveN > 0
    ? pValueTwoTailed((contextualCount - decisiveN * 0.5) / Math.sqrt(decisiveN * 0.25))
    : 1;

  const interpretation = p < 0.05
    ? `Statistično značilna preferenca za ${contextualPct > 0.5 ? "kontekstualne" : "generične"} prompte ` +
      `(${Math.round(contextualPct * 100)}% vs ${Math.round((1 - contextualPct) * 100)}%, p=${p.toFixed(4)}).`
    : `Ni statistično značilne preference (${contextualCount} kontekst. / ${genericCount} generič., p=${p.toFixed(4)}).`;

  return { contextualCount, genericCount, equalCount, total: preferences.length, contextualPct: parseFloat(contextualPct.toFixed(3)), p: parseFloat(p.toFixed(4)), significant: p < 0.05, interpretation };
}

// ─── Pomočniki ────────────────────────────────────────────────

function mean(vals: number[]): number {
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function effectSize(r: number): "negligible" | "small" | "medium" | "large" {
  if (r < 0.1) return "negligible";
  if (r < 0.3) return "small";
  if (r < 0.5) return "medium";
  return "large";
}
