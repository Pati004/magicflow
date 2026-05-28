import { requireOperator } from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { UserNav }         from "@/components/shared/UserNav";
import { OperatorNav }     from "@/components/admin/OperatorNav";
import { notFound }        from "next/navigation";
import { Zap }             from "lucide-react";

interface OperatorLayoutProps {
  children: React.ReactNode;
  params:   { projectSlug: string };
}

export default async function OperatorLayout({ children, params }: OperatorLayoutProps) {
  const user = await requireOperator();

  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
  });

  if (!project) notFound();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-ink-ghost flex flex-col fixed h-full z-10 bg-background">
        {/* Logo + projekt naziv */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-ink-ghost">
          <div className="h-7 w-7 rounded-lg bg-gold-gradient flex items-center justify-center">
            <Zap className="h-4 w-4 text-black" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-ink-faint uppercase tracking-wider">Operator</p>
            <p className="text-sm font-semibold text-ink truncate">{project.naziv}</p>
          </div>
        </div>

        {/* Nav — client z aktivnim stanjem */}
        <OperatorNav projectSlug={params.projectSlug} />

        {/* Footer */}
        <div className="p-3 border-t border-ink-ghost">
          <UserNav role={user.role} />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56">{children}</main>
    </div>
  );
}
