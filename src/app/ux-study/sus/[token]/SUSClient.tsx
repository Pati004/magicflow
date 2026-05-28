"use client";

import { useState } from "react";
import { SUS_QUESTIONS, SUS_SCALE } from "@/lib/ux/sus-scoring";
import { cn } from "@/lib/utils";

// ─── Tipi ──────────────────────────────────────────────────────

type Phase = "intro" | "demographics" | "questions" | "done";

interface SUSClientProps {
  token:        string;
  sessionLabel: string;
}

// ─── Zahvalna stran ───────────────────────────────────────────

function ThankYouScreen({ score, grade }: { score: number; grade: string }) {
  const emoji = score > 90 ? "🌟" : score > 80 ? "✅" : score > 68 ? "👍" : "📋";
  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="text-6xl">{emoji}</div>
        <h1 className="text-3xl font-bold text-white">Hvala za sodelovanje!</h1>
        <p className="text-white/60 leading-relaxed">
          Vaše mnenje je dragoceno za izboljšavo platforme Magicflow. Vaše ocene smo varno shranili.
        </p>
        <div
          className="inline-block px-6 py-3 rounded-2xl border"
          style={{ borderColor: "rgba(255,176,32,0.3)", backgroundColor: "rgba(255,176,32,0.1)" }}
        >
          <p className="text-sm text-white/50 mb-1">Ocena sistema</p>
          <p className="text-2xl font-bold" style={{ color: "#FFB020" }}>{grade}</p>
        </div>
        <p className="text-xs text-white/25">Evalvacijski protokol T3 · Magicflow UX Study</p>
      </div>
    </div>
  );
}

// ─── Demografska vprašanja ────────────────────────────────────

function DemographicsStep({
  onNext,
}: {
  onNext: (age: number | null, tech: string | null) => void;
}) {
  const [age,  setAge]  = useState("");
  const [tech, setTech] = useState("");

  return (
    <div className="max-w-lg mx-auto px-6 py-12 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Pred začetkom</h2>
        <p className="text-white/50 text-sm">Dva kratka demografska vprašanja (neobvezno)</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-white/70">Vaša starost</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="npr. 28"
          min={18} max={99}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-yellow-400/50"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm text-white/70">Izkušnje z digitalnimi orodji / aplikacijami</label>
        {(["nizka", "srednja", "visoka"] as const).map((val) => {
          const labels = { nizka: "Nizka — redko uporabljam digitalna orodja", srednja: "Srednja — redno използvam aplikacije", visoka: "Visoka — pogosto upravljam kompleksne sisteme" };
          return (
            <button
              key={val}
              onClick={() => setTech(val)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                tech === val
                  ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300"
                  : "border-white/10 text-white/60 hover:border-white/25",
              )}
            >
              {labels[val]}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onNext(age ? parseInt(age) : null, tech || null)}
        className="w-full py-4 rounded-2xl font-semibold text-black text-base"
        style={{ backgroundColor: "#FFB020", minHeight: 56 }}
      >
        Začni vprašalnik →
      </button>
    </div>
  );
}

// ─── En SUS korak (vprašanje) ─────────────────────────────────

function QuestionStep({
  question,
  index,
  total,
  value,
  onChange,
}: {
  question: typeof SUS_QUESTIONS[number];
  index:    number;
  total:    number;
  value:    number;
  onChange: (v: number) => void;
}) {
  const pct = ((index) / total) * 100;

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-white/40 mb-2">
          <span>Vprašanje {index + 1} od {total}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: "#FFB020" }}
          />
        </div>
      </div>

      {/* Vprašanje */}
      <div className="mb-10">
        <div
          className="inline-block px-3 py-1 rounded-full text-[11px] mb-4 border"
          style={{
            backgroundColor: question.positive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            borderColor:     question.positive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
            color:           question.positive ? "#86efac" : "#fca5a5",
          }}
        >
          {question.positive ? "Pozitivna trditev" : "Negativna trditev"}
        </div>
        <p className="text-white text-xl font-medium leading-relaxed">{question.text}</p>
      </div>

      {/* Lestvica */}
      <div className="space-y-2">
        {SUS_SCALE.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99]",
              value === opt.value
                ? "border-yellow-400 bg-yellow-400/15"
                : "border-white/10 hover:border-white/25 bg-white/3",
            )}
            style={{ minHeight: 60 }}
          >
            <span
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                value === opt.value ? "bg-yellow-400 text-black" : "bg-white/10 text-white/50",
              )}
            >
              {opt.value}
            </span>
            <span className={cn("text-sm", value === opt.value ? "text-yellow-200" : "text-white/60")}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Glavna komponenta ────────────────────────────────────────

export function SUSClient({ token, sessionLabel }: SUSClientProps) {
  const [phase,     setPhase]     = useState<Phase>("intro");
  const [qIndex,    setQIndex]    = useState(0);
  const [answers,   setAnswers]   = useState<number[]>(new Array(10).fill(0));
  const [demoAge,   setDemoAge]   = useState<number | null>(null);
  const [demoTech,  setDemoTech]  = useState<string | null>(null);
  const [result,    setResult]    = useState<{ score: number; grade: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const currentAnswer = answers[qIndex] ?? 0;
  const allAnswered   = answers.every((a) => a > 0);

  const setAnswer = (val: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = val;
      return next;
    });
  };

  const goNext = () => {
    if (qIndex < SUS_QUESTIONS.length - 1) {
      setQIndex((i) => i + 1);
    }
  };

  const handleDemographics = (age: number | null, tech: string | null) => {
    setDemoAge(age);
    setDemoTech(tech);
    setPhase("questions");
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res  = await fetch("/api/ux-study/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token:          decodeURIComponent(token),
          answers,
          participantAge: demoAge ?? undefined,
          techExperience: demoTech ?? undefined,
        }),
      });
      const data = await res.json() as { success: boolean; score?: number; grade?: string; error?: string };
      if (data.success && data.score !== undefined && data.grade) {
        setResult({ score: data.score, grade: data.grade });
        setPhase("done");
      } else {
        setError(data.error ?? "Napaka pri shranjevanju.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "done" && result) return <ThankYouScreen {...result} />;

  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4">
        <p className="text-xs text-white/30 uppercase tracking-widest">Evalvacija sistema · {sessionLabel}</p>
      </div>

      {/* Intro */}
      {phase === "intro" && (
        <div className="max-w-lg mx-auto px-6 py-12 space-y-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-white">Ocenite uporabnost sistema</h1>
            <p className="text-white/60 leading-relaxed">
              Pred vami je kratki standardizirani vprašalnik o uporabnosti (<strong className="text-white/80">SUS</strong>). Vsebuje <strong className="text-white/80">10 trditev</strong>, za katere označite stopnjo strinjanja. Izpolnjevanje traja <strong className="text-white/80">2–3 minute</strong>.
            </p>
            <div className="p-4 rounded-2xl bg-white/4 border border-white/8 text-sm text-white/50 space-y-2">
              <p>• Odgovarjajte glede na <strong className="text-white/70">vašo izkušnjo</strong> z aplikacijo Magicflow Kiosk</p>
              <p>• Ni pravilnih ali napačnih odgovorov</p>
              <p>• Vaši odgovori so anonimni</p>
              <p>• Vsako vprašanje mora biti odgovorjeno — vračanje ni možno</p>
            </div>
          </div>
          <button
            onClick={() => setPhase("demographics")}
            className="w-full py-4 rounded-2xl font-semibold text-black text-base"
            style={{ backgroundColor: "#FFB020", minHeight: 56 }}
          >
            Začni →
          </button>
        </div>
      )}

      {/* Demografija */}
      {phase === "demographics" && (
        <DemographicsStep onNext={handleDemographics} />
      )}

      {/* Vprašanja */}
      {phase === "questions" && (
        <div>
          <QuestionStep
            question={SUS_QUESTIONS[qIndex]!}
            index={qIndex}
            total={SUS_QUESTIONS.length}
            value={currentAnswer}
            onChange={setAnswer}
          />

          {/* Navigacija */}
          <div className="max-w-xl mx-auto px-6 pb-10 flex items-center gap-4">
            {qIndex < SUS_QUESTIONS.length - 1 ? (
              <button
                onClick={goNext}
                disabled={currentAnswer === 0}
                className="flex-1 py-4 rounded-2xl font-semibold text-black transition-all disabled:opacity-40"
                style={{ backgroundColor: "#FFB020", minHeight: 56 }}
              >
                Naprej →
              </button>
            ) : (
              <div className="flex-1 space-y-3">
                {!allAnswered && (
                  <p className="text-center text-sm text-white/40">
                    Odgovorite na vsa vprašanja ({answers.filter((a) => a === 0).length} ostalo)
                  </p>
                )}
                {error && <p className="text-center text-sm text-red-400">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  className="w-full py-4 rounded-2xl font-semibold text-black transition-all disabled:opacity-40"
                  style={{ backgroundColor: "#FFB020", minHeight: 56 }}
                >
                  {submitting ? "Shranjujem..." : "Zaključi in pošlji"}
                </button>
              </div>
            )}
          </div>

          {/* Mini pregled odgovorov */}
          <div className="max-w-xl mx-auto px-6 pb-8">
            <div className="flex gap-1.5 flex-wrap justify-center">
              {SUS_QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setQIndex(i)}
                  className={cn(
                    "h-8 w-8 rounded-full text-xs font-medium transition-all",
                    i === qIndex
                      ? "ring-2 ring-yellow-400 bg-yellow-400/20 text-yellow-300"
                      : answers[i]
                        ? "bg-white/15 text-white/70"
                        : "bg-white/5 text-white/30",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
