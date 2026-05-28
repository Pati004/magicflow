// ─── 5 generičnih stilov — brez konteksta fotografije ────────
// Ločena datoteka brez server-side odvisnosti (brez prisma)
// Varno za uvoz v client komponente

export const GENERIC_PROMPTS = [
  {
    id:     "cinematic",
    name:   "Cinematic",
    prompt: "Cinematic portrait with dramatic side lighting, shallow depth of field, subtle camera push-in, film grain overlay, dark muted color grade.",
  },
  {
    id:     "dreamy",
    name:   "Dreamy",
    prompt: "Dreamy soft-focus scene with warm bokeh, gentle light leaks, slow ethereal camera float, pastel haze, nostalgic golden-hour atmosphere.",
  },
  {
    id:     "epic",
    name:   "Epic",
    prompt: "Epic hero-style reveal with powerful dynamic lighting, dramatic volumetric rays, strong zoom-out camera movement, intense cinematic score implied.",
  },
  {
    id:     "joyful",
    name:   "Joyful",
    prompt: "Joyful celebratory burst with vibrant saturated colors, confetti particle effects, upbeat bouncy camera movement, bright cheerful atmosphere.",
  },
  {
    id:     "elegant",
    name:   "Elegant",
    prompt: "Elegant refined aesthetic with soft studio lighting, graceful slow dolly movement, neutral luxury palette, minimal motion with high-end feel.",
  },
] as const;

export type GenericPromptId = typeof GENERIC_PROMPTS[number]["id"];
