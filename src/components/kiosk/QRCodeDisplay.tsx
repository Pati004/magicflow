"use client";

import { useEffect, useState } from "react";
import { generateQRCodeDataUrl, getDownloadUrl } from "@/lib/qr";

interface QRCodeDisplayProps {
  videoId:      string;
  primaryColor: string;
  onClose:      () => void;
}

export function QRCodeDisplay({ videoId, primaryColor, onClose }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);
  const downloadUrl               = getDownloadUrl(videoId);

  useEffect(() => {
    generateQRCodeDataUrl(downloadUrl)
      .then(setQrDataUrl)
      .catch(console.error);
  }, [downloadUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-[#13131E] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: `0 0 60px ${primaryColor}22` }}
      >
        {/* Zapri */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Naslov */}
        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-white mb-1">Skeniraj QR kodo</p>
          <p className="text-white/50 text-sm">Odpri na svojem telefonu in prenesi video</p>
        </div>

        {/* QR koda */}
        <div className="flex justify-center mb-6">
          {qrDataUrl ? (
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <img
                src={qrDataUrl}
                alt="QR koda za prenos videa"
                className="h-48 w-48"
              />
            </div>
          ) : (
            <div className="h-56 w-56 bg-white/5 rounded-2xl flex items-center justify-center">
              <div
                className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: primaryColor, borderTopColor: "transparent" }}
              />
            </div>
          )}
        </div>

        {/* URL */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4">
          <p className="text-white/50 text-xs font-mono truncate flex-1">{downloadUrl}</p>
          <button
            onClick={handleCopy}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: copied ? `${primaryColor}20` : "transparent",
              color:           copied ? primaryColor : "rgba(255,255,255,0.4)",
              border:          `1px solid ${copied ? primaryColor + "40" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {copied ? "Kopirano ✓" : "Kopiraj"}
          </button>
        </div>

        {/* GDPR */}
        <p className="text-center text-white/30 text-xs">
          ⏰ Video bo izbrisan po 48 urah (GDPR)
        </p>
      </div>
    </div>
  );
}
