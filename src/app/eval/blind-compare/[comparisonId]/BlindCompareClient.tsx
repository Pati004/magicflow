"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ─── Tipi ──────────────────────────────────────────────────────

interface Pair {
  id:         string;
  styleIndex: number;
  photoUrl:   string;
  videoA:     { url: string | null; type: "contextual" | "generic" };
  videoB:     { url: string | null; type: "contextual" | "generic" };
}

interface Reveal {
  contextualPrompt:  string;
  genericPromptName: string;
  genericPrompt:     string;
}

// ─── Pomočniki ────────────────────────────────────────────────

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

const STYLE_NAMES = ["Cinematic", "Dreamy", "Epic", "Joyful", "Elegant"];

// ─── Video predvajalnik ───────────────────────────────────────

function VideoPanel({
  label, videoUrl, fit, onFit,
}: {
  label:    "A" | "B";
  videoUrl: string | null;
  fit:      number;
  onFit:    (v: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!ref.current) return;
    playing ? ref.current.pause() : ref.current.play();
    setPlaying(!playing);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Label */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-sm font-bold text-white/60">{label}</div>
        <span className="text-xs text-white/40 uppercase tracking-widest">Video {label}</span>
      </div>

      {/* Video */}
      <div onClick={toggle} className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer bg-black border border-white/10 group">
        {videoUrl ? (
          <video ref={ref} src={videoUrl} loop playsInline className="w-full h-full object-contain" onEnded={() => setPlaying(false)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">Video ni na voljo</div>
        )}
        {!playing && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="h-7 w-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        )}
      </div>

      {/* Ujemanje s fotografijo */}
      <div className="space-y-2">
        <p className="text-center text-[10px] text-white/40 uppercase tracking-widest">Ujemanje videa s fotografijo</p>
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => onFit(n)}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                fit >= n ? "border-yellow-400 bg-yellow-400/20 text-yellow-400" : "border-white/15 text-white/30 hover:border-white/30",
              )}>
              {n}
            </button>
          ))}
        </div>
        <p className="text-center text-xs font-medium" style={{ color: fit > 0 ? "#FFB020" : "rgba(255,255,255,0.2)" }}>
          {["", "Ni ujemanja", "Slabo ujemanje", "Delno ujemanje", "Dobro ujemanje", "Popolno ujemanje"][fit] ?? ""}
        </p>
      </div>
    </div>
  );
}

// ─── Reveal overlay ───────────────────────────────────────────

function RevealCard({ reveal, preference, typeA, typeB }: { reveal: Reveal; preference: string; typeA: "contextual" | "generic"; typeB: "contextual" | "generic" }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#13131e] border border-white/15 rounded-3xl p-8 max-w-lg w-full space-y-6">
        <div className="text-center">
          <p className="text-3xl mb-2">{preference === "contextual" ? "🎯" : preference === "generic" ? "🎨" : "⚖️"}</p>
          <h2 className="text-xl font-bold text-white mb-1">
            {preference === "contextual" ? "Kontekstualni prompt" : preference === "generic" ? "Generični prompt" : "Enako ujemanje"}
          </h2>
          <p className="text-white/50 text-sm">Vaša preferenca</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={cn("p-4 rounded-2xl border", typeA === "contextual" ? "border-yellow-400/40 bg-yellow-400/10" : "border-white/10")}>
            <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Video A</p>
            <p className="text-sm font-semibold text-white">{typeA === "contextual" ? "Kontekstualni" : `Generični (${reveal.genericPromptName})`}</p>
          </div>
          <div className={cn("p-4 rounded-2xl border", typeB === "contextual" ? "border-yellow-400/40 bg-yellow-400/10" : "border-white/10")}>
            <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Video B</p>
            <p className="text-sm font-semibold text-white">{typeB === "contextual" ? "Kontekstualni" : `Generični (${reveal.genericPromptName})`}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-white/40">
          <div className="p-3 rounded-xl bg-white/4 border border-white/8">
            <p className="font-medium text-white/60 mb-1">Kontekstualni prompt (iz analize poze):</p>
            <p className="line-clamp-3">{reveal.contextualPrompt}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/4 border border-white/8">
            <p className="font-medium text-white/60 mb-1">Generični prompt ({reveal.genericPromptName}):</p>
            <p className="line-clamp-2">{reveal.genericPrompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Glavna komponenta ────────────────────────────────────────

export function BlindCompareClient({ comparisonId, comparisonName, readyPairs }: {
  comparisonId:   string;
  comparisonName: string;
  readyPairs:     number;
}) {
  const [raterId,    setRaterId]   = useState("");
  const [pair,       setPair]      = useState<Pair | null>(null);
  const [remaining,  setRemaining] = useState(readyPairs);
  const [done,       setDone]      = useState(false);
  const [loading,    setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rated,      setRated]     = useState(0);
  const [reveal,     setReveal]    = useState<Reveal | null>(null);
  const [preference, setPreference] = useState<"contextual" | "generic" | "equal" | null>(null);

  const [fitA, setFitA] = useState(0);
  const [fitB, setFitB] = useState(0);

  const canSubmit = fitA > 0 && fitB > 0 && preference !== null;

  useEffect(() => { setRaterId(getRaterId()); }, []);

  const fetchNext = async (id: string) => {
    setLoading(true);
    setFitA(0); setFitB(0); setPreference(null); setReveal(null);
    try {
      const res  = await fetch(`/api/eval/blind-compare?comparisonId=${comparisonId}&raterId=${encodeURIComponent(id)}`);
      const data = await res.json() as { success: boolean; done?: boolean; remaining?: number; pair?: Pair };
      if (data.success) {
        if (data.done) { setDone(true); }
        else           { setPair(data.pair ?? null); setRemaining(data.remaining ?? 0); }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (raterId) fetchNext(raterId); }, [raterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!pair || !canSubmit || submitting) return;
    setSubmitting(true);

    // Pretvori A/B oceni v kontekstualni/generični glede na type
    const contextualFit = pair.videoA.type === "contextual" ? fitA : fitB;
    const genericFit    = pair.videoA.type === "generic"    ? fitA : fitB;

    try {
      const res  = await fetch("/api/eval/blind-compare", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: pair.id, raterAnonymousId: raterId, contextualFit, genericFit, preference }),
      });
      const data = await res.json() as { success: boolean; reveal?: Reveal };
      if (data.success && data.reveal) {
        setReveal(data.reveal);
        setRated((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => { setReveal(null); fetchNext(raterId); };

  if (loading && !pair) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="h-10 w-10 rounded-full border-2 border-t-transparent border-yellow-400 animate-spin" /></div>;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-4xl">✓</div>
        <h1 className="text-3xl font-bold text-white">Hvala za sodelovanje!</h1>
        <p className="text-white/60 max-w-sm">Ocenili ste <strong className="text-white">{rated} parov</strong>. Vaše ocene pomagajo razumeti razliko med kontekstualnimi in generičnimi AI video prompti.</p>
        <p className="text-xs text-white/25 font-mono mt-4">Evalvacijski protokol T2 · Magicflow</p>
      </div>
    );
  }

  if (!pair) return null;

  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest">Slepa primerjava · {comparisonName}</p>
          <p className="text-sm text-white/60 mt-0.5">Stil {pair.styleIndex + 1}/5: <span className="text-white/80">{STYLE_NAMES[pair.styleIndex]}</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Ocenjenih</p>
          <p className="text-lg font-bold text-yellow-400">{rated}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Referenčna fotografija */}
        <div className="mb-6 flex items-center gap-4">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${pair.photoUrl}?w=120&h=120&c=fill`} alt="Fotografija" className="w-20 h-20 object-cover rounded-xl border border-white/15" />
          </div>
          <div
            className="flex-1 px-4 py-3 rounded-2xl text-sm text-white/50"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Navodilo</p>
            Oglejte si referenčno fotografijo in oba videa. Ocenite, kako dobro se vsak video ujema s <strong className="text-white/70">vsebino in razpoloženjem fotografije</strong>.
          </div>
        </div>

        {/* Videi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <VideoPanel label="A" videoUrl={pair.videoA.url} fit={fitA} onFit={setFitA} />
          <VideoPanel label="B" videoUrl={pair.videoB.url} fit={fitB} onFit={setFitB} />
        </div>

        {/* Preferenca */}
        <div className="p-6 rounded-3xl mb-6" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-center text-sm text-white/60 mb-4">Kateri video se <strong className="text-white">bolje ujema</strong> s fotografijo?</p>
          <div className="flex gap-3 justify-center">
            {(["A", "equal", "B"] as const).map((opt) => {
              const isA    = opt === "A";
              const isB    = opt === "B";
              const pref   = isA ? (pair.videoA.type) : isB ? (pair.videoB.type) : "equal";
              const label  = isA ? "Video A" : isB ? "Video B" : "Enako";
              const active = preference === pref;
              return (
                <button key={opt} onClick={() => setPreference(pref as typeof preference)}
                  className={cn("flex-1 py-3 rounded-2xl text-sm font-semibold border-2 transition-all max-w-[160px]",
                    active ? "border-yellow-400 bg-yellow-400/15 text-yellow-300" : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/60")}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Potrditev */}
        <div className="flex flex-col items-center gap-2">
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="w-full max-w-sm py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: canSubmit ? "#FFB020" : "rgba(255,255,255,0.08)", color: canSubmit ? "black" : "rgba(255,255,255,0.4)", minHeight: 64 }}>
            {submitting ? "Shranjujem..." : "Potrdi oceni"}
          </button>
          <p className="text-xs text-white/25">{remaining} parov čaka</p>
        </div>
      </div>

      {/* Reveal overlay */}
      {reveal && pair && (
        <>
          <RevealCard reveal={reveal} preference={preference ?? "equal"} typeA={pair.videoA.type} typeB={pair.videoB.type} />
          <button onClick={handleNext}
            className="fixed bottom-8 right-8 px-6 py-3 rounded-2xl bg-yellow-400 text-black font-semibold shadow-2xl hover:bg-yellow-300 transition-colors z-[60]">
            Naslednji par →
          </button>
        </>
      )}
    </div>
  );
}
