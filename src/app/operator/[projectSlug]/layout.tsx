import { requireOperator } from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { UserNav }         from "@/components/shared/UserNav";
import Link                from "next/link";
import { notFound }        from "next/navigation";
import { LayoutDashboard, List, FlaskConical, Zap } from "lucide-react";

interface OperatorLayoutProps {
  children: React.ReactNode;
  params:   { projectSlug: string };
}

export default async function OperatorLayout({ children, params }: OperatorLayoutProps) {
  await requireOperator();

  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
  });

  if (!project) notFound();

  const navItems = [
    { href: `/operator/${params.projectSlug}`,          label: "Dashboard",  icon: LayoutDashboard },
    { href: `/operator/${params.projectSlug}/sessions`, label: "Seje",       icon: List },
    { href: `/operator/${params.projectSlug}/test`,     label: "Test mode",  icon: FlaskConical },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-ink-ghost flex flex-col fixed h-full z-10 bg-background">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-ink-ghost">
          <div className="h-7 w-7 rounded-lg bg-gold-gradient flex items-center justify-center">
            <Zap className="h-4 w-4 text-black" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">Operator</p>
            <p className="text-sm font-semibold text-ink truncate">{project.naziv}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-background-elevated transition-colors group">
              <Icon className="h-4 w-4 group-hover:text-gold transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-ink-ghost">
          <UserNav />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56">{children}</main>
    </div>
  );
}
