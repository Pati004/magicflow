import { requireAdmin } from "@/lib/auth";
import { prisma }       from "@/lib/prisma";
import { formatDate }   from "@/lib/utils";
import { Users, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin — Uporabniki" };

export default async function UsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Uporabniki</h1>
        <p className="text-ink-muted text-sm mt-0.5">{users.length} registriranih uporabnikov</p>
      </div>

      <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-ghost">
              <th className="text-left px-5 py-3 text-ink-muted font-medium">Uporabnik</th>
              <th className="text-left px-5 py-3 text-ink-muted font-medium">Vloga</th>
              <th className="text-left px-5 py-3 text-ink-muted font-medium">Projekti</th>
              <th className="text-left px-5 py-3 text-ink-muted font-medium">Datum</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink-ghost/50 hover:bg-background-elevated transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-background-elevated border border-ink-ghost flex items-center justify-center">
                      <User className="h-4 w-4 text-ink-faint" />
                    </div>
                    <div>
                      <p className="font-medium text-ink">{u.name}</p>
                      <p className="text-xs text-ink-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={u.role === "ADMIN" ? "border-gold/30 text-gold" : "border-ink-ghost text-ink-muted"}>
                    {u.role === "ADMIN" ? <Shield className="h-3 w-3 mr-1 inline" /> : null}
                    {u.role}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-ink-muted">{u._count.projects}</td>
                <td className="px-5 py-3 text-ink-muted">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
