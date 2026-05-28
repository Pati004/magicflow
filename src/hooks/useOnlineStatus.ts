"use client";

import { useState, useEffect, useCallback } from "react";
import { syncPendingUploads, getPendingCount, cleanOldOfflineData } from "@/lib/kiosk/offline-storage";

export interface OnlineStatus {
  isOnline:       boolean;
  wasOffline:     boolean;   // true = bil offline, zdaj nazaj online
  pendingUploads: number;
  isSyncing:      boolean;
  lastOnline:     Date | null;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline,       setIsOnline]       = useState(true);
  const [wasOffline,     setWasOffline]      = useState(false);
  const [pendingUploads, setPendingUploads]  = useState(0);
  const [isSyncing,      setIsSyncing]       = useState(false);
  const [lastOnline,     setLastOnline]      = useState<Date | null>(null);

  // ─── Sync ob vrnitvi online ─────────────────────────────────

  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    setWasOffline(true);
    setLastOnline(new Date());

    // Počisti stare podatke
    await cleanOldOfflineData(48);

    // Preveri čakajoče uploade
    const count = await getPendingCount();
    if (count > 0) {
      setIsSyncing(true);
      const result = await syncPendingUploads();
      console.log(`[OnlineStatus] Sinhronizirano: ${result.synced}, neuspešno: ${result.failed}`);
      const remaining = await getPendingCount();
      setPendingUploads(remaining);
      setIsSyncing(false);
    }

    // Po 3s skrij "wasOffline" banner
    setTimeout(() => setWasOffline(false), 3000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setLastOnline(new Date());
  }, []);

  useEffect(() => {
    // Začetno stanje
    setIsOnline(navigator.onLine);

    // Listeners
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Preveri čakajoče ob zagonu
    getPendingCount().then(setPendingUploads);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline, pendingUploads, isSyncing, lastOnline };
}
