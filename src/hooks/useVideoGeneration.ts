"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Tipi ─────────────────────────────────────────────────────

export type VideoGenStatus = "idle" | "starting" | "processing" | "done" | "error" | "timeout";

export interface VideoGenState {
  status:           VideoGenStatus;
  generatedVideoId: string | null;
  videoUrl:         string | null;
  elapsedMs:        number;
  error:            string | null;
  progress:         number;           // 0–100 ocena napredka
}

interface UseVideoGenerationOptions {
  photoId:     string;
  stylePrompt: string;
  model?:      "gen3a_turbo" | "gen3a";
  duration?:   5 | 10;
  timeoutMs?:  number;               // default 120_000
  pollEvery?:  number;               // default 2_000
}

interface StatusResponse {
  success:          boolean;
  generatedVideoId: string;
  status:           "PENDING" | "PROCESSING" | "DONE" | "ERROR";
  videoUrl:         string | null;
  latencyMs:        number | null;
  elapsedMs:        number;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useVideoGeneration(options: UseVideoGenerationOptions) {
  const {
    photoId,
    stylePrompt,
    model      = "gen3a_turbo",
    duration   = 5,
    timeoutMs  = 120_000,
    pollEvery  = 2_000,
  } = options;

  const [state, setState] = useState<VideoGenState>({
    status:           "idle",
    generatedVideoId: null,
    videoUrl:         null,
    elapsedMs:        0,
    error:            null,
    progress:         0,
  });

  const intervalRef  = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number>(0);
  const abortRef     = useRef(false);

  // ─── Počisti interval ──────────────────────────────────────

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ─── Polling status ────────────────────────────────────────

  const pollStatus = useCallback(async (videoId: string) => {
    if (abortRef.current) return;

    const elapsedMs = Date.now() - startedAtRef.current;

    // Timeout
    if (elapsedMs >= timeoutMs) {
      clearPolling();
      setState((s) => ({ ...s, status: "timeout", error: "Generiranje je trajalo predolgo.", elapsedMs }));
      return;
    }

    try {
      const res = await fetch(`/api/video-status/${videoId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as StatusResponse;

      // Oceni napredek
      const progress = Math.min(90, Math.round((elapsedMs / timeoutMs) * 100));

      if (data.status === "DONE" && data.videoUrl) {
        clearPolling();
        setState({
          status:           "done",
          generatedVideoId: videoId,
          videoUrl:         data.videoUrl,
          elapsedMs:        data.elapsedMs,
          error:            null,
          progress:         100,
        });
        return;
      }

      if (data.status === "ERROR") {
        clearPolling();
        setState((s) => ({
          ...s,
          status:   "error",
          error:    "Generiranje videa je bilo neuspešno.",
          elapsedMs,
          progress: 0,
        }));
        return;
      }

      // Še vedno v teku
      setState((s) => ({
        ...s,
        status:    "processing",
        elapsedMs,
        progress,
      }));

    } catch {
      // Network napaka — nadaljujemo polling
      const elapsedMs = Date.now() - startedAtRef.current;
      setState((s) => ({ ...s, elapsedMs }));
    }
  }, [clearPolling, timeoutMs]);

  // ─── Zaženi generiranje ────────────────────────────────────

  const startGeneration = useCallback(async (promptOverride?: string) => {
    if (state.status !== "idle") return;

    abortRef.current  = false;
    startedAtRef.current = Date.now();

    setState({
      status:           "starting",
      generatedVideoId: null,
      videoUrl:         null,
      elapsedMs:        0,
      error:            null,
      progress:         5,
    });

    const finalPrompt = promptOverride ?? stylePrompt;

    try {
      const res = await fetch("/api/generate-video", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ photoId, stylePrompt: finalPrompt, model, duration }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as { success: boolean; generatedVideoId?: string };

      if (!data.success || !data.generatedVideoId) {
        throw new Error("Generiranje ni bilo zagnano");
      }

      const videoId = data.generatedVideoId;

      setState((s) => ({
        ...s,
        status:           "processing",
        generatedVideoId: videoId,
        progress:         10,
      }));

      // Začni polling
      intervalRef.current = setInterval(() => pollStatus(videoId), pollEvery);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Neznana napaka";
      setState((s) => ({
        ...s,
        status:   "error",
        error:    message,
        progress: 0,
      }));
    }
  }, [state.status, photoId, stylePrompt, model, duration, pollEvery, pollStatus]);

  // ─── Reset ────────────────────────────────────────────────

  const reset = useCallback(() => {
    abortRef.current = true;
    clearPolling();
    setState({
      status:           "idle",
      generatedVideoId: null,
      videoUrl:         null,
      elapsedMs:        0,
      error:            null,
      progress:         0,
    });
  }, [clearPolling]);

  // ─── Cleanup ob unmount ────────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current = true;
      clearPolling();
    };
  }, [clearPolling]);

  return { state, startGeneration, reset };
}
