"use client";

import { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";

// ─── Tipi ──────────────────────────────────────────────────────

interface VideoPair {
  id:       string;
  videoUrl: string;
  prompt:   string;
}

interface RatingClientProps {
  sessionId:   string;
  sessionName: string;
  readyCount:  number;
}

// ─── Anonimni ID ocenjevalca ──────────────────────────────────

function getRaterId(): string {
  if (typeof window === "undefined") return "ssr";
  const key = "magicflow_rater_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── MOS zvezd komponenta ─────────────────────────────────────

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  const MOS_LABELS = ["", "Slabo", "Zadovoljivo", "Dobro", "Zelo dobro", "Odlično"];

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-white/50 uppercase tracking-widest">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="transition-transform active:scale-90"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <Star
              className="h-8 w-8"
              fill={(hover || value) >= n ? "#FFB020" : "none"}
              stroke={(hover || value) >= n ? "#FFB020" : "rgba(255,255,255,0.25)"}
            />
          </button>
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: value > 0 ? "#FFB020" : "rgba(255,255,255,0.3)" }}>
        {MOS_LABELS[hover || value] || "—"}
      </p>
    </div>
  );
}

// ─── Video predvajalnik ───────────────────────────────────────

function VideoCard({ video, label }: { video: VideoPair; label: "A" | "B" }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else         { ref.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
        >
          {label}
        </div>
        <p className="text-xs text-white/40">Video {label}</p>
      </div>
      <div
        onClick={toggle}
        className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group bg-black border border-white/10"
      >
        <video
          ref={ref}
          src={video.videoUrl}
          loop
          muted={false}
          playsInline
          className="w-full h-full object-contain"
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="h-7 w-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Glavna komponenta ────────────────────────────────────────

export function RatingClient({ sessionId, sessionName, readyCount }: RatingClientProps) {
  const [raterId,    setRaterId]   = useState<string>("");
  const [pair,       setPair]      = useState<[VideoPair, VideoPair] | null>(null);
  const [remaining,  setRemaining] = useState(readyCount);
  const [done,       setDone]      = useState(false);
  const [loading,    setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rated,      setRated]     = useState(0);

  const [qA, setQA] = useState(0);
  const [sA, setSA] = useState(0);
  const [qB, setQB] = useState(0);
  const [sB, setSB] = useState(0);

  const canSubmit = qA > 0 && sA > 0 && qB > 0 && sB > 0;

  useEffect(() => {
    setRaterId(getRaterId());
  }, []);

  const fetchNextPair = async (id: string) => {
    setLoading(true);
    setQA(0); setSA(0); setQB(0); setSB(0);
    try {
      const res  = await fetch(`/api/eval/rate?sessionId=${sessionId}&raterId=${encodeURIComponent(id)}`);
      const data = await res.json() as { success: boolean; done?: boolean; remaining?: number; pair?: VideoPair[] };
      if (data.success) {
        if (data.done) { setDone(true); }
        else {
          setPair(data.pair as [VideoPair, VideoPair]);
          setRemaining(data.remaining ?? 0);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (raterId) fetchNextPair(raterId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raterId]);

  const handleSubmit = async () => {
    if (!pair || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await Promise.all([
        fetch("/api/eval/rate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evalResultId: pair[0].id, raterAnonymousId: raterId, mosQuality: qA, mosStyleMatch: sA }),
        }),
        fetch("/api/eval/rate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evalResultId: pair[1].id, raterAnonymousId: raterId, mosQuality: qB, mosStyleMatch: sB }),
        }),
      ]);
      setRated((n) => n + 2);
      await fetchNextPair(raterId);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !pair) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-t-transparent border-yellow-400 animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-4xl">✓</div>
        <h1 className="text-3xl font-bold text-white">Hvala!</h1>
        <p className="text-white/60 max-w-sm">
          Ocenili ste {rated} videov. Vaše ocene so anonimno shranjene in bodo използvane za analizo kakovosti AI modelov.
        </p>
        <p className="text-xs text-white/30 font-mono">ID: {raterId}</p>
      </div>
    );
  }

  if (!pair) return null;

  const [videoA, videoB] = pair;
  const promptText = videoA.prompt.length > 100 ? videoA.prompt.slice(0, 100) + "…" : videoA.prompt;

  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest">Slepa primerjava · {sessionName}</p>
          <p className="text-sm text-white/70 mt-0.5">Ocenite oba videa neodvisno</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Ocenili ste</p>
          <p className="text-lg font-bold text-yellow-400">{rated}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Prompt */}
        <div
          className="mb-6 px-5 py-3 rounded-2xl text-sm text-white/60 text-center"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span className="text-white/30 mr-2">Stil:</span>
          {promptText}
        </div>

        {/* Videi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <VideoCard video={videoA} label="A" />
          <VideoCard video={videoB} label="B" />
        </div>

        {/* Ocenjevanje */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Video A */}
          <div className="space-y-5">
            <p className="text-center text-sm font-semibold text-white/70">Ocena videa A</p>
            <StarRating value={qA} onChange={setQA} label="Kakovost (MOS)" />
            <StarRating value={sA} onChange={setSA} label="Ujemanje s stilom" />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-white/8 absolute left-1/2" />

          {/* Video B */}
          <div className="space-y-5">
            <p className="text-center text-sm font-semibold text-white/70">Ocena videa B</p>
            <StarRating value={qB} onChange={setQB} label="Kakovost (MOS)" />
            <StarRating value={sB} onChange={setSB} label="Ujemanje s stilom" />
          </div>
        </div>

        {/* Gumb */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full max-w-sm py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              backgroundColor: canSubmit ? "#FFB020" : "rgba(255,255,255,0.08)",
              color:           canSubmit ? "black" : "rgba(255,255,255,0.4)",
              minHeight: 64,
            }}
          >
            {submitting ? "Shranjujem..." : "Potrdi oceni →"}
          </button>
          <p className="text-xs text-white/25">
            {remaining > 2 ? `Še ~${Math.floor(remaining / 2)} parov` : "Zadnji par!"}
          </p>
        </div>
      </div>
    </div>
  );
}
