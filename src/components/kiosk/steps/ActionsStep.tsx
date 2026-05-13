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

      {/* ── Leva stran: foto + QR ─────────────────────────────── */}
      <div className="flex flex-col items-center justify-center gap-6 w-1/2 px-8 border-r border-white/10">

        {/* Thumbnail */}
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: "40vh" }}>
          <img
            src={photoDataUrl}
            alt="Tvoja fotografija"
            className="w-full h-full object-contain"
            style={{ maxHeight: "38vh" }}
          />
        </div>

        {/* QR koda */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/50 text-xs tracking-widest uppercase">Skeniraj za fotografijo</p>
          <div className="bg-white rounded-2xl p-3 shadow-lg">
            {photoCloudUrl ? (
              <QRCodeSVG value={qrValue} size={120} bgColor="#ffffff" fgColor="#000000" level="M" />
            ) : (
              <div className="h-[120px] w-[120px] flex items-center justify-center">
                <div
                  className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: primaryColor, borderTopColor: "transparent" }}
                />
              </div>
            )}
          </div>
          {!photoCloudUrl && (
            <p className="text-white/30 text-xs">Nalagam fotografijo...</p>
          )}
        </div>
      </div>

      {/* ── Desna stran: akcije ───────────────────────────────── */}
      <div className="flex flex-col items-center justify-center gap-6 w-1/2 px-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {hasAnyAction ? "Kaj želiš narediti?" : "Tvoja fotografija je pripravljena!"}
        </h2>

        {showPrint && (
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex items-center gap-3 rounded-xl text-black font-semibold text-lg active:scale-[0.97] transition-transform disabled:opacity-60"
            style={{ backgroundColor: primaryColor, padding: "20px 32px", fontSize: 18, minWidth: 240, minHeight: 56 }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {printing ? "Tiskam..." : "Natisni fotografijo"}
          </button>
        )}

        {showVideo && (
          <button
            onClick={() => { resetIdle(); onVideo(); }}
            className="flex items-center gap-3 rounded-xl font-semibold text-lg active:scale-[0.97] transition-transform"
            style={{
              padding: "20px 32px", fontSize: 18, minWidth: 240, minHeight: 56,
              backgroundColor: showPrint ? "rgba(255,255,255,0.1)" : primaryColor,
              color: showPrint ? "white" : "black",
              border: showPrint ? "1px solid rgba(255,255,255,0.2)" : "none",
            }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            Ustvari AI video ✨
          </button>
        )}

        {!hasAnyAction && (
          <p className="text-white/40 text-sm text-center max-w-xs">
            Skeniraj QR kodo za prenos fotografije na svojo napravo.
          </p>
        )}

        {/* Začni znova */}
        <button
          onClick={() => { resetIdle(); onReset(); }}
          className="mt-4 text-white/40 text-sm font-medium active:scale-[0.97] transition-transform hover:text-white/70"
          style={{ minHeight: 48 }}
        >
          ↩ Začni znova
        </button>

        {/* Idle opozorilo */}
        {idleWarn && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <p className="text-white/40 text-xs text-center">
              Samodejni reset čez {idleSecs}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
