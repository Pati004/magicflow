"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, FlaskConical, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperatorNavProps {
  projectSlug: string;
}

export function OperatorNav({ projectSlug }: OperatorNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/operator/${projectSlug}`,          label: "Dashboard", icon: LayoutDashboard, exact: true  },
    { href: `/operator/${projectSlug}/sessions`, label: "Seje",      icon: List,            exact: false },
    { href: `/operator/${projectSlug}/test`,     label: "Test mode", icon: FlaskConical,    exact: false },
  ];

  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {/* Nazaj na moje projekte */}
      <Link
        href="/operator/dashboard"
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-ink-faint hover:text-ink-muted transition-colors mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Moji projekti
      </Link>

      <div className="h-px bg-ink-ghost mb-3" />

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
            <Icon className={cn("h-4 w-4", active ? "text-gold" : "group-hover:text-gold transition-colors")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
