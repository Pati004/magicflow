import { v2 as cloudinary } from "cloudinary";

// ─── Konfiguracija ────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ─── Tipi ─────────────────────────────────────────────────────

export interface CloudinaryResult {
  publicId:   string;
  secureUrl:  string;
  format:     string;
  width?:     number;
  height?:    number;
  duration?:  number;
  bytes:      number;
}

// ─── GDPR: 48h auto-brisanje ──────────────────────────────────

function getExpiresAt(): number {
  return Math.floor(Date.now() / 1000) + 48 * 60 * 60; // +48h v UNIX timestamp
}

// ─── Upload fotografije iz base64 ─────────────────────────────

export async function uploadPhotoFromBase64(
  base64:    string,
  sessionId: string,
  projectSlug: string = "default"
): Promise<CloudinaryResult> {
  // Počisti base64 prefix če obstaja
  const data = base64.startsWith("data:")
    ? base64
    : `data:image/png;base64,${base64}`;

  const result = await cloudinary.uploader.upload(data, {
    folder:       `magicflow/${projectSlug}/${sessionId}`,
    public_id:    `photo_${Date.now()}`,
    resource_type: "image",
    expires_at:   getExpiresAt(),       // GDPR: auto-briši po 48h
    tags:         ["magicflow", "photo", sessionId],
    transformation: [
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
  });

  return {
    publicId:  result.public_id,
    secureUrl: result.secure_url,
    format:    result.format,
    width:     result.width,
    height:    result.height,
    bytes:     result.bytes,
  };
}

// ─── Upload videa iz URL ──────────────────────────────────────

export async function uploadVideoFromUrl(
  videoUrl:         string,
  generatedVideoId: string,
  projectSlug:      string = "default",
  sessionId:        string = "unknown"
): Promise<CloudinaryResult> {
  const result = await cloudinary.uploader.upload(videoUrl, {
    folder:        `magicflow/${projectSlug}/${sessionId}`,
    public_id:     `video_${generatedVideoId}`,
    resource_type: "video",
    expires_at:    getExpiresAt(),      // GDPR: auto-briši po 48h
    tags:          ["magicflow", "video", generatedVideoId],
    eager: [
      { format: "mp4", quality: "auto" },
    ],
    eager_async: true,
  });

  return {
    publicId:  result.public_id,
    secureUrl: result.secure_url,
    format:    result.format,
    duration:  result.duration,
    bytes:     result.bytes,
  };
}

// ─── Izbriši asset ────────────────────────────────────────────

export async function deleteAsset(
  publicId:     string,
  resourceType: "image" | "video" = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate:    true,
  });
}

// ─── Generiraj podpisani URL ──────────────────────────────────

export function generateSignedUrl(
  publicId:       string,
  expiresInHours: number = 48,
  resourceType:   "image" | "video" = "video"
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInHours * 60 * 60;

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type:          "authenticated",
    sign_url:      true,
    expires_at:    expiresAt,
    secure:        true,
  });
}

// ─── Generiraj thumbnail iz videa ────────────────────────────

export function generateVideoThumbnail(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type:  "video",
    format:         "jpg",
    transformation: [
      { width: 640, height: 360, crop: "fill" },
      { quality: "auto" },
      { start_offset: "0" },
    ],
    secure: true,
  });
}
