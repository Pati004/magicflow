"use client";

import { useEffect, useState } from "react";

interface LoadingStepProps {
  primaryColor: string;
  style:        string;
}

const MESSAGES = [
  "Analiziramo tvojo pozo... 🔍",
  "Zbujamo AI umetnika... 🎨",
  "Mešamo piksle s čarovnijo... ✨",
  "Dodajamo dramatičen šarm... 🎭",
  "Renderiramo magijo... 🪄",
  "Skoraj gotovo! Še trenutek... ⏳",
];

export function LoadingStep({ primaryColor, style }: LoadingStepProps) {
  const [progress,    setProgress]    = useState(0);
  const [messageIdx,  setMessageIdx]  = useState(0);

  useEffect(() => {
    // Napredek
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(progressInterval); return 95; }
        return p + Math.random() * 8;
      });
    }, 800);

    // Sporočila
    const messageInterval = setInterval(() => {
      setMessageIdx((i) => (i + 1) % MESSAGES.length);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, []);

  const clampedProgress = Math.min(progress, 95);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black px-8">
      {/* Animirani loader */}
      <div className="relative mb-12">
        {/* Zunanji ring */}
        <svg className="h-48 w-48 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={primaryColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - clampedProgress / 100)}`}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>

        {/* Centralni tekst */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{Math.round(clampedProgress)}%</span>
          <span className="text-xs text-white/40 mt-1 uppercase tracking-widest">napredek</span>
        </div>

        {/* Pikice ki krožijo */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute h-3 w-3 rounded-full"
            style={{
              backgroundColor: primaryColor,
              top:  "50%",
              left: "50%",
              transformOrigin: "-80px 0",
              animation: `spin 2s linear ${i * 0.66}s infinite`,
              marginTop:  "-6px",
              marginLeft: "-6px",
            }}
          />
        ))}
      </div>

      {/* Stil */}
      <div
        className="px-6 py-2 rounded-full text-sm font-medium mb-8 border"
        style={{
          color:           primaryColor,
          borderColor:     `${primaryColor}44`,
          backgroundColor: `${primaryColor}11`,
        }}
      >
        Stil: {style}
      </div>

      {/* Sporočilo */}
      <p
        key={messageIdx}
        className="text-white/70 text-xl text-center max-w-xs leading-relaxed"
        style={{ animation: "fadeIn 0.5s ease-out" }}
      >
        {MESSAGES[messageIdx]}
      </p>

      {/* Napotek */}
      <p className="text-white/25 text-sm mt-6 text-center">
        AI ustvarja personaliziran video zate
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg) translateX(80px); }
          to   { transform: rotate(360deg) translateX(80px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
