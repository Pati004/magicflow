"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject, duplicateProject } from "@/lib/actions/projects";

interface ProjectActionsProps {
  projectId: string;
  slug:      string;
}

export function ProjectActions({ projectId, slug }: ProjectActionsProps) {
  const router              = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition]      = useTransition();

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        const result = await duplicateProject(projectId);
        if (result.success) {
          toast.success("Projekt podvojen");
          router.refresh();
        } else {
          toast.error("Napaka pri podvajanju");
        }
      } catch {
        toast.error("Napaka pri podvajanju");
      }
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    startTransition(async () => {
      try {
        await deleteProject(projectId);
        toast.success("Projekt izbrisan");
        router.refresh();
      } catch {
        toast.error("Napaka pri brisanju");
      }
      setConfirmDelete(false);
    });
  };

  return (
    <div className="flex items-center gap-1">
      {/* Kiosk */}
      <a
        href={`/kiosk/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Odpri kiosk"
      >
        <Button size="sm" variant="ghost" className="text-ink-muted hover:text-gold h-8 w-8 p-0">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </a>

      {/* Podvoji */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDuplicate}
        disabled={isPending}
        title="Podvoji projekt"
        className="text-ink-muted hover:text-ink h-8 w-8 p-0"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>

      {/* Izbriši — dvoklik za potrditev */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={isPending}
        title={confirmDelete ? "Klikni še enkrat za potrditev" : "Izbriši projekt"}
        className={`h-8 w-8 p-0 transition-colors ${confirmDelete ? "text-destructive bg-destructive/10 hover:bg-destructive/20" : "text-ink-muted hover:text-destructive"}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
