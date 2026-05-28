import OpenAI from "openai";
import type { PoseAnalysis, VideoStyle } from "@/types/pose-analysis";
import { DEFAULT_VIDEO_STYLES } from "@/types/pose-analysis";

// ─── OpenAI client ────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── System prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `Si AI asistent za foto kiosk na praznovanjih in eventih.
Analiziraš fotografijo gosta in predlagaš 5 različnih stilov animiranega videa.

Tvoj odgovor mora biti SAMO veljavni JSON brez kakršnegakoli dodatnega besedila.

Format odgovora:
{
  "poseDescription": "Kratek opis poze v slovenščini (1-2 stavka)",
  "mood": "Razpoloženje v slovenščini (2-3 besede, ločene z vejico)",
  "styles": [
    {
      "id": "unique-kebab-id",
      "name": "Stil Ime (max 3 besede v angleščini)",
      "emoji": "🎬",
      "description": "Kratki opis za gosta v slovenščini (max 10 besed)",
      "prompt": "Detailed English prompt for I2V AI model (50-100 words). Describe the visual transformation, lighting, atmosphere, camera movement, and style. Always start with describing what happens to the person in the photo.",
      "category": "cinematic|fantasy|action|joyful|elegant|dramatic|custom"
    }
  ]
}

Pravila za prompte:
- Vedno se navezuj na konkretno pozo in razpoloženje s fotografije
- Prompts morajo biti v angleščini, bogati z vizualnimi opisi
- Raznolikost: predlagaj različne žanre (ne samo enega)
- Primerni za praznovanje/event kontekst`;

// ─── Glavna funkcija ──────────────────────────────────────────

export async function analyzePose(imageUrl: string): Promise<PoseAnalysis> {
  const analyzedAt = new Date().toISOString();

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[PoseAnalysis] OPENAI_API_KEY ni nastavljen — vračam fallback");
    return buildFallbackAnalysis(analyzedAt);
  }

  try {
    const response = await openai.chat.completions.create({
      model:      "gpt-4o",
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role:    "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            { type: "text",      text: "Analiziraj to fotografijo in predlagaj 5 stilov za animirani video. Odgovori SAMO z JSON." },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Prazen odgovor od OpenAI");

    const parsed = parseAIResponse(raw);
    if (!parsed) throw new Error("Neveljaven JSON odgovor");

    const rawStyles = Array.isArray(parsed.styles) ? parsed.styles as unknown[] : [];
    const styles    = validateAndCleanStyles(rawStyles);

    return {
      poseDescription: typeof parsed.poseDescription === "string" ? parsed.poseDescription : "Fotografija je bila uspešno analizirana.",
      mood:            typeof parsed.mood === "string" ? parsed.mood : "nevtralno",
      confidence:      styles.length >= 3 ? 0.9 : 0.5,
      styles,
      analyzedAt,
      model:    "gpt-4o",
      fallback: false,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznana napaka";
    console.error("[PoseAnalysis] Napaka:", message);
    return buildFallbackAnalysis(analyzedAt);
  }
}

// ─── Parsiraj AI odgovor ──────────────────────────────────────

function parseAIResponse(raw: string): Record<string, unknown> | null {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as Record<string, unknown>; }
      catch { return null; }
    }
    return null;
  }
}

// ─── Validiraj stile ──────────────────────────────────────────

function validateAndCleanStyles(rawStyles: unknown[]): VideoStyle[] {
  const validCategories = new Set([
    "cinematic", "fantasy", "action", "joyful", "elegant", "dramatic", "custom",
  ]);

  const cleaned: VideoStyle[] = [];

  for (const s of rawStyles) {
    if (typeof s !== "object" || s === null) continue;
    const style = s as Record<string, unknown>;

    if (
      typeof style.name   !== "string" ||
      typeof style.prompt !== "string" ||
      style.name.trim() === "" ||
      style.prompt.trim() === ""
    ) continue;

    cleaned.push({
      id:          (typeof style.id === "string" ? style.id : null) ??
                   style.name.toLowerCase().replace(/\s+/g, "-"),
      name:        String(style.name).slice(0, 30),
      emoji:       typeof style.emoji === "string" ? style.emoji : "🎬",
      description: typeof style.description === "string"
                     ? style.description.slice(0, 80)
                     : "Unikaten video stil",
      prompt:      String(style.prompt).slice(0, 500),
      category:    validCategories.has(String(style.category))
                     ? style.category as VideoStyle["category"]
                     : "custom",
    });

    if (cleaned.length >= 5) break;
  }

  // Dopolni z fallback stili če jih je premalo
  if (cleaned.length < 5) {
    const existing = new Set(cleaned.map((s) => s.id));
    for (const fallback of DEFAULT_VIDEO_STYLES) {
      if (cleaned.length >= 5) break;
      if (!existing.has(fallback.id)) cleaned.push(fallback);
    }
  }

  return cleaned;
}

// ─── Fallback analiza ─────────────────────────────────────────

function buildFallbackAnalysis(analyzedAt: string): PoseAnalysis {
  return {
    poseDescription: "Fotografija je bila zajeta uspešno.",
    mood:            "veselo, prijetno",
    confidence:      0,
    styles:          DEFAULT_VIDEO_STYLES,
    analyzedAt,
    model:           "fallback",
    fallback:        true,
  };
}
