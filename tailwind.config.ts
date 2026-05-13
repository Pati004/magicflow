import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ─── Magicflow Brand Palette ─── */
      colors: {
        /* Ozadje — globoke temne barve */
        background: {
          DEFAULT: "#0A0A0F",   // Skoraj črna z modrim podtonom
          subtle: "#0F0F18",    // Rahlo modrikasta temna
          surface: "#13131E",   // Kartica / panel ozadje
          elevated: "#1A1A2E",  // Dvignjene površine
        },

        /* Zlati akcentni toni — "magična" zlata */
        gold: {
          50:  "#FFF8E7",
          100: "#FFEDBA",
          200: "#FFD97A",
          300: "#FFC53D",
          400: "#FFB020",       // Primarni zlati akcent
          500: "#E8960A",       // Hover stanje
          600: "#C47A00",       // Aktiven
          700: "#9A5F00",
          800: "#6E4400",
          900: "#3D2600",
          DEFAULT: "#FFB020",
        },

        /* Primarni toni — mehka indigo/violet paleta */
        primary: {
          50:  "#EEF0FF",
          100: "#D8DCFF",
          200: "#B3BAFF",
          300: "#8A94FF",
          400: "#6671F5",       // Primarni
          500: "#4F5AE8",       // Hover
          600: "#3D47D0",
          700: "#2E37B0",
          800: "#1E2680",
          900: "#111650",
          DEFAULT: "#6671F5",
          foreground: "#FFFFFF",
        },

        /* Nevtralne barve za tekst in obrobe */
        ink: {
          DEFAULT: "#E8E8F0",   // Primarna besedilo
          muted:   "#9898B0",   // Sekundarno besedilo
          faint:   "#4A4A60",   // Placeholder / disabled
          ghost:   "#2A2A3E",   // Obrobe / dividers
        },

        /* Semantične barve */
        success: {
          DEFAULT: "#22C55E",
          subtle:  "#052E16",
          foreground: "#DCFCE7",
        },
        warning: {
          DEFAULT: "#F59E0B",
          subtle:  "#1C1400",
          foreground: "#FEF3C7",
        },
        destructive: {
          DEFAULT: "#EF4444",
          subtle:  "#1F0000",
          foreground: "#FEE2E2",
        },

        /* shadcn/ui kompatibilne spremenljivke */
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      /* ─── Pisave ─── */
      fontFamily: {
        sans:    ["var(--font-geist-sans)", ...fontFamily.sans],
        mono:    ["var(--font-geist-mono)", ...fontFamily.mono],
        display: ["var(--font-display)", ...fontFamily.sans],
      },

      /* ─── Radiji ─── */
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      /* ─── Sence ─── */
      boxShadow: {
        "gold-sm":  "0 0 12px 0 rgba(255, 176, 32, 0.15)",
        "gold-md":  "0 0 24px 0 rgba(255, 176, 32, 0.25)",
        "gold-lg":  "0 0 48px 0 rgba(255, 176, 32, 0.35)",
        "glow-primary": "0 0 32px 0 rgba(102, 113, 245, 0.3)",
        "card":     "0 4px 24px 0 rgba(0, 0, 0, 0.4)",
        "card-hover": "0 8px 40px 0 rgba(0, 0, 0, 0.6)",
      },

      /* ─── Animacije ─── */
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(255, 176, 32, 0.2)" },
          "50%":       { boxShadow: "0 0 32px rgba(255, 176, 32, 0.5)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "fade-in":      "fade-in 0.4s ease-out forwards",
        "shimmer":      "shimmer 2.5s linear infinite",
        "pulse-gold":   "pulse-gold 2s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },

      /* ─── Ozadje s prelivom ─── */
      backgroundImage: {
        "gold-gradient":    "linear-gradient(135deg, #FFB020 0%, #E8960A 100%)",
        "primary-gradient": "linear-gradient(135deg, #6671F5 0%, #4F5AE8 100%)",
        "dark-gradient":    "linear-gradient(180deg, #0A0A0F 0%, #13131E 100%)",
        "card-gradient":    "linear-gradient(145deg, #1A1A2E 0%, #13131E 100%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,176,32,0.08) 50%, transparent 100%)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};

export default config;