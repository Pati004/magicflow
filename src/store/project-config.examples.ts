// =============================================================
//  MAGICFLOW — Primeri uporabe project-config sistema
// =============================================================

// ─── 1. Server Component — branje konfiguracije ───────────────

/*
// app/kiosk/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { getProjectConfig } from "@/lib/project-config";

export default async function KioskPage({ params }: { params: { slug: string } }) {
  const project = await prisma.project.findUnique({ where: { slug: params.slug } });
  if (!project) notFound();

  const config = await getProjectConfig(project.id);

  return (
    <div style={{ backgroundColor: config.branding.primaryColor }}>
      <h1>{config.event.eventName}</h1>
      {config.features.aiVideo && <VideoSection model={config.aiVideo.defaultModel} />}
      {config.features.printing && <PrintSection config={config.print} />}
    </div>
  );
}
*/

// ─── 2. Client Component — urejanje z Zustand store ──────────

/*
// components/admin/BrandingEditor.tsx
"use client";
import { useProjectConfigStore, selectBranding } from "@/store/project-config.store";
import { useEffect } from "react";

export function BrandingEditor({ projectId }: { projectId: string }) {
  const branding   = useProjectConfigStore(selectBranding);
  const setBranding = useProjectConfigStore((s) => s.setBranding);
  const loadConfig = useProjectConfigStore((s) => s.loadConfig);
  const saveConfig = useProjectConfigStore((s) => s.saveConfig);
  const isDirty    = useProjectConfigStore((s) => s.isDirty);

  useEffect(() => { loadConfig(projectId); }, [projectId]);

  return (
    <div>
      <input
        type="color"
        value={branding.primaryColor}
        onChange={(e) => setBranding({ primaryColor: e.target.value })}
      />
      {isDirty && (
        <button onClick={saveConfig}>Shrani spremembe</button>
      )}
    </div>
  );
}
*/

// ─── 3. API klic — PATCH konfiguracije ───────────────────────

/*
// Posodobi samo branding (deep merge — ostalo ostane)
const response = await fetch(`/api/projects/${projectId}/config`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    branding: {
      primaryColor: "#FF6B6B",
      fontFamily: "playfair",
    },
    features: {
      printing: true,
    }
  }),
});

const { config } = await response.json();
console.log(config.branding.primaryColor); // "#FF6B6B"
console.log(config.branding.logoUrl);      // Ostane iz prejšnje vrednosti!
*/

// ─── 4. Validacija konfiguracije ──────────────────────────────

/*
import { validateConfig } from "@/lib/project-config";

const result = validateConfig({
  branding: { primaryColor: "not-a-color" }, // ← napaka!
  features: { photoCapture: true },
  aiVideo:  { defaultModel: "RUNWAY_GEN3", enabledModels: [], ... },
  print:    { dpi: 300, format: "4x6", ... },
  event:    { eventName: "Test Event", ... },
});

if (!result.success) {
  console.log(result.errors.branding); 
  // { primaryColor: ["Neveljaven HEX barvni kod"] }
}
*/

// ─── 5. Deep merge primer ─────────────────────────────────────

/*
import { mergeConfig, DEFAULT_CONFIG } from "@/lib/project-config";

const custom = mergeConfig(DEFAULT_CONFIG, {
  branding: { primaryColor: "#6671F5" },
  features: { printing: true },
});

// custom.branding.primaryColor === "#6671F5"   (override)
// custom.branding.fontFamily   === "geist"     (iz DEFAULT_CONFIG)
// custom.features.printing     === true        (override)
// custom.features.aiVideo      === true        (iz DEFAULT_CONFIG)
*/

export {};
