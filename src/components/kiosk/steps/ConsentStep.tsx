"use client";

interface ConsentStepProps {
  primaryColor: string;
  onAgree:      () => void;
  onDecline:    () => void;
}

export function ConsentStep({ primaryColor, onAgree, onDecline }: ConsentStepProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8 max-w-lg mx-auto">
      {/* Ikona */}
      <div
        className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl mb-8 shadow-lg"
        style={{ backgroundColor: `${primaryColor}22`, border: `2px solid ${primaryColor}44` }}
      >
        🔒
      </div>

      <h2 className="text-3xl font-bold text-white text-center mb-4">
        Zasebnost in privolitev
      </h2>

      <div
        className="rounded-2xl p-6 mb-8 text-center"
        style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <p className="text-white/70 text-base leading-relaxed mb-4">
          Vaša fotografija bo posneta in začasno shranjena za namen ustvarjanja osebnega video posnetka.
        </p>
        <p className="text-white/70 text-base leading-relaxed mb-4">
          Podatki bodo <strong className="text-white">samodejno izbrisani po 48 urah</strong>.
        </p>
        <p className="text-white/50 text-sm leading-relaxed">
          Z nadaljevanjem se strinjate z obdelavo vaše fotografije v skladu z GDPR.
        </p>
      </div>

      {/* Gumbi */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onAgree}
          className="w-full py-5 rounded-xl text-black font-semibold text-lg active:scale-[0.97] transition-transform"
          style={{ backgroundColor: primaryColor, minHeight: 56 }}
        >
          Strinjam se ✓
        </button>
        <button
          onClick={onDecline}
          className="w-full py-4 rounded-xl text-white/50 font-medium text-base active:scale-[0.97] transition-transform"
          style={{ border: "1px solid rgba(255,255,255,0.15)", minHeight: 56 }}
        >
          Ne, hvala
        </button>
      </div>
    </div>
  );
}
