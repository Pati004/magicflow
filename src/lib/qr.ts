import QRCode from "qrcode";

// ─── URL format ───────────────────────────────────────────────

export function getDownloadUrl(generatedVideoId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://magicflow.app";
  return `${base}/download/${generatedVideoId}`;
}

// ─── Generiraj QR kodo kot SVG string ────────────────────────

export async function generateQRCode(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type:   "svg",
    margin: 1,
    width:  256,
    color: {
      dark:  "#0A0A0F",   // Magicflow ozadje barva
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
  return svg;
}

// ─── Generiraj QR kodo kot Data URL (za <img> tag) ────────────

export async function generateQRCodeDataUrl(url: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width:  256,
    color: {
      dark:  "#0A0A0F",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
  return dataUrl;
}

// ─── Generiraj QR za video (server-side) ─────────────────────

export async function generateVideoQR(generatedVideoId: string): Promise<{
  svg:     string;
  dataUrl: string;
  url:     string;
}> {
  const url     = getDownloadUrl(generatedVideoId);
  const svg     = await generateQRCode(url);
  const dataUrl = await generateQRCodeDataUrl(url);
  return { svg, dataUrl, url };
}
