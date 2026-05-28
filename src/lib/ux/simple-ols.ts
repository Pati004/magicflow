// =============================================================
//  MAGICFLOW — Preprosta linearna regresija (OLS)
//  Brez zunanjih odvisnosti — samo Node.js / TypeScript
//  Metoda: navadna metoda najmanjših kvadratov (X'X)^{-1} X'y
// =============================================================

// ─── Matrika: niz vrstic ──────────────────────────────────────
type Matrix = number[][];

/** Transponira matriko m×n → n×m */
function transpose(A: Matrix): Matrix {
  if (A.length === 0) return [];
  const rows = A.length;
  const cols = A[0]!.length;
  return Array.from({ length: cols }, (_, j) =>
    Array.from({ length: rows }, (_, i) => A[i]![j]!),
  );
}

/** Matrika množi A (m×k) · B (k×n) → m×n */
function matMul(A: Matrix, B: Matrix): Matrix {
  const m = A.length;
  const k = B.length;
  const n = B[0]!.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let sum = 0;
      for (let t = 0; t < k; t++) sum += A[i]![t]! * B[t]![j]!;
      return sum;
    }),
  );
}

/** Invertira kvadratno matriko z Gaussovo eliminacijo (augmented [A|I]) */
function invertMatrix(A: Matrix): Matrix | null {
  const n = A.length;
  // Augmented matrix [A | I]
  const aug: number[][] = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    // Delno pivotiranje
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r]![col]!) > Math.abs(aug[maxRow]![col]!)) maxRow = r;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow]!, aug[col]!];

    const pivot = aug[col]![col]!;
    if (Math.abs(pivot) < 1e-12) return null; // singularna

    for (let k = 0; k < 2 * n; k++) aug[col]![k]! /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r]![col]!;
      for (let k = 0; k < 2 * n; k++) aug[r]![k]! -= factor * aug[col]![k]!;
    }
  }

  return aug.map((row) => row.slice(n));
}

// ─── OLS rezultati ────────────────────────────────────────────

export interface OLSResult {
  /** Nazivi spremenljivk (brez konstante) */
  variableNames: string[];
  /** Regresijski koeficienti — indeks 0 = konstanta (β₀) */
  coefficients:  number[];
  /** Standardne napake koeficientov */
  stdErrors:     number[];
  /** t-statistike */
  tStats:        number[];
  /** Dvostranske p-vrednosti (aproksimacija z normalo) */
  pValues:       number[];
  /** Koeficient determinacije R² */
  rSquared:      number;
  /** Prilagojen R² */
  adjRSquared:   number;
  /** Standardna napaka regresije (RMSE rezidualov) */
  rse:           number;
  /** Število opazovanj */
  n:             number;
  /** Število prediktorjev (brez konstante) */
  k:             number;
  /** Napoved za vsako opazovanje */
  fitted:        number[];
  /** Reziduali */
  residuals:     number[];
}

/**
 * Izračuna OLS regresijo:
 * y = β₀ + β₁x₁ + ... + βₖxₖ
 *
 * @param X  matrika prediktorjev n×k (brez stolpca za konstanto)
 * @param y  vektor odvisne spremenljivke (dolžina n)
 * @param variableNames  nazivi stolpcev X
 */
export function fitOLS(
  X: number[][],
  y: number[],
  variableNames: string[],
): OLSResult | null {
  const n = y.length;
  const k = variableNames.length;

  if (n < k + 2) return null; // premalo opazovanj

  // Dodamo stolpec za konstanto (intercept)
  const Xc: Matrix = X.map((row) => [1, ...row]);
  const Xt = transpose(Xc);
  const XtX = matMul(Xt, Xc);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) return null;

  const yMat: Matrix = y.map((v) => [v]);
  const Xty = matMul(Xt, yMat);
  const betaMat = matMul(XtXinv, Xty);
  const coefficients = betaMat.map((r) => r[0]!);

  // Napovedi in reziduali
  const fitted = Xc.map((row) =>
    row.reduce((s, v, i) => s + v * coefficients[i]!, 0),
  );
  const residuals = y.map((v, i) => v - fitted[i]!);

  // SS
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = residuals.reduce((s, r) => s + r ** 2, 0);
  const rSquared    = ssTot < 1e-12 ? 0 : 1 - ssRes / ssTot;
  const adjRSquared = 1 - (1 - rSquared) * ((n - 1) / (n - k - 1));

  // Standardna napaka regresije
  const df  = n - k - 1;
  const rse = df > 0 ? Math.sqrt(ssRes / df) : 0;

  // Standardne napake koeficientov: sqrt(diag(s² · (X'X)⁻¹))
  const stdErrors = XtXinv.map((row, i) =>
    rse * Math.sqrt(Math.abs(row[i]!)),
  );

  // t-statistike in p-vrednosti (aproksimacija z normalo)
  const tStats = coefficients.map((b, i) =>
    stdErrors[i]! > 1e-12 ? b / stdErrors[i]! : 0,
  );
  const pValues = tStats.map((t) => 2 * (1 - normalCDF(Math.abs(t))));

  return {
    variableNames,
    coefficients,
    stdErrors,
    tStats,
    pValues,
    rSquared,
    adjRSquared,
    rse,
    n,
    k,
    fitted,
    residuals,
  };
}

// ─── Pearsonova korelacijska matrika ──────────────────────────

export interface CorrelationResult {
  variables: string[];
  /** Korelacijska matrika (simetricna, diagonala = 1) */
  matrix: number[][];
  /** p-vrednosti (dvostranske, H0: r=0) */
  pMatrix: number[][];
}

/**
 * Izračuna Pearsonovo korelacijsko matriko za podani nabor spremenljivk.
 * @param data  vrstice opazovanj
 * @param vars  nazivi spremenljivk (keys v data[i])
 */
export function correlationMatrix(
  data: Record<string, number>[],
  vars: string[],
): CorrelationResult {
  const p = vars.length;
  const n = data.length;

  // Izvlečemo stolpce
  const cols: number[][] = vars.map((v) => data.map((row) => row[v] ?? 0));

  const means = cols.map((c) => c.reduce((a, b) => a + b, 0) / n);
  const stds  = cols.map((c, i) => {
    const m = means[i]!;
    return Math.sqrt(c.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  });

  const matrix: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const pMatrix: number[][] = Array.from({ length: p }, () => Array(p).fill(0));

  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      if (i === j) {
        matrix[i]![j] = 1;
        pMatrix[i]![j] = 0;
        continue;
      }
      const ci = cols[i]!;
      const cj = cols[j]!;
      const mi = means[i]!;
      const mj = means[j]!;
      const si = stds[i]!;
      const sj = stds[j]!;

      if (si < 1e-12 || sj < 1e-12) {
        matrix[i]![j] = 0;
        pMatrix[i]![j] = 1;
        continue;
      }

      const cov = ci.reduce((s, v, k) => s + (v - mi) * (cj[k]! - mj), 0) / (n - 1);
      const r = cov / (si * sj);
      const clampedR = Math.max(-1, Math.min(1, r));
      matrix[i]![j] = clampedR;

      // t-test: t = r * sqrt(n-2) / sqrt(1-r²)
      const r2 = clampedR ** 2;
      const tStat = n > 2 ? (clampedR * Math.sqrt(n - 2)) / Math.sqrt(Math.max(1e-12, 1 - r2)) : 0;
      pMatrix[i]![j] = 2 * (1 - normalCDF(Math.abs(tStat)));
    }
  }

  return { variables: vars, matrix, pMatrix };
}

// ─── Pomožne statistične funkcije ─────────────────────────────

/** Normalna CDF — aproksimacija Abramowitz & Stegun (napaka < 7.5e-8) */
function normalCDF(x: number): number {
  if (x < 0) return 1 - normalCDF(-x);
  const t  = 1 / (1 + 0.2316419 * x);
  const td = t;
  const poly =
    0.319381530  * td -
    0.356563782  * td ** 2 +
    1.781477937  * td ** 3 -
    1.821255978  * td ** 4 +
    1.330274429  * td ** 5;
  return 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x) * poly;
}

/** z-standardizacija (mean=0, sd=1) */
export function zScore(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values.map(() => 0);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  return std < 1e-12 ? values.map(() => 0) : values.map((v) => (v - mean) / std);
}

/** Vrne opisno statistiko za vektor */
export function describe(values: number[]): {
  n: number; mean: number; sd: number; min: number; max: number; median: number;
} {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, sd: 0, min: 0, max: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean   = values.reduce((a, b) => a + b, 0) / n;
  const sd     = n > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2
    : sorted[Math.floor(n / 2)]!;
  return { n, mean, sd, min: sorted[0]!, max: sorted[n - 1]!, median };
}
