import { requireAdmin } from "@/lib/auth";
import { UserNav } from "@/components/shared/UserNav";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/admin",          label: "Pregled",    icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projekti",   icon: FolderKanban },
  { href: "/admin/users",    label: "Uporabniki", icon: Users },
  { href: "/admin/analytics",label: "Analitika",  icon: BarChart3 },
  { href: "/admin/settings", label: "Nastavitve", icon: Settings },
];

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

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-background-elevated transition-colors group"
            >
              <Icon className="h-4 w-4 group-hover:text-gold transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

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
