"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Users, BarChart3, Settings, FlaskConical, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin",               label: "Pregled",    icon: LayoutDashboard, exact: true },
  { href: "/admin/projects",      label: "Projekti",   icon: FolderKanban,    exact: false },
  { href: "/admin/users",         label: "Uporabniki", icon: Users,           exact: false },
  { href: "/admin/analytics",     label: "Analitika",  icon: BarChart3,       exact: false },
  { href: "/admin/eval",          label: "Evalvacija", icon: FlaskConical,    exact: false },
  { href: "/admin/ux-study",      label: "UX Study",   icon: ClipboardList,   exact: false },
  { href: "/admin/settings",      label: "Nastavitve", icon: Settings,        exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
              active
                ? "bg-gold/10 text-gold"
                : "text-ink-muted hover:text-ink hover:bg-background-elevated"
            )}
          >
            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-gold" : "group-hover:text-gold")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
