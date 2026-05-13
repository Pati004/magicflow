// =============================================================
//  MAGICFLOW — Pose Analysis Types
// =============================================================

export type VideoStyleCategory =
  | "cinematic"
  | "fantasy"
  | "action"
  | "joyful"
  | "elegant"
  | "dramatic"
  | "custom";

export interface VideoStyle {
  id:          string;
  name:        string;        // Max 3 besede, npr. "Cinematic Magic"
  emoji:       string;        // Ena emoji ikona
  description: string;        // Kratki opis za gosta (sl)
  prompt:      string;        // Podroben ang. prompt za I2V model
  category:    VideoStyleCategory;
}

export interface PoseAnalysis {
  // Opis poze in razpoloženja
  poseDescription:  string;   // npr. "Oseba stoji pokončno z dvignjenimi rokami"
  mood:             string;   // npr. "veselo, energično"
  confidence:       number;   // 0–1, zanesljivost analize

  // Predlagani stili
  styles:           VideoStyle[];

  // Meta
  analyzedAt:       string;   // ISO timestamp
  model:            string;   // Kateri AI model je bil uporabljen
  fallback:         boolean;  // true = nismo dobili AI odgovora
}

export interface PoseAnalysisResult {
  success: true;
  analysis: PoseAnalysis;
  styles:   VideoStyle[];
}

export interface PoseAnalysisError {
  success: false;
  error:   string;
  styles:  VideoStyle[];  // Vedno vrne fallback stile
}

export type PoseAnalysisResponse = PoseAnalysisResult | PoseAnalysisError;

// ─── 5 Fallback stilov ────────────────────────────────────────

export const DEFAULT_VIDEO_STYLES: VideoStyle[] = [
  {
    id:          "cinematic-magic",
    name:        "Cinematic Magic",
    emoji:       "🎬",
    description: "Filmski prizor z dramatično svetlobo",
    category:    "cinematic",
    prompt:      "Cinematic film scene transformation. The person is surrounded by dramatic golden-hour lighting, lens flares, and shallow depth of field. Camera slowly pulls back to reveal an epic landscape. Professional color grading with teal and orange tones. 4K, photorealistic, movie quality.",
  },
  {
    id:          "dreamy-particles",
    name:        "Dreamy Particles",
    emoji:       "✨",
    description: "Čarobni svitlikavi delci in sanjski efekti",
    category:    "fantasy",
    prompt:      "Magical transformation with thousands of glowing particles swirling around the person. Ethereal light beams, floating sparkles, and bokeh effects. Colors shift from warm gold to cool blue. The background dissolves into a dreamy, otherworldly space. Slow motion, magical realism.",
  },
  {
    id:          "epic-adventure",
    name:        "Epic Adventure",
    emoji:       "⚡",
    description: "Akcijska scena z dramatičnimi efekti",
    category:    "action",
    prompt:      "Action hero transformation. Dynamic energy bursts radiating from the person, dramatic wind effects on clothing and hair, debris floating in slow motion. Epic orchestral atmosphere implied through visual intensity. Lightning and power effects. Hyper-realistic, high contrast, IMAX quality.",
  },
  {
    id:          "joyful-burst",
    name:        "Joyful Burst",
    emoji:       "🎉",
    description: "Praznično vzdušje s konfeti in barvami",
    category:    "joyful",
    prompt:      "Joyful celebration explosion. Colorful confetti rains down from above, balloons float upward, streamers spiral around the person. The background transforms into a vibrant party scene with warm, festive lighting. Colors are saturated and cheerful. Happy, energetic, celebratory atmosphere.",
  },
  {
    id:          "elegant-flow",
    name:        "Elegant Flow",
    emoji:       "🌊",
    description: "Elegantni tekoči efekti z mehkimi barvami",
    category:    "elegant",
    prompt:      "Elegant fluid art transformation. Silk-like ribbons of color flow gracefully around the person, creating smooth, wave-like motions. Pastel and pearl tones blend seamlessly. The scene has a refined, artistic quality reminiscent of high-end fashion photography. Slow, graceful movement. Luxurious atmosphere.",
  },
];
