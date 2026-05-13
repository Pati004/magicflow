"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Camera, Video, Clock, Printer,
  Wifi, WifiOff, RefreshCw, X, ExternalLink,
} from "lucide-react";

// ─── Tipi ─────────────────────────────────────────────────────

interface Stats {
  photos:       number;
  videos:       number;
  successRate:  number;
  avgLatency:   number;
  failedVideos: number;
}

interface Session {
  id:         string;
  guestName:  string | null;
  status:     string;
  createdAt:  string;
  photoCount: number;
  videoCount: number;
  thumbnail:  string | null;
}

interface PrinterStatus {
  online:      boolean;
  paperLevel?: "ok" | "low" | "empty";
  message:     string;
}

interface Props {
  project:          { id: string; naziv: string; slug: string; createdAt: string };
  initialStats:     Stats;
  initialSessions:  Session[];
  printerStatus:    PrinterStatus;
  primaryColor:     string;
  kioskUrl:         string;
}

// ─── Komponenta ───────────────────────────────────────────────

export function OperatorDashboardClient({
  project, initialStats, initialSessions, printerStatus, primaryColor, kioskUrl,
}: Props) {
  const [stats,    setStats]    = useState<Stats>(initialStats);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [printer,  setPrinter]  = useState<PrinterStatus>(printerStatus);
  const [qrOpen,   setQrOpen]   = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncing,  setSyncing]  = useState(false);

  // ─── Polling vsakih 10s ────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setSyncing(true);
    try {
      const res  = await fetch(`/api/operator/${project.slug}/stats`);
      const data = await res.json() as { stats: Stats; sessions: Session[]; printer: PrinterStatus };
      setStats(data.stats);
      setSessions(data.sessions);
      setPrinter(data.printer);
      setLastSync(new Date());
    } catch {
      // Tiha napaka — ne motimo operaterja
    } finally {
      setSyncing(false);
    }
  }, [project.slug]);

  useEffect(() => {
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // ─── Stat kartice ─────────────────────────────────────────

  const statCards = [
    {
      label: "Fotografije danes",
      value: stats.photos,
      icon:  Camera,
      color: "#6671F5",
    },
    {
      label: "Generirani videi",
      value: stats.videos,
      sub:   `${stats.successRate}% uspešnih`,
      icon:  Video,
      color: primaryColor,
    },
    {
      label: "Povpr. latenca",
      value: stats.avgLatency > 0 ? `${(stats.avgLatency / 1000).toFixed(1)}s` : "—",
      icon:  Clock,
      color: "#22C55E",
    },
    {
      label: "Tiskalnik",
      value: printer.online ? "Online" : "Offline",
      sub:   printer.message,
      icon:  Printer,
      color: printer.online ? "#22C55E" : "#EF4444",
    },
  ];

  return (
    <div className="p-8 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{project.naziv}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Kiosk aktiven
            </span>
            <span className="text-ink-faint text-xs">•</span>
            <span className="text-ink-muted text-xs">
              Zadnja sinhronizacija: {lastSync.toLocaleTimeString("sl-SI")}
            </span>
            {syncing && <RefreshCw className="h-3 w-3 text-ink-muted animate-spin" />}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* QR za kiosk */}
          <button
            onClick={() => setQrOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-ink-ghost text-ink-muted hover:text-ink hover:border-gold/30 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            QR za kiosk
          </button>

          {/* Ročna osvežitev */}
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-ink-ghost text-ink-muted hover:text-ink transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Osveži
          </button>
        </div>
      </div>

      {/* Stat kartice */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-background-surface border border-ink-ghost rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-ink-muted uppercase tracking-wide">{label}</span>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{value}</p>
            {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Zadnje seje */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-ghost">
          <h2 className="font-semibold text-ink">Zadnje seje</h2>
          <a href={`/operator/${project.slug}/sessions`}
            className="text-xs text-ink-muted hover:text-gold transition-colors">
            Prikaži vse →
          </a>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Camera className="h-10 w-10 text-ink-faint mb-3" />
            <p className="text-ink-muted">Danes še ni sej</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-ghost">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 px-6 py-4 hover:bg-background-elevated transition-colors">
                {/* Miniatura */}
                <div className="h-12 w-12 rounded-xl overflow-hidden bg-background-elevated shrink-0">
                  {session.thumbnail ? (
                    <img src={session.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Camera className="h-5 w-5 text-ink-faint" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {session.guestName ?? "Anonimni gost"}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {new Date(session.createdAt).toLocaleTimeString("sl-SI")} •{" "}
                    {session.photoCount} foto • {session.videoCount} video
                  </p>
                </div>

                {/* Status */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  session.status === "COMPLETED"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-gold/10 text-gold"
                }`}>
                  {session.status === "COMPLETED" ? "Zaključena" : "Aktivna"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setQrOpen(false)}>
          <div className="bg-background-surface border border-ink-ghost rounded-3xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-ink text-lg">Kiosk QR koda</h3>
              <button onClick={() => setQrOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-2xl">
                <QRCodeSVG value={kioskUrl} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
              </div>
            </div>

            <p className="text-ink-muted text-sm mb-2">Prikaži ta QR na zaslonu pred kioskom</p>
            <p className="text-xs font-mono text-ink-faint bg-background-elevated px-3 py-2 rounded-lg">{kioskUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
