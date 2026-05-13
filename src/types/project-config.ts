// =============================================================
//  MAGICFLOW — Project Config Types
// =============================================================

// ─── Pod-tipi ─────────────────────────────────────────────────

export interface BrandingConfig {
  primaryColor:    string;        // HEX, npr. "#FFB020"
  logoUrl:         string;        // Cloudinary URL
  logoPublicId:    string;        // Cloudinary Public ID
  fontFamily:      "geist" | "playfair" | "syne";
  backgroundStyle: "dark" | "light" | "gradient" | "custom";
  customBgUrl?:    string;        // Samo če backgroundStyle === "custom"
}

export interface FeatureFlags {
  photoCapture:    boolean;       // Zajem fotografij na kiosku
  aiVideo:         boolean;       // AI generiranje videov
  printing:        boolean;       // Tiskanje fotografij
  qrDistribution:  boolean;       // Deljenje z QR kodo
  offlineMode:     boolean;       // Delovanje brez interneta
}

export type AIVideoModel = "RUNWAY_GEN3" | "KLING_V1" | "KLING_V2" | "LUMA_DREAM" | "PIKA_V2";

export interface AIVideoConfig {
  defaultModel:       AIVideoModel;
  enabledModels:      AIVideoModel[];
  maxGenerationTime:  number;      // sekunde (10–300)
  emotionalStyles:    string[];    // npr. ["Dramatično", "Igriva"]
  promptTemplate?:    string;      // Osnova za AI prompt
}

export interface PrintConfig {
  dpi:         150 | 300 | 600;
  format:      "4x6" | "5x7";
  headerText:  string;
  footerText:  string;
  copies:      number;            // 1–5
}

export interface EventInfo {
  eventName:     string;
  date:          string;          // ISO datum
  location:      string;
  organizerName: string;
  logoUrl?:      string;
}

// ─── Glavni interface ──────────────────────────────────────────

export interface ProjectConfig {
  branding:  BrandingConfig;
  features:  FeatureFlags;
  aiVideo:   AIVideoConfig;
  print:     PrintConfig;
  event:     EventInfo;
}

// ─── Parcialni tipi za PATCH ──────────────────────────────────

export type PartialProjectConfig = {
  branding?: Partial<BrandingConfig>;
  features?: Partial<FeatureFlags>;
  aiVideo?:  Partial<AIVideoConfig>;
  print?:    Partial<PrintConfig>;
  event?:    Partial<EventInfo>;
};

// ─── Config z meta podatki ────────────────────────────────────

export interface ProjectConfigWithMeta extends ProjectConfig {
  projectId:  string;
  updatedAt:  Date;
  isDefault:  boolean;           // true = samo defaults, ni še customiziran
}

// ─── Rezultat validacije ──────────────────────────────────────

export type ConfigValidationResult =
  | { success: true;  config: ProjectConfig; errors: null }
  | { success: false; config: null;          errors: ConfigValidationErrors };

export interface ConfigValidationErrors {
  branding?: Record<string, string[]>;
  features?: Record<string, string[]>;
  aiVideo?:  Record<string, string[]>;
  print?:    Record<string, string[]>;
  event?:    Record<string, string[]>;
}
