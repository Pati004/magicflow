const frames = [
  { l: "F-001 · INPUT", g: false }, { l: "F-002 · POSE", g: true },
  { l: "F-003 · GEN",   g: false }, { l: "F-004 · LIVE", g: true },
  { l: "F-005 · INPUT", g: false }, { l: "F-006 · POSE", g: false },
  { l: "F-007 · GEN",   g: true  }, { l: "F-008 · LIVE", g: false },
];
const track = [...frames, ...frames, ...frames];

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{k}</div>
      <div className="display" style={{ fontSize: 36, color: "var(--gold-bright)", fontStyle: "italic" }}>{v}</div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="l-section" style={{ paddingTop: 180, paddingBottom: 60, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="crosshair" style={{ top: 140, left: 48 }} />
      <div className="crosshair" style={{ top: 140, right: 48 }} />

      <div className="l-container">
        <div className="reveal" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 40 }}>
          <span className="hairline" style={{ width: 64 }} />
          <span className="eyebrow">v1.0 · Image-to-Video Platforma</span>
        </div>

        <h1 className="display reveal" data-stagger="1" style={{ fontSize: "clamp(56px, 9vw, 140px)", maxWidth: "14ch" }}>
          Vsaka fotografija<br />
          postane <em>živa</em><br />
          spomin.
        </h1>

        <div className="reveal" data-stagger="2" style={{ display: "flex", gap: 64, marginTop: 56, flexWrap: "wrap", alignItems: "flex-end" }}>
          <p style={{ maxWidth: 440, fontSize: 14, lineHeight: 1.8, color: "var(--text-2)", margin: 0 }}>
            Magicflow je dogodkovna platforma, ki statične portrete pretvori v
            kratke filmske animacije. Operator zajame, AI oživi, gost odnese
            domov — vse v manj kot dveh minutah.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="#flow" className="btn btn--solid">
              <span>Oglej si potek</span>
              <span style={{ fontSize: 10 }}>↗</span>
            </a>
            <a href="#models" className="btn btn--ghost"><span>AI modeli</span></a>
          </div>
        </div>

        <div className="reveal" data-stagger="3" style={{ display: "flex", gap: 48, marginTop: 80, flexWrap: "wrap" }}>
          <Stat k="latenca obhoda" v="≤ 90s" />
          <Stat k="ločljivost" v="1080p · 24fps" />
          <Stat k="modeli I2V" v="4 ponudniki" />
          <Stat k="offline način" v="PWA · Edge" />
        </div>
      </div>

      <div className="filmstrip reveal" data-stagger="4" aria-hidden="true">
        <div className="filmstrip__track">
          {track.map((f, i) => (
            <div key={i} className={`filmstrip__frame ${f.g ? "filmstrip__frame--gold" : ""}`} data-label={f.l} />
          ))}
        </div>
      </div>
    </section>
  );
}
