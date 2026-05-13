import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-destructive-subtle border border-destructive/20">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-ink mb-2">
          Dostop zavrnjen
        </h1>
        <p className="text-ink-muted mb-8">
          Nimate ustreznih pravic za dostop do te strani.
          Kontaktirajte administratorja za pomoč.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/operator/dashboard"
            className="px-4 py-2 rounded-lg bg-background-elevated text-ink text-sm hover:bg-background-surface transition-colors border border-ink-ghost"
          >
            ← Na dashboard
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-gold text-black text-sm font-medium hover:bg-gold-500 transition-colors"
          >
            Domov
          </Link>
        </div>
      </div>
    </div>
  );
}
