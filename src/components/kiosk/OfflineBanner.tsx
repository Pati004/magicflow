"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface OfflineBannerProps {
  primaryColor: string;
}

export function OfflineBanner({ primaryColor }: OfflineBannerProps) {
  const { isOnline, wasOffline, pendingUploads, isSyncing } = useOnlineStatus();

  // Online in ni bilo offline → nič ne prikaži
  if (isOnline && !wasOffline && pendingUploads === 0) return null;

  // Nazaj online
  if (isOnline && wasOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
        style={{ background: "rgba(34,197,94,0.15)", borderBottom: "1px solid rgba(34,197,94,0.2)" }}>
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-green-400">
          {isSyncing ? `Sinhronizacija... (${pendingUploads} fotografij)` : "Povezava vzpostavljena ✓"}
        </span>
      </div>
    );
  }

  // Offline
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2"
        style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
        <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-red-400 text-sm font-medium">Brez povezave — AI video ni na voljo</span>
        {pendingUploads > 0 && (
          <span className="text-red-400/60 text-xs">• {pendingUploads} fotografij čaka</span>
        )}
      </div>
    );
  }

  return null;
}
