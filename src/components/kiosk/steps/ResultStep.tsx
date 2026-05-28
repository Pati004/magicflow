"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { FeatureFlags } from "@/types/project-config";

interface ResultStepProps {
  primaryColor: string;
  photoDataUrl: string;
  photoQrUrl:   string | null;
  videoUrl:     string | null;
  videoQrUrl:   string | null;
  printStarted: boolean;
  features:     FeatureFlags;
  onRestart:    () => void;
}

export function ResultStep({
  primaryColor,
  photoDataUrl,
  photoQrUrl,
  videoUrl,
  videoQrUrl,
  printStarted,
  features,
  onRestart,
}: ResultStepProps) {
  const videoRef            = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tab, setTab]       = useState<"video" | "photo">(videoUrl ? "video" : "photo");

  // Fade-in ob mountu
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoUrl]);

  // ─── Akcije ──────────────────────────────────────────────────

  const handleDownload = () => {
    const link    = document.createElement("a");
    link.href     = tab === "video" && videoUrl ? videoUrl : photoDataUrl;
    link.download = tab === "video" ? "magicflow-video.mp4" : "magicflow-foto.png";
    link.click();
  };

  const handleShare = async () => {
    const url = videoQrUrl ?? photoQrUrl ?? window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "Moj Magicflow video", url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeQrUrl = (tab === "video" ? videoQrUrl : photoQrUrl) ?? photoQrUrl ?? videoQrUrl;
  const qrLabel     = tab === "video" && videoQrUrl ? "Skeniraj za video" : "Skeniraj za fotografijo";

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col md:flex-row h-full w-full bg-black overflow-hidden transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >

      {/* ══ LEVO / ZGORAJ — media ══════════════════════════════ */}
      <div className="relative h-[45vh] md:h-auto md:w-[60%] shrink-0 bg-black">

        {/* Video */}
        {videoUrl && tab === "video" ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoDataUrl}
            alt="Fotografija"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}

        {/* Gradient spodaj */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Video/foto tab switcher */}
        {videoUrl && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 bg-black/50 backdrop-blur-sm rounded-full p-1">
            {(["video", "photo"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: tab === t ? primaryColor : "transparent",
                  color:           tab === t ? "black" : "rgba(255,255,255,0.6)",
                  minHeight: 40,
                }}
              >
                {t === "video" ? "🎬 Video" : "📷 Foto"}
              </button>
            ))}
          </div>
        )}

        {/* Tisk obvestilo */}
        {printStarted && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
              <span className="text-base">🖨️</span>
              <span className="text-white/70 text-sm">Fotografija se tiska...</span>
            </div>
          </div>
        )}
      </div>

      {/* ══ DESNO / SPODAJ — QR + gumbi ═══════════════════════ */}
      <div className="flex flex-col items-center justify-between flex-1 px-5 py-6 md:border-l border-t md:border-t-0 border-white/5 overflow-y-auto">

        {/* QR koda — čim večja */}
        <div className="flex flex-col items-center gap-3 w-full flex-1 justify-center">
          {activeQrUrl ? (
            <>
              <p className="text-white/40 text-xs tracking-widest uppercase">{qrLabel}</p>
              <div
                className="bg-white rounded-3xl p-3 shadow-2xl w-full"
                style={{ maxWidth: "min(100%, 320px)" }}
              >
                <QRCodeSVG
                  value={activeQrUrl}
                  size={294}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center"
                style={{ minWidth: 200, minHeight: 200, width: "min(100%, 280px)", height: "min(100%, 280px)" }}
              >
                <div
                  className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: primaryColor, borderTopColor: "transparent" }}
                />
              </div>
              <p className="text-white/30 text-xs">Pripravljam QR kodo...</p>
            </div>
          )}
        </div>

        {/* Razdelilna linija */}
        <div className="w-full h-px bg-white/[0.08] my-4" />

        {/* Akcijski gumbi — samo vklopljene funkcije */}
        <div className="flex flex-col gap-3 w-full">

          {/* Prenesi — samo če je foto ali video vklopljen */}
          {(features.photoCapture || features.aiVideo) && (
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-full rounded-2xl text-black font-semibold text-base active:scale-[0.97] transition-transform"
              style={{ backgroundColor: primaryColor, minHeight: 64 }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Prenesi
            </button>
          )}

          {/* Deli — samo če je qrDistribution vklopljen */}
          {features.qrDistribution && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 w-full rounded-2xl text-white font-semibold text-base active:scale-[0.97] transition-transform"
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                minHeight: 64,
              }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {copied ? "Kopirano ✓" : "Deli"}
            </button>
          )}

          {/* Začni znova — vedno */}
          <button
            onClick={onRestart}
            className="w-full rounded-xl text-white/40 text-sm font-medium active:scale-[0.97] transition-all hover:text-white/70"
            style={{ minHeight: 48 }}
          >
            ↩ Začni znova
          </button>
        </div>
      </div>
    </div>
  );
}
