import { Nav }          from "@/components/landing/Nav";
import { Hero }         from "@/components/landing/Hero";
import { HowItWorks }  from "@/components/landing/HowItWorks";
import { Models }       from "@/components/landing/Models";
import { Features, Thesis, CTASection, Footer } from "@/components/landing/Sections";
import { CustomCursor } from "@/components/landing/CustomCursor";
import { RevealInit }   from "@/components/landing/RevealInit";

export default function LandingPage() {
  return (
    <>
      <RevealInit />
      <CustomCursor />
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Models />
        <Features />
        <Thesis />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
