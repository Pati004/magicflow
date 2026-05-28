// =============================================================
//  MAGICFLOW — Zbiranje podatkov za regresijsko analizo (T4)
//  Namen: ugotoviti ali je latenca generiranja videa
//         najpomembnejši dejavnik skupne ocene izkušnje.
//
//  Odvisna spremenljivka:  overallSatisfaction (1–7)
//  Neodvisne spremenljivke:
//    - latencyMin      : trajanje generiranja (totalLatencyMs / 60000)
//    - susScore        : SUS ocena (0–100)
//    - confusionCount  : število zaznav zmede
//    - errorCount      : število napak
//    - waitingFeelings : zaznano čakanje (1–7)
//    - videoQuality    : kakovost videa (1–7)
//    - interfaceRating : intuitivnost vmesnika (1–7)
//    - ageGroup        : 1=mladi (<35), 2=srednji (35-55), 3=starejši (>55)
//    - techLevel       : 1=nizka, 2=srednja, 3=visoka izkušenost
// =============================================================

import { prisma } from "@/lib/prisma";

// ─── Tipi ─────────────────────────────────────────────────────

export interface RegressionRow {
  participantCode:     string;
  sessionId:           string;

  // Odvisna
  overallSatisfaction: number;

  // Neodvisne — kvantitativne
  latencyMin:          number;   // totalLatencyMs / 60 000
  susScore:            number;   // 0–100
  confusionCount:      number;
  errorCount:          number;
  waitingFeelings:     number;   // 1–7
  videoQuality:        number;   // 1–7
  interfaceRating:     number;   // 1–7

  // Neodvisne — kategorične (kodirane numerično)
  ageGroup:            number;   // 1 | 2 | 3
  techLevel:           number;   // 1 | 2 | 3

  // Meta
  durationMin:         number;   // trajanje opazovalne seje
  wouldWatchAgain:     number;   // 1–7
}

export interface RegressionDataset {
  generatedAt: string;
  rows:        RegressionRow[];
  /** Opozorilo, če je podatkov premalo */
  warning:     string | null;
}

// ─── Zbiranje iz baze ─────────────────────────────────────────

export async function collectRegressionData(): Promise<RegressionDataset> {
  const sessions = await prisma.observationSession.findMany({
    include: {
      events:    { select: { type: true } },
      interview: true,
      susSession: {
        include: {
          response: {
            select: { score: true, participantAge: true, techExperience: true },
          },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  const rows: RegressionRow[] = [];

  for (const s of sessions) {
    const iv = s.interview;
    // Samo seje z odvisno spremenljivko
    if (!iv?.overallSatisfaction) continue;

    const susScore       = s.susSession?.response?.score      ?? null;
    const participantAge = s.susSession?.response?.participantAge ?? null;
    const techExp        = s.susSession?.response?.techExperience ?? null;

    const durationMs = s.endedAt
      ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
      : null;

    rows.push({
      participantCode:     s.participantCode,
      sessionId:           s.id,

      overallSatisfaction: iv.overallSatisfaction,
      latencyMin:          iv.totalLatencyMs != null ? iv.totalLatencyMs / 60_000 : 0,
      susScore:            susScore ?? 0,
      confusionCount:      s.events.filter((e) => e.type === "confusion").length,
      errorCount:          s.events.filter((e) => e.type === "error").length,
      waitingFeelings:     iv.waitingFeelings  ?? 4,
      videoQuality:        iv.videoQuality     ?? 4,
      interfaceRating:     iv.interfaceRating  ?? 4,

      ageGroup:    encodeAge(participantAge),
      techLevel:   encodeTech(techExp),

      durationMin: durationMs != null ? durationMs / 60_000 : 0,
      wouldWatchAgain: iv.wouldWatchAgain ?? 4,
    });
  }

  const warning =
    rows.length < 5
      ? `Premalo podatkov za zanesljivo regresijo (${rows.length}/5+ zahtevano). Vnesi overallSatisfaction v intervjujih.`
      : rows.length < 10
      ? `Majhen vzorec (n=${rows.length}) — rezultati so orientacijski.`
      : null;

  return { generatedAt: new Date().toISOString(), rows, warning };
}

// ─── CSV izvoz za R ───────────────────────────────────────────

export function datasetToCSV(dataset: RegressionDataset): string {
  const header = [
    "participant",
    "session_id",
    "overall_satisfaction",
    "latency_min",
    "sus_score",
    "confusion_count",
    "error_count",
    "waiting_feelings",
    "video_quality",
    "interface_rating",
    "age_group",
    "tech_level",
    "duration_min",
    "would_watch_again",
  ].join(",");

  const lines = dataset.rows.map((r) =>
    [
      r.participantCode,
      r.sessionId,
      r.overallSatisfaction,
      r.latencyMin.toFixed(3),
      r.susScore.toFixed(1),
      r.confusionCount,
      r.errorCount,
      r.waitingFeelings,
      r.videoQuality,
      r.interfaceRating,
      r.ageGroup,
      r.techLevel,
      r.durationMin.toFixed(2),
      r.wouldWatchAgain,
    ].join(","),
  );

  return [header, ...lines].join("\n");
}

// ─── R koda za analizo ────────────────────────────────────────

export const R_ANALYSIS_CODE = `# ============================================================
#  MAGICFLOW — Regresijska analiza zadovoljstva (T4)
#  Zaženi v R (>= 4.0) ali RStudio
# ============================================================

library(tidyverse)
library(corrplot)
library(car)          # VIF test multikolinearnosti
library(lm.beta)      # standardizirani beta koeficienti

# 1. Uvoz podatkov
df <- read.csv("regression_t4.csv") %>%
  mutate(across(c(overall_satisfaction, waiting_feelings,
                   video_quality, interface_rating,
                   would_watch_again), as.numeric))

cat("n =", nrow(df), "\\n")
summary(df)

# 2. Opisna statistika
df %>% select(-participant, -session_id) %>%
  summarise(across(everything(), list(M=mean, SD=sd, Min=min, Max=max))) %>%
  pivot_longer(everything()) %>% print(n=100)

# 3. Korelacijska matrika
cor_vars <- c("overall_satisfaction","latency_min","sus_score",
              "confusion_count","error_count","waiting_feelings",
              "video_quality","interface_rating","tech_level")
cor_m <- cor(df[,cor_vars], use="complete.obs")
corrplot(cor_m, method="color", type="upper",
         addCoef.col="black", number.cex=0.8, tl.cex=0.9)

# 4. Hierarhična regresija
# Model 1 — samo demografske spremenljivke (baseline)
m1 <- lm(overall_satisfaction ~ age_group + tech_level, data=df)

# Model 2 — dodamo latentne dejavnike izkušnje
m2 <- lm(overall_satisfaction ~ age_group + tech_level +
            sus_score + confusion_count + error_count, data=df)

# Model 3 — polni model z vsemi prediktorji
m3 <- lm(overall_satisfaction ~ age_group + tech_level +
            sus_score + confusion_count + error_count +
            latency_min + waiting_feelings + video_quality +
            interface_rating, data=df)

summary(m1); summary(m2); summary(m3)

# Primerjava modelov
anova(m1, m2, m3)

# 5. Standardizirani beta koeficienti (polni model)
lm.beta(m3)

# 6. Diagnostika multikolinearnosti
vif(m3)

# 7. Diagnostični grafi
par(mfrow=c(2,2)); plot(m3); par(mfrow=c(1,1))

# 8. Vpliv latence (spremenljivka zanimanja)
cat("\\n--- Vpliv latence na zadovoljstvo ---\\n")
cat("beta_latency =", coef(m3)["latency_min"], "\\n")
cat("p_latency    =", summary(m3)$coefficients["latency_min","Pr(>|t|)"], "\\n")

# Vizualizacija
ggplot(df, aes(latency_min, overall_satisfaction)) +
  geom_point(aes(color=factor(tech_level)), size=3, alpha=0.8) +
  geom_smooth(method="lm", se=TRUE, color="black") +
  scale_color_manual(values=c("#ef4444","#eab308","#22c55e"),
                     labels=c("Nizka","Srednja","Visoka"),
                     name="Tehnična\\nizkušenost") +
  labs(title="Latenca generiranja videa vs. skupno zadovoljstvo",
       x="Latenca (min)", y="Skupno zadovoljstvo (1–7)") +
  theme_minimal(base_size=13)
`;

// ─── Kodiranje kategoričnih spremenljivk ─────────────────────

function encodeAge(age: number | null): number {
  if (age == null) return 2;         // privzeto: srednja skupina
  if (age < 35) return 1;
  if (age <= 55) return 2;
  return 3;
}

function encodeTech(tech: string | null | undefined): number {
  if (!tech) return 2;
  const lower = tech.toLowerCase();
  if (lower.includes("nizk") || lower === "low")  return 1;
  if (lower.includes("visok") || lower === "high") return 3;
  return 2; // srednja
}
