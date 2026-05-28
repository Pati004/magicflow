"use client";

import { useState, useCallback } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Likertova lestvica 1–7 ───────────────────────────────────

const LIKERT_7 = [
  { v: 1, label: "1\nZelo slabo" },
  { v: 2, label: "2" },
  { v: 3, label: "3" },
  { v: 4, label: "4\nNevtralno" },
  { v: 5, label: "5" },
  { v: 6, label: "6" },
  { v: 7, label: "7\nZelo dobro" },
] as const;

function LikertScale({
  value, onChange, lowLabel, highLabel,
}: {
  value:     number | null;
  onChange:  (v: number) => void;
  lowLabel:  string;
  highLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {LIKERT_7.map(({ v }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all",
              value === v
                ? "border-gold bg-gold/15 text-gold"
                : "border-ink-ghost bg-background-elevated text-ink-muted hover:border-ink-faint hover:text-ink",
            )}
            style={{ minHeight: 48 }}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-faint">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// ─── Polje za prosto besedilo ─────────────────────────────────

function NoteField({
  label, value, onChange, placeholder,
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-ink-muted uppercase tracking-wide">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-ink-muted transition-colors"
      />
    </div>
  );
}

// ─── Sklop intervjuja ─────────────────────────────────────────

function Section({ title, number, children }: { title: string; number: number; children: React.ReactNode }) {
  return (
    <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-sm font-bold text-gold">
          {number}
        </div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Vprašanje ────────────────────────────────────────────────

function Question({ text }: { text: string }) {
  return <p className="text-sm font-medium text-ink">{text}</p>;
}

// ─── Glavna komponenta ────────────────────────────────────────

interface Existing {
  waitingFeelings:     number | null;
  waitingDuration:     number | null;
  waitingNotes:        string;
  videoDescription:    string;
  wouldWatchAgain:     number | null;
  videoQuality:        number | null;
  videoNotes:          string;
  preferredStyle:      string;
  wantsMoreOptions:    number | null;
  styleNotes:          string;
  // T4
  overallSatisfaction: number | null;
  interfaceRating:     number | null;
  totalLatencyMs:      number | null;
  generalNotes:        string;
}

interface InterviewClientProps {
  sessionId:       string;
  participantCode: string;
  existing:        Existing | null;
}

export function InterviewClient({ sessionId, participantCode, existing }: InterviewClientProps) {
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Sklop 1: Čakanje
  const [waitingFeelings,  setWaitingFeelings]  = useState<number | null>(existing?.waitingFeelings  ?? null);
  const [waitingDuration,  setWaitingDuration]  = useState<number | null>(existing?.waitingDuration  ?? null);
  const [waitingNotes,     setWaitingNotes]     = useState(existing?.waitingNotes     ?? "");

  // Sklop 2: Video rezultat
  const [videoDescription, setVideoDescription] = useState(existing?.videoDescription ?? "");
  const [wouldWatchAgain,  setWouldWatchAgain]  = useState<number | null>(existing?.wouldWatchAgain  ?? null);
  const [videoQuality,     setVideoQuality]     = useState<number | null>(existing?.videoQuality     ?? null);
  const [videoNotes,       setVideoNotes]       = useState(existing?.videoNotes       ?? "");

  // Sklop 3: Primerjava stilov
  const [preferredStyle,   setPreferredStyle]   = useState(existing?.preferredStyle   ?? "");
  const [wantsMoreOptions, setWantsMoreOptions] = useState<number | null>(existing?.wantsMoreOptions ?? null);
  const [styleNotes,       setStyleNotes]       = useState(existing?.styleNotes       ?? "");

  // Splošno
  const [generalNotes,     setGeneralNotes]     = useState(existing?.generalNotes     ?? "");

  // T4 — regresija
  const [overallSatisfaction, setOverallSatisfaction] = useState<number | null>(existing?.overallSatisfaction ?? null);
  const [interfaceRating,     setInterfaceRating]     = useState<number | null>(existing?.interfaceRating     ?? null);
  const [totalLatencyMs,      setTotalLatencyMs]      = useState<string>(
    existing?.totalLatencyMs != null ? String(existing.totalLatencyMs) : "",
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/ux-study/interviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observationSessionId: sessionId,
          waitingFeelings:     waitingFeelings     ?? undefined,
          waitingDuration:     waitingDuration     ?? undefined,
          waitingNotes:        waitingNotes        || undefined,
          videoDescription:    videoDescription    || undefined,
          wouldWatchAgain:     wouldWatchAgain     ?? undefined,
          videoQuality:        videoQuality        ?? undefined,
          videoNotes:          videoNotes          || undefined,
          preferredStyle:      preferredStyle      || undefined,
          wantsMoreOptions:    wantsMoreOptions    ?? undefined,
          styleNotes:          styleNotes          || undefined,
          overallSatisfaction: overallSatisfaction ?? undefined,
          interfaceRating:     interfaceRating     ?? undefined,
          totalLatencyMs:      totalLatencyMs ? parseInt(totalLatencyMs, 10) : undefined,
          generalNotes:        generalNotes        || undefined,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [sessionId, waitingFeelings, waitingDuration, waitingNotes, videoDescription, wouldWatchAgain, videoQuality, videoNotes, preferredStyle, wantsMoreOptions, styleNotes, overallSatisfaction, interfaceRating, totalLatencyMs, generalNotes]);

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Pol-strukturiran intervju</h1>
          <p className="text-ink-muted text-sm mt-0.5">Udeleženec: <strong className="text-ink">{participantCode}</strong></p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all",
            saved
              ? "bg-green-500/15 text-green-400 border border-green-500/30"
              : "bg-gold hover:bg-gold-500 text-black",
          )}
        >
          {saved   ? <><CheckCircle2 className="h-4 w-4" /> Shranjeno</> :
           saving  ? "Shranjujem..." :
           <><Save className="h-4 w-4" />Shrani</>}
        </button>
      </div>

      {/* ─── SKLOP 1: ČAKANJE ──────────────────────────────── */}
      <Section title="Čakanje na video" number={1}>
        <div className="space-y-5">
          <div className="space-y-3">
            <Question text="Kako ste se počutili med čakanjem na generiranje videa?" />
            <LikertScale value={waitingFeelings} onChange={setWaitingFeelings} lowLabel="Zelo slabo / tesnoben" highLabel="Sproščeno / vznemirjeno" />
          </div>

          <div className="space-y-3">
            <Question text="Kako dolgo se vam je zdelo čakanje?" />
            <LikertScale value={waitingDuration} onChange={setWaitingDuration} lowLabel="Zelo kratko" highLabel="Zelo dolgo" />
          </div>

          <NoteField
            label="Citat / opazka"
            value={waitingNotes}
            onChange={setWaitingNotes}
            placeholder={`npr. "Nisem vedel, kaj se dogaja..." / "Pričakoval/-a sem 10 sekund..."`}
          />
        </div>
      </Section>

      {/* ─── SKLOP 2: VIDEO REZULTAT ───────────────────────── */}
      <Section title="Video rezultat" number={2}>
        <div className="space-y-5">
          <div className="space-y-2">
            <Question text="Kako bi opisali video, ki ste ga dobili?" />
            <textarea
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              placeholder="Udeleženec prosto opiše video..."
              rows={4}
              className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-ink-muted"
            />
          </div>

          <div className="space-y-3">
            <Question text="Bi si ogledali ta video znova ali ga delili?" />
            <LikertScale value={wouldWatchAgain} onChange={setWouldWatchAgain} lowLabel="Zagotovo ne" highLabel="Zagotovo da" />
          </div>

          <div className="space-y-3">
            <Question text="Kako ocenjujete kakovost videa?" />
            <LikertScale value={videoQuality} onChange={setVideoQuality} lowLabel="Zelo slaba" highLabel="Odlična" />
          </div>

          <NoteField
            label="Opomba / citat"
            value={videoNotes}
            onChange={setVideoNotes}
            placeholder={`npr. "Gibanje je izgledalo čudno..." / "Presenetila me je kvaliteta..."`}
          />
        </div>
      </Section>

      {/* ─── SKLOP 3: PRIMERJAVA STILOV ────────────────────── */}
      <Section title="Primerjava stilov" number={3}>
        <div className="space-y-5">
          <div className="space-y-2">
            <Question text="Kateri stil animacije vam je bil najbolj všeč?" />
            <input
              type="text"
              value={preferredStyle}
              onChange={(e) => setPreferredStyle(e.target.value)}
              placeholder="Ime stila ali opis..."
              className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ink-muted"
            />
          </div>

          <div className="space-y-3">
            <Question text="Bi si želeli imeti več možnosti stilov za izbiro?" />
            <LikertScale value={wantsMoreOptions} onChange={setWantsMoreOptions} lowLabel="Sploh ne" highLabel="Absolutno da" />
          </div>

          <NoteField
            label="Opomba / citat"
            value={styleNotes}
            onChange={setStyleNotes}
            placeholder={`npr. "Dramatični mi ni bil všeč..." / "Elegantni je bil čudovit..."`}
          />
        </div>
      </Section>

      {/* ─── SKLOP 4: SKUPNA OCENA (T4) ────────────────────── */}
      <Section title="Skupna ocena izkušnje (T4)" number={4}>
        <p className="text-xs text-ink-muted -mt-2 mb-2">
          Podatki za regresijsko analizo dejavnikov zadovoljstva.
        </p>
        <div className="space-y-5">
          <div className="space-y-3">
            <Question text="Kako skupno ocenjujete celotno izkušnjo z Magicflow?" />
            <LikertScale
              value={overallSatisfaction}
              onChange={setOverallSatisfaction}
              lowLabel="Zelo slabo"
              highLabel="Odlično"
            />
          </div>

          <div className="space-y-3">
            <Question text="Kako intuitivna se vam je zdela aplikacija?" />
            <LikertScale
              value={interfaceRating}
              onChange={setInterfaceRating}
              lowLabel="Zelo zmedena"
              highLabel="Popolnoma jasna"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted uppercase tracking-wide">
              Izmerjena latenca generiranja videa (ms)
            </label>
            <p className="text-xs text-ink-faint">Prepiši iz konzole opazovanja ali iz admin logs.</p>
            <input
              type="number"
              value={totalLatencyMs}
              onChange={(e) => setTotalLatencyMs(e.target.value)}
              placeholder="npr. 45000"
              className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-ink-muted"
            />
          </div>
        </div>
      </Section>

      {/* ─── SPLOŠNO ───────────────────────────────────────── */}
      <div className="bg-background-surface border border-ink-ghost rounded-2xl p-6">
        <h2 className="text-base font-semibold text-ink mb-4">Splošne opombe</h2>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Prosto besedilo — dodatna opažanja, citati, predlogi..."
          rows={5}
          className="w-full bg-background-elevated border border-ink-ghost rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:border-ink-muted"
        />
      </div>

      {/* Gumb na dnu */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold bg-gold hover:bg-gold-500 text-black transition-all"
          style={{ minHeight: 56 }}
        >
          <Save className="h-5 w-5" />
          {saving ? "Shranjujem..." : "Shrani intervju"}
        </button>
      </div>
    </div>
  );
}
