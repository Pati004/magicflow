"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getCameraStream, stopCameraStream, capturePhoto } from "@/lib/kiosk/camera";
import type { CapturedPhoto, CameraError } from "@/lib/kiosk/camera";

interface CameraStepProps {
  primaryColor: string;
  onCapture:    (photo: CapturedPhoto) => void;
  onBack:       () => void;
}

type CameraState = "loading" | "ready" | "countdown" | "captured" | "error";

export function CameraStep({ primaryColor, onCapture, onBack }: CameraStepProps) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [state,     setState]     = useState<CameraState>("loading");
  const [countdown, setCountdown] = useState(3);
  const [error,     setError]     = useState<CameraError | null>(null);
  const [preview,   setPreview]   = useState<string | null>(null);

  // ─── Init kamera ──────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const result = await getCameraStream("user");
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setState("error");
        return;
      }

      streamRef.current = result.stream;
      if (videoRef.current) {
        videoRef.current.srcObject = result.stream;
        await videoRef.current.play();
        setState("ready");
      }
    }

    init();
    return () => {
      cancelled = true;
      stopCameraStream(streamRef.current);
    };
  }, []);

  // ─── Countdown ────────────────────────────────────────────────

  const startCountdown = useCallback(() => {
    setState("countdown");
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(interval);
        doCapture();
      }
    }, 1000);
  }, []);

  // ─── Zajem fotografije ────────────────────────────────────────

  const doCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const photo = capturePhoto(videoRef.current, canvasRef.current);
    setPreview(photo.dataUrl);
    setState("captured");
    stopCameraStream(streamRef.current);
  }, []);

  // ─── Ponovi ───────────────────────────────────────────────────

  const retake = useCallback(async () => {
    setPreview(null);
    setState("loading");
    const result = await getCameraStream("user");
    if (result.error) { setError(result.error); setState("error"); return; }
    streamRef.current = result.stream;
    if (videoRef.current) { videoRef.current.srcObject = result.stream; await videoRef.current.play(); }
    setState("ready");
  }, []);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-black">
      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${state === "captured" ? "opacity-0" : "opacity-100"}`}
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Zajeta fotografija */}
      {preview && (
        <img
          src={preview}
          alt="Fotografija"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Skrit canvas za zajem */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          style={{ minHeight: 48, minWidth: 48 }}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Nazaj</span>
        </button>
        <p className="text-white/80 text-sm font-medium tracking-wide uppercase">Fotografiranje</p>
        <div className="w-20" />
      </div>

      {/* Loading */}
      {state === "loading" && (
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/60 text-sm">Zaganjam kamero...</p>
        </div>
      )}

      {/* Napaka */}
      {state === "error" && error && (
        <div className="relative flex flex-col items-center gap-6 px-8 text-center max-w-sm">
          <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white text-lg font-medium">{error.message}</p>
          <button
            onClick={() => { setError(null); setState("loading"); retake(); }}
            className="px-8 py-4 rounded-2xl text-black font-semibold text-lg"
            style={{ backgroundColor: primaryColor, minHeight: 56 }}
          >
            Poskusi znova
          </button>
        </div>
      )}

      {/* Countdown */}
      {state === "countdown" && (
        <div className="relative flex items-center justify-center">
          <div
            className="h-40 w-40 rounded-full flex items-center justify-center text-8xl font-bold text-white"
            style={{
              background: `radial-gradient(circle, ${primaryColor}33, transparent)`,
              border: `4px solid ${primaryColor}`,
              animation: "pulse 0.8s ease-in-out",
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Gumbi — ready */}
      {state === "ready" && (
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 p-8">
          <p className="text-white/60 text-sm mb-2">Pozicioniraj se pred kamero</p>
          <button
            onClick={startCountdown}
            className="h-20 w-20 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
            style={{ backgroundColor: primaryColor, minHeight: 80, minWidth: 80 }}
          >
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-white" />
            </div>
          </button>
          <p className="text-white/40 text-xs">Pritisni za zajem</p>
        </div>
      )}

      {/* Gumbi — captured */}
      {state === "captured" && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-8">
          <button
            onClick={retake}
            className="flex-1 py-4 rounded-2xl border border-white/20 text-white font-medium text-lg active:scale-95 transition-transform"
            style={{ minHeight: 56 }}
          >
            Ponovi
          </button>
          <button
            onClick={() => {
              if (preview) onCapture({ dataUrl: preview, width: 1280, height: 720, timestamp: Date.now() });
            }}
            className="flex-1 py-4 rounded-2xl text-black font-semibold text-lg active:scale-95 transition-transform"
            style={{ backgroundColor: primaryColor, minHeight: 56 }}
          >
            Uporabi ✓
          </button>
        </div>
      )}
    </div>
  );
}
