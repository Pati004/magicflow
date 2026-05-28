// Features + Thesis + CTA + Footer

function FIcon({ name }: { name: string }) {
  const c = "var(--gold)";
  if (name === "cfg") return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 5h10M2 11h18M2 17h6" stroke={c} strokeWidth="1"/><circle cx="16" cy="5" r="2" stroke={c} strokeWidth="1"/><circle cx="12" cy="17" r="2" stroke={c} strokeWidth="1"/></svg>;
  if (name === "eye") return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 11s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" stroke={c} strokeWidth="1"/><circle cx="11" cy="11" r="2" stroke={c} strokeWidth="1"/></svg>;
  if (name === "wifi") return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 8c4-4 12-4 16 0M6 12c2.5-2.5 7.5-2.5 10 0" stroke={c} strokeWidth="1"/><circle cx="11" cy="16" r="1.5" fill={c}/></svg>;
  if (name === "panel") return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="3" width="18" height="16" stroke={c} strokeWidth="1"/><path d="M2 8h18M7 8v11" stroke={c} strokeWidth="1"/></svg>;
  return null;
}

const features = [
  { icon: "cfg",   title: "Konfiguracijski sistem", body: "Vsi parametri — modeli, prompti, izpisi, ceniki, blagovne znamke — živijo v deklarativnem sistemu. Dogodek pripravljen v 15 minutah.", meta: ["TypeScript", "Zod validacija", "Deep merge"] },
  { icon: "eye",   title: "Vision AI",              body: "GPT-4o Vision v sekundi analizira pozo, razpoloženje in kontekst. Predlaga 5 prilagojenih stilov, preden gre zahteva k I2V modelu.",  meta: ["GPT-4o", "Analiza poze", "< 3s"] },
  { icon: "wifi",  title: "PWA & offline način",    body: "Kiosk aplikacija deluje brez interneta. Fotografije se shranijo v IndexedDB in sinhronizirajo, ko se povezava vrne.",                   meta: ["Service Worker", "IndexedDB", "Sync API"] },
  { icon: "panel", title: "Operator panel",         body: "Pregledna nadzorna plošča za dan dogodka: žive statistike, stanje tiskalnika, GDPR brisanje sej in test mode pred začetkom.",           meta: ["Live polling", "RBAC", "GDPR"] },
];

export function Features() {
  return (
    <section id="features" className="l-section">
      <div className="l-container">
        <div className="sec-head reveal">
          <div>
            <div className="sec-head__num">/ 03 · PLATFORMA</div>
            <h2 className="display sec-head__title" style={{ marginTop: 24 }}>
              Zgrajena za <em>zanesljivost</em><br />v dogodkovnem polju.
            </h2>
          </div>
          <p className="sec-head__lede">
            Demonstracija na odru je en standard. Sedem dogodkov v tednu,
            brez tehnične ekipe ob terenu, je drug standard.
          </p>
        </div>
        <div className="features">
          {features.map((f, i) => (
            <div key={i} className="feature reveal" data-stagger={i + 1}>
              <div className="feature__icon"><FIcon name={f.icon} /></div>
              <div className="feature__title">{f.title}</div>
              <p className="feature__body">{f.body}</p>
              <div className="feature__meta">{f.meta.map((m, j) => <span key={j}>{m}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const theses = [
  { id: "T1", statement: "I2V tehnologija je dovolj zrela za uporabo na živih dogodkih.", methodK: "Metoda dokazovanja", methodV: "Empirična primerjava 4 ponudnikov na 240 portretih iz pilotnih dogodkov; metrika zadovoljstva, latence in stopnje napak." },
  { id: "T2", statement: "Vrednost spomina raste, ko ga gost takoj odnese domov.", methodK: "Metoda dokazovanja", methodV: "A/B test takojšnjega prevzema (QR + tisk) proti naknadnemu pošiljanju po e-pošti. Pričakovan dvig NPS ≥ 18 točk." },
  { id: "T3", statement: "Operatorska izkušnja je kritična točka ROI, ne sam AI model.", methodK: "Metoda dokazovanja", methodV: "Časovna analiza obhoda na 12 dogodkih: < 90s = donosno, > 120s = izguba. Optimizacija PWA in kontrolnika." },
  { id: "T4", statement: "Konfiguracijska arhitektura zniža stroške replikacije pod 10%.", methodK: "Metoda dokazovanja", methodV: "Primerjava stroškov priprave novega dogodka pred in po deklarativnem sistemu. Cilj: priprava < 4 inženirske ure." },
];

export function Thesis() {
  return (
    <section id="thesis" className="l-section" style={{ background: "linear-gradient(180deg, var(--bg-2), var(--bg))" }}>
      <div className="l-container">
        <div className="sec-head reveal">
          <div>
            <div className="sec-head__num">/ 04 · TEZE</div>
            <h2 className="display sec-head__title" style={{ marginTop: 24 }}>
              Štiri hipoteze,<br />preverljive z <em>metriko</em>.
            </h2>
          </div>
          <p className="sec-head__lede">
            Magicflow ni eksperiment. Vsaka teza ima vnaprej določeno metodo,
            metriko in mejnik uspeha.
          </p>
        </div>
        <div className="theses">
          {theses.map((t, i) => (
            <article key={t.id} className="thesis reveal" data-stagger={i + 1}>
              <span className="card__corner tl" /><span className="card__corner br" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="thesis__id">{t.id}</span>
                <span style={{ fontSize: 10, letterSpacing: "0.28em", color: "var(--muted)" }}>HIPOTEZA</span>
              </div>
              <h3 className="thesis__statement">{t.statement}</h3>
              <dl className="thesis__method">
                <dt>{t.methodK}</dt>
                <dd>{t.methodV}</dd>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section id="contact" className="cta-section">
      <div className="l-container">
        <div className="reveal" style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <span className="eyebrow">/ 05 · Kontakt</span>
        </div>
        <h2 className="display cta__title reveal" data-stagger="1">
          Pripravimo <em>vaš</em> dogodek.
        </h2>
        <p className="cta__lede reveal" data-stagger="2">
          Predstavitev v živo, pilotna konfiguracija in cenovni model.
          Odgovorimo v 24 urah, ponavadi prej.
        </p>
        <div className="cta__buttons reveal" data-stagger="3">
          <a href="mailto:hello@magicflow.studio" className="btn btn--solid">
            <span>Rezerviraj demo</span>
            <span style={{ fontSize: 10 }}>↗</span>
          </a>
          <a href="/admin" className="btn btn--ghost"><span>Admin panel</span></a>
        </div>
        <div className="reveal" data-stagger="4" style={{ marginTop: 100, display: "flex", justifyContent: "center", gap: 64, flexWrap: "wrap", fontSize: 11, color: "var(--muted)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          <div><div style={{ color: "var(--text-2)", marginBottom: 6 }}>Studio</div><div style={{ color: "var(--gold)" }}>Ljubljana · SI</div></div>
          <div><div style={{ color: "var(--text-2)", marginBottom: 6 }}>E-pošta</div><div style={{ color: "var(--gold)" }}>hello@magicflow.studio</div></div>
          <div><div style={{ color: "var(--text-2)", marginBottom: 6 }}>Univerza</div><div style={{ color: "var(--gold)" }}>UM · Maribor</div></div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="l-footer">
      <div className="l-container">
        <div className="foot__row">
          <div className="l-nav__logo">
            <span className="l-nav__logo-mark" />
            <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22 }}>Magicflow</span>
          </div>
          <div className="foot__c">© 2026 Magicflow · Diplomska naloga · UM</div>
          <div style={{ display: "flex", gap: 24 }}>
            <a className="foot__c" href="#">Zasebnost</a>
            <a className="foot__c" href="#">Pogoji</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
