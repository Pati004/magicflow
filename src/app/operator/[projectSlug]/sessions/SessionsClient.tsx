"use client";

import { useState } from "react";
import { useRouter }               from "next/navigation";
import { Camera, Trash2, RefreshCw, CheckCircle, XCircle, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Video {
  id:       string;
  status:   string;
  videoUrl: string | null;
  model:    string;
}

interface Session {
  id:         string;
  guestName:  string | null;
  status:     string;
  createdAt:  string;
  photoCount: number;
  thumbnail:  string | null;
  videos:     Video[];
}

type SortKey = "createdAt" | "photoCount" | "status";
type SortDir = "asc" | "desc";

interface SessionsClientProps {
  projectSlug: string;
  projectId:   string;
  sessions:    Session[];
  filter:      "today" | "week" | "all";
}

const FILTERS = [
  { value: "today", label: "Danes" },
  { value: "week",  label: "Ta teden" },
  { value: "all",   label: "Vse" },
] as const;

export function SessionsClient({ projectSlug, sessions, filter }: SessionsClientProps) {
  const router                        = useRouter();
  const [deleting, setDel]            = useState<string | null>(null);
  const [sortKey,  setSortKey]        = useState<SortKey>("createdAt");
  const [sortDir,  setSortDir]        = useState<SortDir>("desc");

  const setFilter = (f: string) => {
    router.push(`/operator/${projectSlug}/sessions?filter=${f}`);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...sessions].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
    if (sortKey === "photoCount") cmp = a.photoCount - b.photoCount;
    if (sortKey === "status")    cmp = a.status.localeCompare(b.status);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Izbriši sejo in vse podatke? (GDPR)")) return;
    setDel(sessionId);
    try {
      const res = await fetch(`/api/operator/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Seja izbrisana");
        router.refresh();
      } else {
        toast.error("Napaka pri brisanju");
      }
    } catch {
      toast.error("Napaka pri brisanju");
    } finally {
      setDel(null);
    }
  };

  const handleRetry = async (videoId: string) => {
    try {
      await fetch(`/api/operator/videos/${videoId}/retry`, { method: "POST" });
      toast.success("Generiranje se ponovno zaganja...");
      router.refresh();
    } catch {
      toast.error("Napaka pri ponovnem zagonu");
    }
  };

  // Sortirni header gumb
  const SortBtn = ({ colKey, label }: { colKey: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(colKey)}
      className="flex items-center gap-1 hover:text-ink transition-colors group"
    >
      {label}
      <span className="flex flex-col opacity-40 group-hover:opacity-100">
        <ChevronUp   className={`h-2.5 w-2.5 -mb-0.5 ${sortKey === colKey && sortDir === "asc"  ? "opacity-100 text-gold" : ""}`} />
        <ChevronDown className={`h-2.5 w-2.5 ${sortKey === colKey && sortDir === "desc" ? "opacity-100 text-gold" : ""}`} />
      </span>
    </button>
  );

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Seje</h1>
          <p className="text-ink-muted text-sm mt-0.5">{sessions.length} sej</p>
        </div>
        <div className="flex gap-1 bg-background-surface border border-ink-ghost rounded-xl p-1">
          {FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => setFilter(value)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === value ? "rgba(255,176,32,0.15)" : "transparent",
                color:           filter === value ? "#FFB020" : "rgba(255,255,255,0.4)",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center bg-background-surface border border-ink-ghost rounded-2xl">
          <Camera className="h-12 w-12 text-ink-faint mb-4" />
          <p className="text-ink-muted text-lg font-medium mb-1">Ni sej</p>
          <p className="text-ink-faint text-sm">Za izbrani filter ni podatkov</p>
        </div>
      ) : (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-ink-ghost text-xs text-ink-muted uppercase tracking-wide">
            <span className="col-span-1">Foto</span>
            <span className="col-span-3">Gost</span>
            <span className="col-span-2"><SortBtn colKey="createdAt" label="Čas" /></span>
            <span className="col-span-2"><SortBtn colKey="photoCount" label="Foto" /></span>
            <span className="col-span-2"><SortBtn colKey="status" label="Video" /></span>
            <span className="col-span-2 text-right">Akcije</span>
          </div>

          {sorted.map((session) => {
            const hasFailedVideo = session.videos.some((v) => v.status === "ERROR");
            const videoStatus    = session.videos[0]?.status;

            return (
              <div key={session.id}
                className="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-ink-ghost last:border-0 hover:bg-background-elevated transition-colors">

                <div className="col-span-1">
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-background-elevated">
                    {session.thumbnail
                      ? <img src={session.thumbnail} alt="" className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center"><Camera className="h-4 w-4 text-ink-faint" /></div>
                    }
                  </div>
                </div>

                <div className="col-span-3">
                  <p className="text-sm font-medium text-ink truncate">{session.guestName ?? "Anonimni gost"}</p>
                  <p className="text-xs text-ink-muted font-mono truncate">{session.id.slice(0, 8)}…</p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-ink">{new Date(session.createdAt).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="text-xs text-ink-muted">{new Date(session.createdAt).toLocaleDateString("sl-SI")}</p>
                </div>

                <div className="col-span-2">
                  <span className="text-sm text-ink">{session.photoCount} foto</span>
                </div>

                <div className="col-span-2">
                  {!videoStatus
                    ? <span className="text-xs text-ink-faint">Ni videa</span>
                    : videoStatus === "DONE"
                    ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="h-3.5 w-3.5" />Uspešno</span>
                    : videoStatus === "ERROR"
                    ? <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3.5 w-3.5" />Napaka</span>
                    : <span className="flex items-center gap-1 text-xs text-gold"><Clock className="h-3.5 w-3.5" />V teku</span>
                  }
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  {hasFailedVideo && session.videos[0] && (
                    <button onClick={() => handleRetry(session.videos[0]!.id)}
                      className="h-8 w-8 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold flex items-center justify-center transition-colors"
                      title="Ponovi generiranje">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(session.id)}
                    disabled={deleting === session.id}
                    className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Izbriši sejo (GDPR)">
                    {deleting === session.id
                      ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
