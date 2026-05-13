"use client";

import { useEffect, useState } from "react";
import type { VideoStyle } from "@/types/pose-analysis";
import { DEFAULT_VIDEO_STYLES } from "@/types/pose-analysis";

interface StyleStepProps {
  primaryColor:  string;
  stylesPromise: Promise<VideoStyle[]>;
  onSelect:      (style: VideoStyle) => void;
  onBack:        () => void;
}

export function StyleStep({ primaryColor, stylesPromise, onSelect, onBack }: StyleStepProps) {
  const [styles,   setStyles]   = useState<VideoStyle[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);

  // Razreši promise ko pride analiza iz ozadja
  useEffect(() => {
    let alive = true;
    stylesPromise
      .then((s) => { if (alive) { setStyles(s.length > 0 ? s : DEFAULT_VIDEO_STYLES); setLoading(false); } })
      .catch(()  => { if (alive) { setStyles(DEFAULT_VIDEO_STYLES); setLoading(false); } });
    return () => { alive = false; };
  }, [stylesPromise]);

  const handleSelect = (style: VideoStyle) => {
    setSelected(style.id);
    setTimeout(() => onSelect(style), 350);
  };

  return (
    <div className="flex flex-col h-full w-full bg-black">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          style={{ minHeight: 48, minWidth: 48 }}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Izberi stil videa</h2>
          <p className="text-white/50 text-sm mt-0.5">
            {loading ? "Analiziramo vašo fotografijo..." : "Kakšen občutek želiš?"}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Indikator analize */}
      {loading && (
        <div
          className="mx-6 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}30` }}
        >
          <div
            className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
            style={{ borderColor: primaryColor, borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: primaryColor }}>
            AI analizira vašo pozo in prilagaja stile...
          </p>
        </div>
      )}

      {/* Grid stilov ali skeleton */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">

          {loading
            // Skeleton placeholderji
            ? Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 animate-pulse"
                  style={{ minHeight: 140, backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <div className="h-10 w-10 rounded-full bg-white/10 mb-3 mx-auto" />
                  <div className="h-4 w-20 bg-white/10 rounded mx-auto mb-2" />
                  <div className="h-3 w-28 bg-white/5 rounded mx-auto" />
                </div>
              ))
            // Dejanske kartice
            : (styles ?? DEFAULT_VIDEO_STYLES).map((style) => {
                const isSelected = selected === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleSelect(style)}
                    className="relative flex flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center transition-all duration-300 active:scale-95 overflow-hidden"
                    style={{
                      minHeight: 140,
                      backgroundColor: isSelected ? `${primaryColor}22` : "rgba(255,255,255,0.05)",
                      border: `2px solid ${isSelected ? primaryColor : "rgba(255,255,255,0.1)"}`,
                      boxShadow: isSelected ? `0 0 24px ${primaryColor}44` : "none",
                    }}
                  >
                    {isSelected && (
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }}
                      />
                    )}
                    <span className="text-4xl">{style.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-base">{style.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">{style.description}</p>
                    </div>
                    {isSelected && (
                      <div
                        className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <svg className="h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
