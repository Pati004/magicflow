const steps = [
  { num: "I",   tag: "01 · Zajem",       title: "Fotografija",    body: "Operator z DSLR ali tablico zajame portret. EXIF, osvetlitev in barvni profil se ohranijo skozi celotno verigo." },
  { num: "II",  tag: "02 · Razumevanje", title: "Analiza poze",   body: "Vision AI v sekundi razbere skeletno strukturo, smer pogleda in mikroizraze. Pripravi prompt za I2V model." },
  { num: "III", tag: "03 · Oživitev",    title: "Generiranje",    body: "Izbrani I2V model ustvari 5-sekundno animacijo. Rezultat se vodno-žigosa in shrani v dogodkovni arhiv." },
  { num: "IV",  tag: "04 · Predaja",     title: "Prenos & tisk",  body: "Gost s QR kodo prevzame MP4. Hkrati opcijsko natisne premium fotoprint. Brisanje po 48h (GDPR)." },
];

export function HowItWorks() {
  return (
    <section id="flow" className="l-section">
      <div className="l-container">
        <div className="sec-head reveal">
          <div>
            <div className="sec-head__num">/ 01 · POTEK</div>
            <h2 className="display sec-head__title" style={{ marginTop: 24 }}>
              Štirje koraki od<br />portreta do <em>spomina</em>.
            </h2>
          </div>
          <p className="sec-head__lede">
            Vsaka faza je merljiva, opazovana in zamenljiva. Operator vidi
            časovnico v realnem času, gost samo končni rezultat.
          </p>
        </div>

        <div className="steps reveal" data-stagger="1">
          {steps.map((s, i) => (
            <div key={i} className="step">
              <div className="step__tag">{s.tag}</div>
              <div className="step__num">{s.num}</div>
              <div className="step__title">{s.title}</div>
              <p className="step__body">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="reveal" data-stagger="2" style={{ marginTop: 48, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24, fontSize: 11, color: "var(--muted)", letterSpacing: "0.24em", textTransform: "uppercase" }}>
          <span>↳ Povprečen čas obhoda: <span style={{ color: "var(--gold-bright)" }}>78 sekund</span></span>
          <span>↳ Avtomatska sled: <span style={{ color: "var(--gold-bright)" }}>vsi koraki zabeleženi</span></span>
        </div>
      </div>
    </section>
  );
}
