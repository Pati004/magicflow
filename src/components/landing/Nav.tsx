"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`l-nav ${scrolled ? "scrolled" : ""}`}>
      <Link href="/" className="l-nav__logo">
        <span className="l-nav__logo-mark" />
        <span>Magicflow</span>
      </Link>
      <div className="l-nav__links">
        <a href="#flow">Potek</a>
        <a href="#models">Modeli</a>
        <a href="#features">Platforma</a>
        <a href="#thesis">Teze</a>
        <a href="#contact">Kontakt</a>
      </div>
      <Link href="/admin" className="btn" style={{ padding: "12px 22px", fontSize: 10 }}>
        <span>Vstopi</span>
      </Link>
    </nav>
  );
}
