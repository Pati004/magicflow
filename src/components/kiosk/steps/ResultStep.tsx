"use client";

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface ResultStepProps {
  primaryColor:  string;
  photoDataUrl:  string;
  photoQrUrl:    string | null;   // Cloudinary URL za QR
  videoUrl:      string | null;
  videoQrUrl:    string | null;   // URL za video QR
  printStarted:  boolean;
  onRestart:     () => void;
}

export function ResultStep({
  primaryColor,
  photoDataUrl,
  photoQrUrl,
  videoUrl,
  videoQrUrl,
  printStarted,
  onRestart,
}: ResultStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoUrl]);

  // ─── Samo tisk ────────────────────────────────────────────────

  if (printStarted && !videoUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black px-8 text-center">
        <div className="text-8xl mb-6 animate-bounce">🖨️</div>
        <h2 className="text-3xl font-bold text-white mb-3">Vaša fotografija se tiska!</h2>
        <p className="text-white/50 text-lg mb-10 max-w-xs">
          Prosim počakajte trenutek — fotografija se tiska.
        </p>

        {photoQrUrl && (
          <div className="flex flex-col items-center gap-3 mb-10">
            <p className="text-white/40 text-xs tracking-widest uppercase">Skenirajte za digitalno kopijo</p>
            <div className="bg-white rounded-2xl p-3 shadow-lg">
              <QRCodeSVG value={photoQrUrl} size={120} bgColor="#ffffff" fgColor="#000000" level="M" />
            </div>
          </div>
        )}

        <button
          onClick={onRestart}
          className="px-10 py-5 rounded-xl text-black font-semibold text-lg active:scale-[0.97] transition-transform"
          style={{ backgroundColor: primaryColor, minHeight: 56 }}
        >
          Začni znova
        </button>
      </div>
    );
  }

  // ─── Video (+ morda tisk) ─────────────────────────────────────

  if (videoUrl) {
    return (
      <div className="flex flex-col h-full w-full bg-black overflow-hidden">

        {/* Video */}
        <div className="relative flex-1">
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <p className="text-white/80 text-sm font-medium bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
              🎉 Tvoj video je pripravljen!
            </p>
          </div>
        </div>

        {/* QR + gumbi */}
        <div className="bg-black px-6 pt-4 pb-6">
          <div className={`flex gap-6 justify-center mb-4 ${printStarted ? "" : ""}`}>

            {/* QR za video */}
            {videoQrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/40 text-xs tracking-wide uppercase">Skeniraj video</p>
                <div className="bg-white rounded-xl p-2.5">
                  <QRCodeSVG value={videoQrUrl} size={90} bgColor="#ffffff" fgColor="#000000" level="M" />
                </div>
              </div>
            )}

            {/* QR za foto (če je bil tudi tisk) */}
            {printStarted && photoQrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/40 text-xs tracking-wide uppercase">Skeniraj foto</p>
                <div className="bg-white rounded-xl p-2.5">
                  <QRCodeSVG value={photoQrUrl} size={90} bgColor="#ffffff" fgColor="#000000" level="M" />
                </div>
              </div>
            )}
          </div>

          {printStarted && (
            <p className="text-center text-white/50 text-sm mb-3">
              🖨️ Fotografija se tiska
            </p>
          )}

          <button
            onClick={onRestart}
            className="w-full py-4 rounded-xl text-white/60 text-base font-medium active:scale-[0.97] transition-all hover:text-white"
            style={{ minHeight: 56 }}
          >
            ↩ Začni znova
          </button>
        </div>
      </div>
    );
  }

  // ─── Fallback (samo QR, brez tiska in videa) ──────────────────

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black px-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoDataUrl}
        alt="Fotografija"
        className="rounded-2xl shadow-2xl mb-8"
        style={{ maxHeight: "45vh", maxWidth: "80vw", objectFit: "contain" }}
      />
      {photoQrUrl && (
        <div className="flex flex-col items-center gap-3 mb-8">
          <p className="text-white/40 text-xs tracking-widest uppercase">Skenirajte za prenos</p>
          <div className="bg-white rounded-2xl p-3">
            <QRCodeSVG value={photoQrUrl} size={120} bgColor="#ffffff" fgColor="#000000" level="M" />
          </div>
        </div>
      )}
      <button
        onClick={onRestart}
        className="px-10 py-5 rounded-xl text-black font-semibold text-lg active:scale-[0.97] transition-transform"
        style={{ backgroundColor: primaryColor, minHeight: 56 }}
      >
        Začni znova
      </button>
    </div>
  );
}
