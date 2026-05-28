"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { FeatureFlags, PrintConfig } from "@/types/project-config";

interface ActionsStepProps {
  primaryColor:  string;
  photoDataUrl:  string;
  photoCloudUrl: string | null;   // null dokler upload ni končan
  photoId:       string | null;
  features:      FeatureFlags;
  printConfig:   PrintConfig;
  onPrint:       () => void;
  onVideo:       () => void;
  onReset:       () => void;
}

const IDLE_TIMEOUT = 90_000;

export function ActionsStep({
  primaryColor,
  photoDataUrl,
  photoCloudUrl,
  features,
  printConfig,
  onPrint,
  onVideo,
  onReset,
}: ActionsStepProps) {
  const [idleLeft, setIdleLeft]   = useState(IDLE_TIMEOUT);
  const [printing, setPrinting]   = useState(false);
  const lastActivityRef           = useRef(Date.now());

  const showPrint    = features.printing;
  const showVideo    = features.aiVideo;
  const hasAnyAction = showPrint || showVideo;

  // ─── Idle timer ───────────────────────────────────────────────

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const left    = Math.max(0, IDLE_TIMEOUT - elapsed);
      setIdleLeft(left);
      if (left === 0) onReset();
    }, 1000);
    return () => clearInterval(tick);
  }, [onReset]);

  const resetIdle = () => { lastActivityRef.current = Date.now(); };

  // ─── Tiskanje ─────────────────────────────────────────────────

  const handlePrint = () => {
    resetIdle();
    setPrinting(true);

    const printWindow = window.open("", "_blank");
    if (!printWindow) { setPrinting(false); return; }

    const [w, h] = printConfig.format === "4x6" ? [10, 15] : [13, 18];
    const pages  = Array.from({ length: printConfig.copies || 1 }, () => `
      <div class="page">
        ${printConfig.headerText ? `<p class="header">${printConfig.headerText}</p>` : ""}
        <img src="${photoDataUrl}" />
        ${printConfig.footerText ? `<p class="footer">${printConfig.footerText}</p>` : ""}
      </div>
    `).join("");

    printWindow.document.write(`<!DOCTYPE html><html>
      <head><title>Magicflow foto</title>
      <style>
        * { margin:0;padding:0;box-sizing:border-box; }
        .page { width:${w}cm;height:${h}cm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;overflow:hidden; }
        img { max-width:100%;max-height:${h - 1.5}cm;object-fit:contain; }
        .header,.footer { font-family:sans-serif;font-size:10pt;text-align:center;padding:4px 0;color:#333; }
        @media print { @page { size:${w}cm ${h}cm;margin:0; } }
      </style></head>
      <body>${pages}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      onPrint();
    }, 300);
  };

  const qrValue    = photoCloudUrl ?? "";
  const idleSecs   = Math.ceil(idleLeft / 1000);
  const idleWarn   = idleLeft < 20_000;

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div
      className="flex h-full w-full bg-black overflow-hidden"
      style={{ "--brand-color": primaryColor } as React.CSSProperties}
      onPointerDown={resetIdle}
    >

      {/* ── LEVO: fotografija (60%) ───────────────────────────── */}
      <div className="relative w-[60%] shrink-0 border-r border-white/8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoDataUrl}
          alt="Tvoja fotografija"
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* ── DESNO: QR + gumbi (40%) ──────────────────────────── */}
      <div className="flex flex-col items-center justify-between flex-1 px-8 py-8">

        {/* QR koda — zgoraj, čim večja */}
        <div className="flex flex-col items-center gap-3 flex-1 justify-center">
          <p className="text-white/50 text-[10px] tracking-widest uppercase">Skeniraj za fotografijo</p>
          <div className="bg-white rounded-3xl p-4 shadow-2xl w-full" style={{ maxWidth: 440 }}>
            {photoCloudUrl ? (
              <QRCodeSVG
                value={qrValue}
                size={508}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                style={{ width: "100%", height: "auto" }}
              />
            ) : (
              <div className="h-[208px] w-[208px] flex items-center justify-center">
                <div
                  className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: primaryColor, borderTopColor: "transparent" }}
                />
              </div>
            )}
          </div>
          {!photoCloudUrl && (
            <p className="text-white/30 text-xs">Nalagam fotografijo...</p>
          )}
        </div>

        {/* Razdelilna linija */}
        <div className="w-full h-px bg-white/8 my-4" />

        {/* Gumbi — spodaj */}
        <div className="flex flex-col gap-3 w-full">
          {showPrint && (
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex items-center justify-center gap-3 w-full rounded-2xl text-black font-semibold text-base active:scale-[0.97] transition-transform disabled:opacity-60"
              style={{ backgroundColor: primaryColor, padding: "18px 20px", minHeight: 64 }}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {printing ? "Tiskam..." : "Natisni fotografijo"}
            </button>
          )}

          {showVideo && (
            <button
              onClick={() => { resetIdle(); onVideo(); }}
              className="flex items-center justify-center gap-3 w-full rounded-2xl font-semibold text-base active:scale-[0.97] transition-transform"
              style={{
                padding: "18px 20px", minHeight: 64,
                backgroundColor: showPrint ? "rgba(255,255,255,0.08)" : primaryColor,
                color:            showPrint ? "white" : "black",
                border:           showPrint ? "1px solid rgba(255,255,255,0.15)" : "none",
              }}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              Ustvari AI video ✨
            </button>
          )}

          {!hasAnyAction && (
            <p className="text-white/40 text-sm text-center py-4">
              Skeniraj QR kodo za prenos fotografije.
            </p>
          )}

          <button
            onClick={() => { resetIdle(); onReset(); }}
            className="w-full text-white/30 text-sm font-medium active:scale-[0.97] transition-transform hover:text-white/60 py-3"
            style={{ minHeight: 48 }}
          >
            ↩ Začni znova
          </button>
        </div>

        {idleWarn && (
          <p className="text-white/25 text-xs mt-2">
            Samodejni reset čez {idleSecs}s
          </p>
        )}
      </div>
    </div>
  );
}
