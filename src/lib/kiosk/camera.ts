// lib/kiosk/camera.ts
// Helper funkcije za dostop do kamere z getUserMedia

export type CameraFacing = "user" | "environment";

export interface CameraError {
  type:    "NOT_SUPPORTED" | "PERMISSION_DENIED" | "NOT_FOUND" | "OVERCONSTRAINED" | "UNKNOWN";
  message: string;
}

export interface CapturedPhoto {
  dataUrl:   string;   // base64 PNG
  width:     number;
  height:    number;
  timestamp: number;
}

// ─── Preveri podporo ──────────────────────────────────────────

export function isCameraSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

// ─── Pridobi stream ───────────────────────────────────────────

export async function getCameraStream(
  facing: CameraFacing = "user"
): Promise<{ stream: MediaStream; error: null } | { stream: null; error: CameraError }> {
  if (!isCameraSupported()) {
    return {
      stream: null,
      error: { type: "NOT_SUPPORTED", message: "Kamera ni podprta v tem brskalniku." },
    };
  }

  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: facing,
      width:      { ideal: 1920 },
      height:     { ideal: 1080 },
    },
    audio: false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { stream, error: null };
  } catch (err) {
    return { stream: null, error: parseMediaError(err) };
  }
}

// ─── Zaustavi stream ──────────────────────────────────────────

export function stopCameraStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

// ─── Zajemi fotografijo ───────────────────────────────────────

export function capturePhoto(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): CapturedPhoto {
  const width  = video.videoWidth  || 1280;
  const height = video.videoHeight || 720;

  canvas.width  = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context ni na voljo");

  // Zrcali horizontalno (selfie prikaz)
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);

  return {
    dataUrl:   canvas.toDataURL("image/png", 0.95),
    width,
    height,
    timestamp: Date.now(),
  };
}

// ─── Razčleni napako ──────────────────────────────────────────

function parseMediaError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return {
          type:    "PERMISSION_DENIED",
          message: "Dostop do kamere je bil zavrnjen. Prosimo, dovolite dostop v nastavitvah brskalnika.",
        };
      case "NotFoundError":
      case "DevicesNotFoundError":
        return {
          type:    "NOT_FOUND",
          message: "Kamera ni bila najdena. Preverite, ali je kamera priključena.",
        };
      case "OverconstrainedError":
        return {
          type:    "OVERCONSTRAINED",
          message: "Kamera ne podpira zahtevane resolucije.",
        };
      default:
        return {
          type:    "UNKNOWN",
          message: `Napaka kamere: ${err.message}`,
        };
    }
  }
  return { type: "UNKNOWN", message: "Neznana napaka kamere." };
}
