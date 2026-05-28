import { requireAdmin } from "@/lib/auth";
import { UserNav }    from "@/components/shared/UserNav";
import { AdminNav }   from "@/components/admin/AdminNav";
import { Zap }        from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-background flex">

      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-60 border-r border-ink-ghost flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-ink-ghost">
          <div className="h-7 w-7 rounded-lg bg-gold-gradient flex items-center justify-center">
            <Zap className="h-4 w-4 text-black" />
          </div>
          <span className="font-semibold text-ink tracking-tight">Magicflow</span>
          <span className="ml-auto text-[10px] font-medium text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
            ADMIN
          </span>
        </div>

        {/* Nav — client component z aktivnim stanjem */}
        <AdminNav />

        {/* Footer */}
        <div className="p-3 border-t border-ink-ghost">
          <UserNav role={user.role} />
        </div>
      </aside>

      {/* ─── Main ────────────────────────────────────────────── */}
      <main className="flex-1 ml-60">
        {children}
      </main>
    </div>
  );
}
