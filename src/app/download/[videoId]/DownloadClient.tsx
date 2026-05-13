"use client";

import { useRef, useState } from "react";

interface DownloadClientProps {
  videoUrl:     string;
  thumbnailUrl: string;
  projectName:  string;
  primaryColor: string;
  logoUrl:      string;
  videoId:      string;
  model:        string;
}

export function DownloadClient({
  videoUrl,
  thumbnailUrl,
  projectName,
  primaryColor,
  logoUrl,
  videoId,
  model,
}: DownloadClientProps) {
  const videoRef           = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [shared,  setShared]    = useState(false);

  const handleDownload = async () => {
    const link    = document.createElement("a");
    link.href     = videoUrl;
    link.download = `magicflow-${videoId}.mp4`;
    link.target   = "_blank";
    link.click();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Moj Magicflow video ✨", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-start pb-12">

      {/* Header */}
      <div className="w-full flex items-center justify-center gap-3 px-6 py-5 border-b border-white/5">
        {logoUrl ? (
          <img src={logoUrl} alt={projectName} className="h-8 w-auto object-contain" />
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-black font-bold text-sm"
            style={{ backgroundColor: primaryColor }}>M</div>
        )}
        <span className="text-white/60 text-sm font-medium">{projectName}</span>
      </div>

      {/* Video player */}
      <div className="w-full max-w-md px-4 mt-8">
        <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl"
          style={{ boxShadow: `0 0 60px ${primaryColor}22` }}>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            controls
            playsInline
            loop
            className="w-full aspect-video object-cover"
            onPlay={()  => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>

        {/* Info */}
        <div className="flex items-center justify-between mt-4 px-1">
          <div>
            <p className="text-white text-lg font-semibold">Tvoj AI video ✨</p>
            <p className="text-white/40 text-xs mt-0.5">Ustvarjen z {model} • Magicflow</p>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-medium border"
            style={{ color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }}>
            AI Generated
          </div>
        </div>

        {/* GDPR opomba */}
        <div className="mt-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/40 text-xs text-center">
            ⏰ Ta video bo samodejno izbrisan po 48 urah iz varnostnih razlogov (GDPR).
          </p>
        </div>

        {/* Gumbi */}
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleDownload}
            className="w-full py-4 rounded-2xl text-black font-semibold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ backgroundColor: primaryColor }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Prenesi video
          </button>

          <button
            onClick={handleShare}
            className="w-full py-4 rounded-2xl text-white font-medium text-base flex items-center justify-center gap-2 active:scale-95 transition-transform border border-white/10 bg-white/5"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {shared ? "Kopirano! ✓" : "Deli z drugimi"}
          </button>
        </div>

        {/* Powered by */}
        <p className="text-center text-white/20 text-xs mt-10">
          Ustvarjeno z ❤️ pri <span style={{ color: primaryColor }}>Magicflow</span>
        </p>
      </div>
    </main>
  );
}
