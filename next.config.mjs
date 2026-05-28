import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const csp = [
      `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https: blob:`,
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' data: https: wss: ws:",
      "media-src 'self' blob: https:",
      "worker-src 'self' blob:",
      "frame-src 'self' https:",
      "default-src 'self'",
    ]
      .filter(Boolean)
      .join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

const pwaConfig = withPWA({
  dest:                         "public",
  cacheOnFrontEndNav:           true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline:               true,
  disable:                      process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\/api\/projects\/.*\/config/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-config-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      {
        urlPattern: /^https:\/\/.*\/api\/operator\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-operator-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 5 },
        },
      },
      {
        urlPattern: /^https:\/\/.*\/api\/video-status\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "video-status-cache",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 50, maxAgeSeconds: 30 },
        },
      },
      {
        urlPattern: /^https:\/\/.*\/api\/generate-video/,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https:\/\/.*\/api\/analyze-pose/,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "cloudinary-images",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 48 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
      {
        urlPattern: /^\/_next\/static\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: /\/kiosk\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "kiosk-pages",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
    ],
  },
});

export default pwaConfig(nextConfig);
