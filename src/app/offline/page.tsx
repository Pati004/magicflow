"use client";

import { useEffect, useState } from "react";
import { getPendingCount }     from "@/lib/kiosk/offline-storage";

export default function OfflinePage() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    getPendingCount().then(setPending);

    const onOnline = () => window.location.reload();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center px-6 text-center">
      {/* Ikona */}
      <div className="mb-8">
        <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <svg className="h-12 w-12 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-400 text-sm font-medium font-mono">Brez povezave</span>
        </div>
      </div>

      {/* Naslov */}
      <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
        Offline način
      </h1>

      <p className="text-white/50 text-lg mb-3 max-w-md">
        Ni internetne povezave — AI video generiranje ni na voljo.
      </p>

      <p className="text-white/30 text-sm mb-12 max-w-sm">
        Fotografiranje je še vedno možno. Fotografije bodo shranjene lokalno in sinhronizirane, ko se vzpostavi povezava.
      </p>

      {/* Kaj deluje */}
      <div className="grid grid-cols-2 gap-3 max-w-sm w-full mb-12">
        {[
          { icon: "📷", label: "Fotografiranje",  ok: true  },
          { icon: "💾", label: "Lokalno shranjevanje", ok: true  },
          { icon: "🎬", label: "AI video",        ok: false },
          { icon: "☁️", label: "Cloudinary upload", ok: false },
        ].map(({ icon, label, ok }) => (
          <div key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)"}` }}
          >
            <span>{icon}</span>
            <span className="text-sm" style={{ color: ok ? "#22C55E" : "#EF4444" }}>{label}</span>
            <span className="ml-auto text-xs">{ok ? "✓" : "✗"}</span>
          </div>
        ))}
      </div>

      {/* Čakajoči uploadi */}
      {pending > 0 && (
        <div className="mb-8 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 text-sm">
            {pending} fotografij čaka na sinhronizacijo
          </p>
        </div>
      )}

      {/* Navodila */}
      <p className="text-white/20 text-xs max-w-xs">
        Stran se bo samodejno osvežila ko se vzpostavi internetna povezava.
      </p>
    </main>
  );
}
