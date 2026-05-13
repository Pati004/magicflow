"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { Camera, Trash2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

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

export function SessionsClient({ projectSlug, projectId, sessions, filter }: SessionsClientProps) {
  const router             = useRouter();
  const [pending, startT]  = useTransition();
  const [deleting, setDel] = useState<string | null>(null);

  const setFilter = (f: string) => {
    router.push(`/operator/${projectSlug}/sessions?filter=${f}`);
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Izbriši sejo in vse podatke? (GDPR)")) return;
    setDel(sessionId);
    try {
      await fetch(`/api/operator/sessions/${sessionId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDel(null);
    }
  };

  const handleRetry = async (videoId: string) => {
    await fetch(`/api/operator/videos/${videoId}/retry`, { method: "POST" });
    router.refresh();
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Seje</h1>
          <p className="text-ink-muted text-sm mt-0.5">{sessions.length} sej</p>
        </div>

        {/* Filter */}
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
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center bg-background-surface border border-ink-ghost rounded-2xl">
          <Camera className="h-12 w-12 text-ink-faint mb-4" />
          <p className="text-ink-muted">Ni sej za izbrani filter</p>
        </div>
      ) : (
        <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
          {/* Header vrstice */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-ink-ghost text-xs text-ink-muted uppercase tracking-wide">
            <span className="col-span-1">Foto</span>
            <span className="col-span-3">Gost</span>
            <span className="col-span-2">Čas</span>
            <span className="col-span-2">Foto</span>
            <span className="col-span-2">Video</span>
            <span className="col-span-2 text-right">Akcije</span>
          </div>

          {/* Vrstice */}
          {sessions.map((session) => {
            const hasFailedVideo = session.videos.some((v) => v.status === "ERROR");
            const videoStatus    = session.videos[0]?.status;

            return (
              <div key={session.id}
                className="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-ink-ghost last:border-0 hover:bg-background-elevated transition-colors">

                {/* Thumbnail */}
                <div className="col-span-1">
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-background-elevated">
                    {session.thumbnail ? (
                      <img src={session.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Camera className="h-4 w-4 text-ink-faint" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Gost */}
                <div className="col-span-3">
                  <p className="text-sm font-medium text-ink truncate">
                    {session.guestName ?? "Anonimni gost"}
                  </p>
                  <p className="text-xs text-ink-muted font-mono truncate">{session.id.slice(0, 8)}…</p>
                </div>

                {/* Čas */}
                <div className="col-span-2">
                  <p className="text-sm text-ink">{new Date(session.createdAt).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="text-xs text-ink-muted">{new Date(session.createdAt).toLocaleDateString("sl-SI")}</p>
                </div>

                {/* Število fotografij */}
                <div className="col-span-2">
                  <span className="text-sm text-ink">{session.photoCount} foto</span>
                </div>

                {/* Video status */}
                <div className="col-span-2">
                  {!videoStatus ? (
                    <span className="text-xs text-ink-faint">Ni videa</span>
                  ) : videoStatus === "DONE" ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle className="h-3.5 w-3.5" /> Uspešno
                    </span>
                  ) : videoStatus === "ERROR" ? (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle className="h-3.5 w-3.5" /> Napaka
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gold">
                      <Clock className="h-3.5 w-3.5" /> V teku
                    </span>
                  )}
                </div>

                {/* Akcije */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {/* Ponovni zagon če napaka */}
                  {hasFailedVideo && session.videos[0] && (
                    <button onClick={() => handleRetry(session.videos[0]!.id)}
                      className="h-8 w-8 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold flex items-center justify-center transition-colors"
                      title="Ponovi generiranje">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Briši */}
                  <button onClick={() => handleDelete(session.id)}
                    disabled={deleting === session.id}
                    className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
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
