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
  const isError    = status === "error" || status === "timeout";

  // ─── Error / timeout stanje ──────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black px-8 text-center">
        <div
          className="h-24 w-24 rounded-full flex items-center justify-center mb-8"
          style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.3)" }}
        >
          <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          {status === "timeout" ? "Prekoračen čas" : "Napaka pri generiranju"}
        </h2>
        <p className="text-white/40 text-base max-w-xs mb-10 leading-relaxed">
          {status === "timeout"
            ? "AI model se ni odzval v predvidenem času. Poskusi znova ali izberi drug stil."
            : "Med generiranjem videa je prišlo do napake. Poskusi znova."}
        </p>

        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-3 w-full max-w-xs rounded-2xl text-black font-semibold text-lg active:scale-[0.97] transition-transform"
          style={{ backgroundColor: primaryColor, minHeight: 64 }}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Poskusi znova
        </button>
      </div>
    );
  }

  // ─── Normalno stanje — generiranje ───────────────────────────

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
