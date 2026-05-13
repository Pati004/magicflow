"use client";

import { useEffect, useState } from "react";

interface GeneratingStepProps {
  primaryColor: string;
  styleName:    string;
  progress:     number;
  elapsedMs:    number;
  status:       "starting" | "processing" | "done" | "error" | "timeout" | "idle";
  onCancel:     () => void;
}

const MESSAGES = [
  "Animiramo vaš nasmeh... 😄",
  "Dodajamo malo magije... ✨",
  "Skoraj gotovo... ⏳",
  "AI umetnik dela na polno... 🎨",
  "Mešamo piksle s čarovnijo... 🪄",
  "Ustvarjamo nepozabni trenutek... 🎬",
];

export function GeneratingStep({
  primaryColor,
  styleName,
  progress,
  elapsedMs,
  status,
  onCancel,
}: GeneratingStepProps) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 2500);
    return () => clearInterval(t);
  }, []);

  const elapsed    = Math.round(elapsedMs / 1000);
  const clampedPct = Math.min(Math.max(progress, status === "starting" ? 5 : 0), 95);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black px-8">

      {/* Krog napredka */}
      <div className="relative mb-10">
        <svg className="h-48 w-48 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={primaryColor}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - clampedPct / 100)}`}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{Math.round(clampedPct)}%</span>
          <span className="text-xs text-white/40 mt-1 uppercase tracking-widest">napredek</span>
        </div>
      </div>

      {/* Izbrani stil */}
      <div
        className="px-5 py-2 rounded-full text-sm font-medium mb-6 border"
        style={{ color: primaryColor, borderColor: `${primaryColor}44`, backgroundColor: `${primaryColor}11` }}
      >
        Stil: {styleName}
      </div>

      {/* Sporočilo */}
      <p
        key={msgIdx}
        className="text-white/70 text-xl text-center max-w-xs leading-relaxed mb-3"
        style={{ animation: "fadeIn 0.5s ease-out" }}
      >
        {MESSAGES[msgIdx]}
      </p>

      <p className="text-white/30 text-sm mb-12">
        {elapsed}s pretečenih
      </p>

      {/* Prekliči */}
      <button
        onClick={onCancel}
        className="px-8 py-4 rounded-xl text-white/50 font-medium text-base active:scale-[0.97] transition-transform hover:text-white"
        style={{ border: "1px solid rgba(255,255,255,0.15)", minHeight: 56 }}
      >
        Prekliči
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}
