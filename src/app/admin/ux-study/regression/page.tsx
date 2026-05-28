import { requireAdmin }          from "@/lib/auth";
import { collectRegressionData } from "@/lib/ux/regression-data";
import { correlationMatrix, fitOLS, describe } from "@/lib/ux/simple-ols";
import { RegressionClient }      from "./RegressionClient";

export const metadata = { title: "Admin — Regresijska analiza T4" };

export default async function RegressionPage() {
  await requireAdmin();

  const dataset = await collectRegressionData();
  const { rows } = dataset;

  // ─── Opisna statistika ─────────────────────────────────────
  const VARS = [
    "overallSatisfaction",
    "latencyMin",
    "susScore",
    "confusionCount",
    "errorCount",
    "waitingFeelings",
    "videoQuality",
    "interfaceRating",
    "techLevel",
    "ageGroup",
  ] as const;

  type VarKey = typeof VARS[number];

  const descStats: Record<string, ReturnType<typeof describe>> = {};
  for (const v of VARS) {
    const vals = rows.map((r) => r[v as keyof typeof r] as number);
    descStats[v] = describe(vals);
  }

  // ─── Korelacijska matrika ──────────────────────────────────
  const corrInput = rows.map((r) => {
    const rec: Record<string, number> = {};
    for (const v of VARS) rec[v] = r[v as keyof typeof r] as number;
    return rec;
  });

  const corr = rows.length >= 3
    ? correlationMatrix(corrInput, [...VARS])
    : null;

  // ─── OLS regresija ─────────────────────────────────────────
  const PREDICTORS: VarKey[] = [
    "latencyMin",
    "susScore",
    "confusionCount",
    "errorCount",
    "waitingFeelings",
    "videoQuality",
    "interfaceRating",
    "ageGroup",
    "techLevel",
  ];

  const X = rows.map((r) => PREDICTORS.map((v) => r[v as keyof typeof r] as number));
  const y = rows.map((r) => r.overallSatisfaction);

  const ols = rows.length >= PREDICTORS.length + 2
    ? fitOLS(X, y, [...PREDICTORS])
    : null;

  return (
    <RegressionClient
      rows={rows}
      corr={corr}
      ols={ols}
      descStats={descStats}
      warning={dataset.warning}
      generatedAt={dataset.generatedAt}
    />
  );
}
