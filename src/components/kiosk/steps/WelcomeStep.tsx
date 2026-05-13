"use client";

import { useEffect, useState } from "react";
import type { ProjectConfigWithMeta } from "@/types/project-config";

interface WelcomeStepProps {
  config:  ProjectConfigWithMeta;
  onStart: () => void;
}

export function WelcomeStep({ config, onStart }: WelcomeStepProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1500);
    return () => clearInterval(t);
  }, []);

  const { branding, event } = config;

  return (
    <div
      className="relative flex flex-col items-center justify-center h-full w-full select-none"
      onClick={onStart}
    >
      {/* Ozadje z gradientom */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse at center, ${branding.primaryColor}88 0%, transparent 70%)`,
        }}
      />

      {/* Logo */}
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt="Logo"
          className="h-24 w-auto object-contain mb-10 drop-shadow-2xl"
        />
      ) : (
        <div
          className="h-20 w-20 rounded-2xl mb-10 flex items-center justify-center text-3xl font-bold text-black shadow-2xl"
          style={{ backgroundColor: branding.primaryColor }}
        >
          M
        </div>
      )}

      {/* Ime dogodka */}
      {event.eventName && (
        <p className="text-lg text-white/60 mb-3 tracking-widest uppercase font-light">
          {event.eventName}
        </p>
      )}

      <h1 className="text-5xl md:text-7xl font-bold text-white text-center mb-4 leading-tight">
        Dobrodošli
      </h1>

      {event.location && (
        <p className="text-white/50 text-sm mb-16 tracking-wide">{event.location}</p>
      )}

      {/* CTA gumb */}
      <button
        onClick={onStart}
        className="relative flex flex-col items-center gap-3 mt-4"
        style={{ minHeight: 48, minWidth: 48 }}
      >
        {/* Pulzirajoči krog */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: branding.primaryColor }}
          />
          <div
            className="relative h-28 w-28 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-300 active:scale-95"
            style={{ backgroundColor: branding.primaryColor }}
          >
            <svg className="h-12 w-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        </div>
        <span
          className={`text-xl font-semibold tracking-wide transition-opacity duration-700 ${pulse ? "opacity-100" : "opacity-50"}`}
          style={{ color: branding.primaryColor }}
        >
          Dotakni se za začetek
        </span>
      </button>
    </div>
  );
}
