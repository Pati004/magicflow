// =============================================================
//  MAGICFLOW — SUS (System Usability Scale) Scoring
//  Vir: Brooke, J. (1996). SUS: A "quick and dirty" usability scale.
//       In P. Jordan et al. (Eds.), Usability Evaluation in Industry.
// =============================================================

// ─── 10 standardnih SUS vprašanj v slovenščini ───────────────
// Lihih (1,3,5,7,9) = pozitivne trditve
// Sodih (2,4,6,8,10) = negativne trditve

export const SUS_QUESTIONS = [
  { id: 1, positive: true,  text: "Mislim, da bi ta sistem rad/-a pogosto uporabljal/-a." },
  { id: 2, positive: false, text: "Sistem se mi je zdel po nepotrebnem zapleten." },
  { id: 3, positive: true,  text: "Mislim, da je sistem enostaven za uporabo." },
  { id: 4, positive: false, text: "Menim, da bi za uporabo tega sistema potreboval/-a pomoč usposobljenega strokovnjaka." },
  { id: 5, positive: true,  text: "Ugotovil/-a sem, da so različne funkcije sistema dobro integrirane." },
  { id: 6, positive: false, text: "Mislim, da je bilo v sistemu preveč nedoslednosti." },
  { id: 7, positive: true,  text: "Predstavljam si, da bi večina ljudi ta sistem hitro obvladala." },
  { id: 8, positive: false, text: "Sistem se mi je zdel zelo neroden za uporabo." },
  { id: 9, positive: true,  text: "Pri uporabi sistema sem se počutil/-a zelo samozavestno." },
  { id: 10, positive: false, text: "Preden sem začel/-a s sistemom, sem se moral/-a naučiti veliko stvari." },
] as const;

// ─── Lestvica odgovorov ───────────────────────────────────────

export const SUS_SCALE = [
  { value: 1, label: "Sploh se ne strinjam" },
  { value: 2, label: "Se ne strinjam" },
  { value: 3, label: "Niti niti" },
  { value: 4, label: "Se strinjam" },
  { value: 5, label: "Popolnoma se strinjam" },
] as const;

// ─── Izračun SUS score (0–100) ────────────────────────────────
//
//  Formula (Brooke 1996):
//  • Liha vprašanja (1,3,5,7,9): prispevek = odgovor - 1  → vsota od 0 do 20
//  • Soda vprašanja  (2,4,6,8,10): prispevek = 5 - odgovor → vsota od 0 do 20
//  • SUS = (vsota_lihih - 5 + 25 - vsota_sodih) × 2.5
//        = (skupna_vsota) × 2.5                            → rezultat 0–100

export function calculateSUSScore(answers: number[]): number {
  if (answers.length !== 10) {
    throw new Error(`SUS zahteva točno 10 odgovorov, dobljenih: ${answers.length}`);
  }

  let oddSum  = 0; // pozitivne (1,3,5,7,9) — indeksi 0,2,4,6,8
  let evenSum = 0; // negativne (2,4,6,8,10) — indeksi 1,3,5,7,9

  for (let i = 0; i < 10; i++) {
    const ans = answers[i] ?? 3;
    if (i % 2 === 0) oddSum  += ans;
    else             evenSum += ans;
  }

  const score = ((oddSum - 5) + (25 - evenSum)) * 2.5;
  return Math.round(score * 10) / 10; // eno decimalno mesto
}

// ─── Pragovi in interpretacija ────────────────────────────────
//
//  Bangor et al. (2008) in Sauro (2011) razširitev:
//  < 51   → F  Nesprejemljivo
//  51–68  → D  Marginalno (slabo)
//  68–80  → C  Sprejemljivo
//  80–90  → B  Dobro
//  > 90   → A+ Odlično

export type SUSGrade = "Nesprejemljivo" | "Marginalno" | "Sprejemljivo" | "Dobro" | "Odlično";

export interface SUSInterpretation {
  grade:       SUSGrade;
  letter:      "F" | "D" | "C" | "B" | "A+";
  adjective:   string;
  color:       string;
  description: string;
}

export function interpretSUS(score: number): SUSInterpretation {
  if (score > 90) return {
    grade: "Odlično",       letter: "A+", adjective: "Najboljši",
    color: "#22c55e",
    description: "Sistem presega pričakovanja. Uporabniki ga doživljajo kot izjemno intuitiven.",
  };
  if (score > 80) return {
    grade: "Dobro",         letter: "B",  adjective: "Odličen",
    color: "#84cc16",
    description: "Sistem je zelo uporaben. Primerljiv z najboljšimi industrijskimi standardi.",
  };
  if (score > 68) return {
    grade: "Sprejemljivo",  letter: "C",  adjective: "Dober",
    color: "#eab308",
    description: "Sistem je uporaben, vendar so možne izboljšave v nekaterih področjih.",
  };
  if (score > 50) return {
    grade: "Marginalno",    letter: "D",  adjective: "Slab",
    color: "#f97316",
    description: "Sistem ima resne težave z uporabnostjo. Potrebne so izboljšave.",
  };
  return {
    grade: "Nesprejemljivo", letter: "F", adjective: "Nesprejemljiv",
    color: "#ef4444",
    description: "Sistem je neuporaben. Nujno potrebna je prenova vmesnika.",
  };
}

// ─── Statistike za poročilo ───────────────────────────────────

export interface SUSStats {
  n:      number;
  mean:   number;
  std:    number;
  min:    number;
  max:    number;
  median: number;
  ci95:   [number, number];
  interpretation: SUSInterpretation;
  distribution: { range: string; count: number; pct: number }[];
}

export function calculateSUSStats(scores: number[]): SUSStats {
  if (scores.length === 0) throw new Error("Ni podatkov za statistiko.");
  const n    = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const sorted = [...scores].sort((a, b) => a - b);

  const variance = scores.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(n - 1, 1);
  const std   = Math.sqrt(variance);
  const sem   = std / Math.sqrt(n);
  const ci95: [number, number] = [
    parseFloat((mean - 1.96 * sem).toFixed(1)),
    parseFloat((mean + 1.96 * sem).toFixed(1)),
  ];
  const mid    = Math.floor(n / 2);
  const median = n % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);

  const ranges = [
    { label: "< 51 (F)",    min: 0,  max: 51  },
    { label: "51–68 (D)",   min: 51, max: 68  },
    { label: "68–80 (C)",   min: 68, max: 80  },
    { label: "80–90 (B)",   min: 80, max: 90  },
    { label: "> 90 (A+)",   min: 90, max: 101 },
  ];

  const distribution = ranges.map(({ label, min, max }) => {
    const count = scores.filter((s) => s >= min && s < max).length;
    return { range: label, count, pct: parseFloat(((count / n) * 100).toFixed(1)) };
  });

  return {
    n, mean: parseFloat(mean.toFixed(1)), std: parseFloat(std.toFixed(1)),
    min: sorted[0] ?? 0, max: sorted[n - 1] ?? 0,
    median: parseFloat(median.toFixed(1)), ci95,
    interpretation: interpretSUS(mean),
    distribution,
  };
}
