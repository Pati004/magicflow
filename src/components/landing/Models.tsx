const models = [
  { name: "Runway", tag: "Gen-3 Alpha · API",    latency: "~ 42s", cost: "€ 0.21", quality: 4, strength: "Realizem & koža",    bright: false, rec: false },
  { name: "Kling",  tag: "v1.6 · K-API",         latency: "~ 58s", cost: "€ 0.14", quality: 5, strength: "Kompleksne poze",     bright: true,  rec: true  },
  { name: "Luma",   tag: "Dream Machine",         latency: "~ 36s", cost: "€ 0.18", quality: 4, strength: "Kamerni gibi",        bright: false, rec: false },
  { name: "Pika",   tag: "v2.2 · turbo",          latency: "~ 28s", cost: "€ 0.09", quality: 3, strength: "Hitrost & cena",      bright: false, rec: false },
];

function Bars({ level, bright }: { level: number; bright: boolean }) {
  return (
    <span className="bars">
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={i < level ? (bright ? "bright" : "on") : ""} />
      ))}
    </span>
  );
}

export function Models() {
  return (
    <section id="models" className="l-section" style={{ background: "linear-gradient(180deg, var(--bg), var(--bg-2))" }}>
      <div className="l-container">
        <div className="sec-head reveal">
          <div>
            <div className="sec-head__num">/ 02 · MODELI</div>
            <h2 className="display sec-head__title" style={{ marginTop: 24 }}>
              Štirje I2V motorji,<br />en <em>orkestrator</em>.
            </h2>
          </div>
          <p className="sec-head__lede">
            Magicflow ne stavi na enega ponudnika. Glede na sceno, latenco in
            proračun se delovni proces samodejno preusmeri.
          </p>
        </div>

        <div className="models">
          {models.map((m, i) => (
            <div key={i} className={`model reveal ${m.rec ? "model--rec" : ""}`} data-stagger={i + 1}>
              {m.rec && (<>
                <span className="card__corner tl" /><span className="card__corner tr" />
                <span className="card__corner bl" /><span className="card__corner br" />
              </>)}
              <div>
                <div className="model__name">{m.name}</div>
                <div className={`model__tag ${m.rec ? "model__tag--rec" : ""}`}>
                  {m.rec ? "★ priporočen privzeti" : m.tag}
                </div>
              </div>
              <div className="model__rows">
                <div className="model__row">
                  <span className="model__rk">latenca</span>
                  <span className="model__rv model__rv--gold">{m.latency}</span>
                </div>
                <div className="model__row">
                  <span className="model__rk">cena / klip</span>
                  <span className="model__rv">{m.cost}</span>
                </div>
                <div className="model__row">
                  <span className="model__rk">kakovost</span>
                  <Bars level={m.quality} bright={m.bright} />
                </div>
                <div className="model__row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                  <span className="model__rk">prednost</span>
                  <span className="model__rv" style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 16 }}>{m.strength}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="reveal" style={{ marginTop: 48, padding: 32, border: "1px solid var(--line)", background: "var(--card)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>⌬ Orkestracija</div>
            <div className="display" style={{ fontSize: 24, color: "var(--text)" }}>
              Avtomatski <em>fallback</em> ob napaki, časovni proračun na klip.
            </div>
          </div>
          <a href="#features" className="btn btn--ghost"><span>Tehnični specifikat</span></a>
        </div>
      </div>
    </section>
  );
}
