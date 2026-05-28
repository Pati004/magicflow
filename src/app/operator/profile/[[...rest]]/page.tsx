import { requireOperator } from "@/lib/auth";
import { UserProfile }     from "@clerk/nextjs";
import Link                from "next/link";
import { Zap }             from "lucide-react";

export default async function ProfilePage() {
  await requireOperator();

  return (
    <div className="min-h-screen bg-background">
      {/* Header z logom — klik vrne na dashboard */}
      <header className="h-16 border-b border-ink-ghost bg-background-surface/50 flex items-center px-6">
        <Link
          href="/operator/dashboard"
          className="flex items-center gap-2.5 group"
          title="Nazaj na dashboard"
        >
          <div className="h-7 w-7 rounded-lg bg-gold-gradient flex items-center justify-center transition-opacity group-hover:opacity-80">
            <Zap className="h-4 w-4 text-black" />
          </div>
          <span className="font-semibold text-ink tracking-tight group-hover:text-gold transition-colors">
            Magicflow
          </span>
        </Link>
      </header>

      <div className="p-8">
        <h1 className="text-2xl font-semibold text-ink mb-8">Moj profil</h1>
        <UserProfile />
      </div>
    </div>
  );
}
