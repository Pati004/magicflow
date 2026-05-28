import { requireAdmin } from "@/lib/auth";
import { Settings } from "lucide-react";

export const metadata = { title: "Admin — Nastavitve" };

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Nastavitve</h1>
        <p className="text-ink-muted text-sm mt-0.5">Sistemske nastavitve platforme</p>
      </div>

      <div className="space-y-4">
        {[
          { label: "Različica platforme", value: "Magicflow v0.1.0" },
          { label: "Okolje",              value: process.env.NODE_ENV ?? "development" },
          { label: "Baza podatkov",       value: "Prisma Postgres" },
          { label: "AI provider",         value: "OpenAI + Runway" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-5 py-4 bg-background-surface border border-ink-ghost rounded-xl">
            <span className="text-sm text-ink-muted">{label}</span>
            <span className="text-sm font-medium text-ink font-mono">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl border border-ink-ghost bg-background-surface/50">
        <div className="flex items-center gap-2 text-ink-muted text-sm">
          <Settings className="h-4 w-4" />
          <span>Dodatne nastavitve bodo dodane v prihodnji verziji.</span>
        </div>
      </div>
    </div>
  );
}
