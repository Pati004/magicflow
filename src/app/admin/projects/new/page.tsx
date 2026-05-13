import { requireAdmin } from "@/lib/auth";
import { ProjectForm } from "@/components/forms/ProjectForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nov projekt" };

export default async function NewProjectPage() {
  await requireAdmin();

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <Link
        href="/admin"
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Nazaj na projekte
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Nov projekt</h1>
        <p className="text-ink-muted text-sm mt-1">
          Izpolni vse zavihke in ustvari novo Magicflow izkušnjo.
        </p>
      </div>

      <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6">
        <ProjectForm mode="create" />
      </div>
    </div>
  );
}
