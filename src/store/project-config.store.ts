import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ProjectConfig,
  PartialProjectConfig,
  BrandingConfig,
  FeatureFlags,
  AIVideoConfig,
  PrintConfig,
  EventInfo,
} from "@/types/project-config";
import { DEFAULT_CONFIG, mergeConfig, validateConfig } from "@/lib/project-config";

// ─── Stanje ───────────────────────────────────────────────────

interface ProjectConfigState {
  // Data
  projectId:    string | null;
  config:       ProjectConfig;
  savedConfig:  ProjectConfig;    // Zadnje shranjeno stanje
  isDirty:      boolean;          // Neshranjene spremembe
  isLoading:    boolean;
  isSaving:     boolean;
  errors:       Record<string, string[]>;

  // Akcije — branje
  loadConfig:   (projectId: string) => Promise<void>;

  // Akcije — urejanje (brez shranjevanja)
  setBranding:  (patch: Partial<BrandingConfig>) => void;
  setFeatures:  (patch: Partial<FeatureFlags>)   => void;
  setAIVideo:   (patch: Partial<AIVideoConfig>)  => void;
  setPrint:     (patch: Partial<PrintConfig>)    => void;
  setEvent:     (patch: Partial<EventInfo>)      => void;
  setConfig:    (patch: PartialProjectConfig)    => void;

  // Akcije — shranjevanje
  saveConfig:   () => Promise<boolean>;
  discardChanges: () => void;

  // Akcije — reset
  resetToDefaults: () => void;
  clearStore:      () => void;
}

// ─── Store ────────────────────────────────────────────────────

export const useProjectConfigStore = create<ProjectConfigState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // ─── Začetno stanje ─────────────────────────────────

        projectId:   null,
        config:      DEFAULT_CONFIG,
        savedConfig: DEFAULT_CONFIG,
        isDirty:     false,
        isLoading:   false,
        isSaving:    false,
        errors:      {},

        // ─── Naloži konfiguracijo iz API ─────────────────────

        loadConfig: async (projectId: string) => {
          set((state) => { state.isLoading = true; state.errors = {}; });

          try {
            const res = await fetch(`/api/projects/${projectId}/config`);
            if (!res.ok) throw new Error("Napaka pri nalaganju konfiguracije");

            const data = await res.json();
            const { config } = data;

            set((state) => {
              state.projectId   = projectId;
              state.config      = config;
              state.savedConfig = config;
              state.isDirty     = false;
              state.isLoading   = false;
            });

          } catch (err) {
            set((state) => {
              state.isLoading = false;
              state.errors = { global: [(err as Error).message] };
            });
          }
        },

        // ─── Setter za branding ──────────────────────────────

        setBranding: (patch) => {
          set((state) => {
            state.config.branding = { ...state.config.branding, ...patch };
            state.isDirty = true;
          });
        },

        // ─── Setter za features ──────────────────────────────

        setFeatures: (patch) => {
          set((state) => {
            state.config.features = { ...state.config.features, ...patch };
            state.isDirty = true;
          });
        },

        // ─── Setter za AI video ──────────────────────────────

        setAIVideo: (patch) => {
          set((state) => {
            state.config.aiVideo = { ...state.config.aiVideo, ...patch };
            state.isDirty = true;
          });
        },

        // ─── Setter za print ─────────────────────────────────

        setPrint: (patch) => {
          set((state) => {
            state.config.print = { ...state.config.print, ...patch };
            state.isDirty = true;
          });
        },

        // ─── Setter za event ─────────────────────────────────

        setEvent: (patch) => {
          set((state) => {
            state.config.event = { ...state.config.event, ...patch };
            state.isDirty = true;
          });
        },

        // ─── Generični setter ────────────────────────────────

        setConfig: (patch) => {
          set((state) => {
            state.config = mergeConfig(state.config, patch);
            state.isDirty = true;
          });
        },

        // ─── Shrani v API ────────────────────────────────────

        saveConfig: async () => {
          const { projectId, config } = get();
          if (!projectId) return false;

          // Validiraj pred shranjevanjem
          const validation = validateConfig(config);
          if (!validation.success) {
            set((state) => {
              state.errors = validation.errors as Record<string, string[]>;
            });
            return false;
          }

          set((state) => { state.isSaving = true; state.errors = {}; });

          try {
            const res = await fetch(`/api/projects/${projectId}/config`, {
              method:  "PATCH",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify(config),
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error ?? "Napaka pri shranjevanju");
            }

            set((state) => {
              state.savedConfig = state.config;
              state.isDirty     = false;
              state.isSaving    = false;
            });

            return true;

          } catch (err) {
            set((state) => {
              state.isSaving = false;
              state.errors = { global: [(err as Error).message] };
            });
            return false;
          }
        },

        // ─── Zavrzi spremembe ────────────────────────────────

        discardChanges: () => {
          set((state) => {
            state.config  = state.savedConfig;
            state.isDirty = false;
            state.errors  = {};
          });
        },

        // ─── Ponastavi na defaults ───────────────────────────

        resetToDefaults: () => {
          set((state) => {
            state.config  = DEFAULT_CONFIG;
            state.isDirty = true;
            state.errors  = {};
          });
        },

        // ─── Počisti store ───────────────────────────────────

        clearStore: () => {
          set((state) => {
            state.projectId   = null;
            state.config      = DEFAULT_CONFIG;
            state.savedConfig = DEFAULT_CONFIG;
            state.isDirty     = false;
            state.isLoading   = false;
            state.isSaving    = false;
            state.errors      = {};
          });
        },
      }))
    ),
    { name: "project-config-store" }
  )
);

// ─── Selektorji ───────────────────────────────────────────────
// Uporabi za preprečitev nepotrebnega re-renderinga

export const selectBranding  = (s: ProjectConfigState) => s.config.branding;
export const selectFeatures  = (s: ProjectConfigState) => s.config.features;
export const selectAIVideo   = (s: ProjectConfigState) => s.config.aiVideo;
export const selectPrint     = (s: ProjectConfigState) => s.config.print;
export const selectEvent     = (s: ProjectConfigState) => s.config.event;
export const selectIsDirty   = (s: ProjectConfigState) => s.config && s.isDirty;
export const selectIsSaving  = (s: ProjectConfigState) => s.isSaving;
export const selectErrors    = (s: ProjectConfigState) => s.errors;
