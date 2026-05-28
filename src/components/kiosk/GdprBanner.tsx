"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "gdpr_consent";

interface GdprBannerProps {
  primaryColor: string;
  projectId:    string;
}

export function GdprBanner({ primaryColor, projectId }: GdprBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${projectId}`);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [projectId]);

  const handleAccept = () => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${projectId}`, Date.now().toString());
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-4"
      style={{ animation: "slideUp 0.3s ease-out" }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4 rounded-2xl backdrop-blur-md"
        style={{
          backgroundColor: "rgba(10,10,15,0.92)",
          border:          "1px solid rgba(255,255,255,0.1)",
          boxShadow:       "0 -4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Ikona */}
        <span className="text-xl shrink-0">🔒</span>

        {/* Besedilo */}
        <p className="flex-1 text-sm text-white/60 leading-snug">
          S fotografiranjem se strinjate z obdelavo osebnih podatkov.{" "}
          <span className="text-white/40">Posnetki se samodejno izbrišejo po 48 urah.</span>
        </p>

        {/* Gumb */}
        <button
          onClick={handleAccept}
          className="shrink-0 px-5 py-2.5 rounded-xl text-black text-sm font-semibold active:scale-[0.97] transition-transform"
          style={{ backgroundColor: primaryColor, minHeight: 44, minWidth: 100 }}
        >
          Razumem
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
