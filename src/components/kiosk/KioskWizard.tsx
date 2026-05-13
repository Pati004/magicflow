"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { WelcomeStep }  from "@/components/kiosk/steps/WelcomeStep";
import { CameraStep }   from "@/components/kiosk/steps/CameraStep";
import { StyleStep }    from "@/components/kiosk/steps/StyleStep";
import { LoadingStep }  from "@/components/kiosk/steps/LoadingStep";
import { ResultStep }   from "@/components/kiosk/steps/ResultStep";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import type { ProjectConfigWithMeta }    from "@/types/project-config";
import type { CapturedPhoto }            from "@/lib/kiosk/camera";
import type { VideoStyle, VideoStyleCategory } from "@/types/pose-analysis";
import { DEFAULT_VIDEO_STYLES }          from "@/types/pose-analysis";

// ─── Tipi ─────────────────────────────────────────────────────

type Step = "welcome" | "camera" | "style" | "loading" | "result";

interface KioskState {
  photo:     CapturedPhoto | null;
  photoId:   string | null;
  sessionId: string | null;
  style:     VideoStyle | null;
}

interface KioskWizardProps {
  config:    ProjectConfigWithMeta;
  projectId: string;
}

// ─── Pomočnik: pretvori string stil v VideoStyle ───────────────

const STYLE_MAP: Record<string, { emoji: string; description: string; prompt: string; category: VideoStyleCategory }> = {
  "Dramatično":  { emoji: "🎭", description: "Intenzivno in čustveno",     prompt: "dramatic cinematic style with intense emotions and moody lighting",     category: "dramatic"  },
  "Igriva":      { emoji: "🎉", description: "Zabavno in lahkotno",         prompt: "playful fun upbeat celebratory style with confetti and bright colors", category: "joyful"    },
  "Elegantno":   { emoji: "✨", description: "Prefinjeno in sofisticirano", prompt: "elegant sophisticated refined style with soft flowing light",           category: "elegant"   },
  "Nostalgično": { emoji: "🌅", description: "Toplo in čuteče",            prompt: "nostalgic warm emotional golden hour style with soft focus",            category: "cinematic" },
  "Energično":   { emoji: "⚡", description: "Dinamično in živahno",        prompt: "energetic dynamic fast paced action style with power effects",          category: "action"    },
  "Romantično":  { emoji: "💫", description: "Nežno in poetično",           prompt: "romantic gentle poetic dreamy style with soft particle effects",        category: "fantasy"   },
  "Mistično":    { emoji: "🌙", description: "Skrivnostno in čarobno",      prompt: "mystical magical mysterious style with ethereal glowing particles",     category: "fantasy"   },
  "Veselo":      { emoji: "🎊", description: "Radostno in pozitivno",       prompt: "joyful positive happy bright style with colorful bursts",              category: "joyful"    },
};

function toVideoStyle(name: string): VideoStyle {
  const meta = STYLE_MAP[name] ?? {
    emoji: "🎬", description: "Unikaten stil",
    prompt: name.toLowerCase(), category: "custom" as VideoStyleCategory,
  };
  return { id: name.toLowerCase().replace(/\s+/g, "-"), name, ...meta };
}

// ─── Komponenta ───────────────────────────────────────────────

export function KioskWizard({ config, projectId }: KioskWizardProps) {
  const [step,    setStep]    = useState<Step>("welcome");
  const [state,   setState]   = useState<KioskState>({
    photo: null, photoId: null, sessionId: null, style: null,
  });
  const [leaving,   setLeaving]   = useState(false);
  const [uploading, setUploading] = useState(false);

  // Ref-i za async dostop brez stale closure
  const photoIdRef = useRef<string | null>(null);

  const primaryColor = config.branding.primaryColor;
  const videoStyles  = config.aiVideo.emotionalStyles.length > 0
    ? config.aiVideo.emotionalStyles.map(toVideoStyle)
    : DEFAULT_VIDEO_STYLES;

  // ─── Video generiranje (Runway) ────────────────────────────

  const { state: videoState, startGeneration, reset: resetVideo } = useVideoGeneration({
    photoId:    state.photoId ?? "",
    stylePrompt: state.style?.prompt ?? "",
    model:      "gen3a_turbo",
    duration:   5,
    timeoutMs:  120_000,
  });

  // Ko je video done/error/timeout → pojdi na result
  useEffect(() => {
    if (step === "loading" && ["done", "error", "timeout"].includes(videoState.status)) {
      goTo("result");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.status, step]);

  // ─── Animiran prehod ───────────────────────────────────────

  const goTo = useCallback((nextStep: Step) => {
    setLeaving(true);
    setTimeout(() => { setStep(nextStep); setLeaving(false); }, 300);
  }, []);

  // ─── Zajem fotografije + upload na Cloudinary ──────────────

  const handleCapture = useCallback(async (photo: CapturedPhoto) => {
    setState((s) => ({ ...s, photo }));
    setUploading(true);
    goTo("style");

    try {
      // 1. Ustvari sejo
      const sessionRes = await fetch("/api/kiosk/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const { sessionId } = await sessionRes.json() as { sessionId: string };

      // 2. Naloži na Cloudinary
      const formData = new FormData();
      const blob = await (await fetch(photo.dataUrl)).blob();
      formData.append("file", blob, "photo.png");
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "magicflow_uploads");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST", body: formData,
      });
      const uploadData = await uploadRes.json() as { secure_url: string; public_id: string };

      // 3. Shrani v bazo
      const saveRes = await fetch("/api/kiosk/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          cloudinaryUrl:      uploadData.secure_url,
          cloudinaryPublicId: uploadData.public_id,
        }),
      });
      const { photoId } = await saveRes.json() as { photoId: string };

      photoIdRef.current = photoId;
      setState((s) => ({ ...s, photoId, sessionId }));

    } catch (err) {
      console.error("[KioskWizard] Upload napaka:", err);
    } finally {
      setUploading(false);
    }
  }, [projectId, goTo]);

  // ─── Izbira stila → zaženi Runway generiranje ──────────────

  const handleStyleSelect = useCallback(async (style: VideoStyle) => {
    setState((s) => ({ ...s, style }));
    goTo("loading");

    // Počakaj da se upload konča (max 10s)
    let attempts = 0;
    while (!photoIdRef.current && attempts < 20) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    // Zaženi Runway — prompt posreduj direktno da se izognemo stale closure
    await startGeneration(style.prompt);

  }, [startGeneration, goTo]);

  // ─── Restart ───────────────────────────────────────────────

  const handleRestart = useCallback(() => {
    resetVideo();
    photoIdRef.current = null;
    setState({ photo: null, photoId: null, sessionId: null, style: null });
    goTo("welcome");
  }, [resetVideo, goTo]);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        transition: "opacity 0.3s ease, transform 0.3s ease",
        opacity:    leaving ? 0 : 1,
        transform:  leaving ? "scale(0.98)" : "scale(1)",
      }}
    >
      {step === "welcome" && (
        <WelcomeStep config={config} onStart={() => goTo("camera")} />
      )}

      {step === "camera" && (
        <CameraStep
          primaryColor={primaryColor}
          onCapture={handleCapture}
          onBack={() => goTo("welcome")}
        />
      )}

      {step === "style" && (
        <StyleStep
          primaryColor={primaryColor}
          emotionalStyles={videoStyles}
          uploading={uploading}
          onSelect={handleStyleSelect}
          onBack={() => goTo("camera")}
        />
      )}

      {step === "loading" && (
        <LoadingStep
          primaryColor={primaryColor}
          style={state.style?.name ?? ""}
        />
      )}

      {step === "result" && state.photo && (
        <ResultStep
          primaryColor={primaryColor}
          {...(videoState.videoUrl        ? { videoUrl: videoState.videoUrl }               : {})}
          {...(videoState.generatedVideoId ? { videoId: videoState.generatedVideoId }        : {})}
          photoDataUrl={state.photo.dataUrl}
          features={config.features}
          printConfig={config.print}
          onRestart={handleRestart}
        />
      )}

      <div className="absolute bottom-3 right-4 pointer-events-none opacity-20">
        <p className="text-white text-xs font-medium tracking-widest uppercase">Magicflow</p>
      </div>
    </div>
  );
}
