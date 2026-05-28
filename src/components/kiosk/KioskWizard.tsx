"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getCameraStream, stopCameraStream } from "@/lib/kiosk/camera";
import { WelcomeStep }    from "@/components/kiosk/steps/WelcomeStep";
import { CameraStep }     from "@/components/kiosk/steps/CameraStep";
import { ActionsStep }    from "@/components/kiosk/steps/ActionsStep";
import { StyleStep }      from "@/components/kiosk/steps/StyleStep";
import { GeneratingStep } from "@/components/kiosk/steps/GeneratingStep";
import { ResultStep }     from "@/components/kiosk/steps/ResultStep";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { OfflineBanner }     from "@/components/kiosk/OfflineBanner";
import { GdprBanner }       from "@/components/kiosk/GdprBanner";
import type { ProjectConfigWithMeta } from "@/types/project-config";
import type { CapturedPhoto }         from "@/lib/kiosk/camera";
import type { VideoStyle, VideoStyleCategory } from "@/types/pose-analysis";
import { DEFAULT_VIDEO_STYLES }               from "@/types/pose-analysis";


// ─── Tipi ─────────────────────────────────────────────────────

type Step = "welcome" | "camera" | "actions" | "style" | "generating" | "result";

interface WizardState {
  photoDataUrl:  string | null;
  photoId:       string | null;
  photoCloudUrl: string | null;
  sessionId:     string | null;
  selectedStyle: VideoStyle | null;
  actionsTaken:  { print: boolean; video: boolean };
}

interface KioskWizardProps {
  config:    ProjectConfigWithMeta;
  projectId: string;
}

// ─── Pomočnik: string → VideoStyle ────────────────────────────

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
  const meta = STYLE_MAP[name] ?? { emoji: "🎬", description: "Unikaten stil", prompt: name.toLowerCase(), category: "custom" as VideoStyleCategory };
  return { id: name.toLowerCase().replace(/\s+/g, "-"), name, ...meta };
}

// ─── Komponenta ───────────────────────────────────────────────

export function KioskWizard({ config, projectId }: KioskWizardProps) {
  const [step,    setStep]    = useState<Step>("welcome");
  const [state,   setState]   = useState<WizardState>({
    photoDataUrl: null, photoId: null, photoCloudUrl: null,
    sessionId: null, selectedStyle: null,
    actionsTaken: { print: false, video: false },
  });

  // Ref za async dostop do photoId brez stale closure
  const photoIdRef    = useRef<string | null>(null);
  // Promise za pose analizo (teče v ozadju med ActionsStep)
  const stylesPromise = useRef<Promise<VideoStyle[]>>(Promise.resolve(DEFAULT_VIDEO_STYLES));
  // Kamera — zažene ob mountu, deli stream med WelcomeStep in CameraStep
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCameraStream("user").then((result) => {
      if (cancelled || result.error) return;
      cameraStreamRef.current = result.stream;
      setCameraStream(result.stream);
    });
    return () => {
      cancelled = true;
      stopCameraStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
    };
  }, []);

  const primaryColor  = config.branding.primaryColor;
  const configStyles  = config.aiVideo.emotionalStyles.length > 0
    ? config.aiVideo.emotionalStyles.map(toVideoStyle)
    : DEFAULT_VIDEO_STYLES;

  // ─── Video generiranje ─────────────────────────────────────

  const { state: videoState, startGeneration, reset: resetVideo } = useVideoGeneration({
    photoId:     state.photoId ?? "",
    stylePrompt: state.selectedStyle?.prompt ?? "",
    model:       "gen3a_turbo",
    duration:    5,
    timeoutMs:   120_000,
  });

  // Prehod na result ko je generiranje uspešno končano
  useEffect(() => {
    if (step === "generating" && videoState.status === "done") {
      goTo("result");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.status, step]);

  // ─── Animiran prehod ───────────────────────────────────────

  const goTo = useCallback((nextStep: Step) => {
    setStep(nextStep);
  }, []);

  // ─── Zajem fotografije + upload v ozadju ──────────────────

  const handleCapture = useCallback(async (photo: CapturedPhoto) => {
    setState((s) => ({ ...s, photoDataUrl: photo.dataUrl }));
    goTo("actions");

    // Upload teče v ozadju — ActionsStep ne čaka
    void (async () => {
      try {
        // 1. Ustvari sejo
        const sessionRes = await fetch("/api/kiosk/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const { sessionId } = await sessionRes.json() as { sessionId: string };

        // 2. Naloži na Cloudinary
        const formData = new FormData();
        const blob = await (await fetch(photo.dataUrl)).blob();
        formData.append("file", blob, "photo.png");
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "magicflow_uploads");

        const cloudName  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadRes  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST", body: formData,
        });
        const uploadData = await uploadRes.json() as { secure_url: string; public_id: string };

        // 3. Shrani v bazo
        const saveRes  = await fetch("/api/kiosk/photo", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, cloudinaryUrl: uploadData.secure_url, cloudinaryPublicId: uploadData.public_id }),
        });
        const { photoId } = await saveRes.json() as { photoId: string };

        photoIdRef.current = photoId;
        setState((s) => ({ ...s, photoId, photoCloudUrl: uploadData.secure_url, sessionId }));

        // 4. Zaženi analizo poze v ozadju (za StyleStep)
        stylesPromise.current = fetch("/api/analyze-pose", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
        })
          .then((r) => r.json() as Promise<{ styles?: VideoStyle[] }>)
          .then((d) => d.styles && d.styles.length > 0 ? d.styles : configStyles)
          .catch(() => configStyles);

      } catch (err) {
        console.error("[KioskWizard] Upload napaka:", err);
        // Fallback — QR ostane brez URL, tisk pa dela z dataUrl
      }
    })();
  }, [projectId, goTo, configStyles]);

  // ─── Akcije iz ActionsStep ─────────────────────────────────

  const handlePrint = useCallback(() => {
    setState((s) => ({ ...s, actionsTaken: { ...s.actionsTaken, print: true } }));
    goTo("result");
  }, [goTo]);

  const handleVideo = useCallback(() => {
    // Nastavi stile promise pred prihodom na StyleStep
    if (!stylesPromise.current) {
      stylesPromise.current = Promise.resolve(configStyles);
    }
    goTo("style");
  }, [goTo, configStyles]);

  // ─── Izbira stila → zaženi Runway ─────────────────────────

  const handleStyleSelect = useCallback(async (style: VideoStyle) => {
    setState((s) => ({ ...s, selectedStyle: style, actionsTaken: { ...s.actionsTaken, video: true } }));
    goTo("generating");

    // Počakaj photoId (max 10s)
    let attempts = 0;
    while (!photoIdRef.current && attempts < 20) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    await startGeneration(style.prompt);
  }, [startGeneration, goTo]);

  // ─── Restart ───────────────────────────────────────────────

  const handleReset = useCallback(() => {
    resetVideo();
    photoIdRef.current    = null;
    stylesPromise.current = Promise.resolve(DEFAULT_VIDEO_STYLES);
    setState({
      photoDataUrl: null, photoId: null, photoCloudUrl: null,
      sessionId: null, selectedStyle: null,
      actionsTaken: { print: false, video: false },
    });
    goTo("welcome");
  }, [resetVideo, goTo]);

  // ─── Render ────────────────────────────────────────────────

  const stepVariants = {
    enter:  { opacity: 0, scale: 0.97, y: 8 },
    center: { opacity: 1, scale: 1,    y: 0 },
    exit:   { opacity: 0, scale: 0.97, y: -8 },
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ "--brand-color": primaryColor } as React.CSSProperties}
    >
      <OfflineBanner primaryColor={primaryColor} />
      <GdprBanner primaryColor={primaryColor} projectId={projectId} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {step === "welcome" && (
            <WelcomeStep config={config} stream={cameraStream} onStart={() => goTo("camera")} />
          )}

          {step === "camera" && (
            <CameraStep
              primaryColor={primaryColor}
              existingStream={cameraStream}
              onCapture={handleCapture}
              onBack={() => goTo("welcome")}
            />
          )}

          {step === "actions" && state.photoDataUrl && (
            <ActionsStep
              primaryColor={primaryColor}
              photoDataUrl={state.photoDataUrl}
              photoCloudUrl={state.photoCloudUrl}
              photoId={state.photoId}
              features={config.features}
              printConfig={config.print}
              onPrint={handlePrint}
              onVideo={handleVideo}
              onReset={handleReset}
            />
          )}

          {step === "style" && (
            <StyleStep
              primaryColor={primaryColor}
              stylesPromise={stylesPromise.current}
              onSelect={handleStyleSelect}
              onBack={() => goTo("actions")}
            />
          )}

          {step === "generating" && (
            <GeneratingStep
              primaryColor={primaryColor}
              styleName={state.selectedStyle?.name ?? ""}
              progress={videoState.progress}
              elapsedMs={videoState.elapsedMs}
              status={videoState.status}
              onCancel={() => { resetVideo(); goTo("actions"); }}
            />
          )}

          {step === "result" && (
            <ResultStep
              primaryColor={primaryColor}
              photoDataUrl={state.photoDataUrl ?? ""}
              photoQrUrl={state.photoCloudUrl}
              videoUrl={videoState.videoUrl}
              videoQrUrl={videoState.generatedVideoId
                ? `${typeof window !== "undefined" ? window.location.origin : ""}/download/${videoState.generatedVideoId}`
                : null}
              printStarted={state.actionsTaken.print}
              features={config.features}
              onRestart={handleReset}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Branding */}
      <div className="absolute bottom-3 right-4 pointer-events-none opacity-20 z-50">
        <p className="text-white text-xs font-medium tracking-widest uppercase">Magicflow</p>
      </div>
    </div>
  );
}
