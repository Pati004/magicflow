import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Magicflow",
    template: "%s | Magicflow",
  },
  description: "AI-powered photo & video experience platform",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#FFB020",
          colorBackground: "#0A0A0F",
          colorInputBackground: "#13131E",
          colorInputText: "#E8E8F0",
          colorText: "#E8E8F0",
          colorTextSecondary: "#9898B0",
          borderRadius: "0.625rem",
        },
        elements: {
          card: "bg-background-surface border border-ink-ghost shadow-card",
          formButtonPrimary:
            "bg-gold hover:bg-gold-500 text-black font-medium transition-colors",
          footerActionLink: "text-gold hover:text-gold-300",
        },
      }}
    >
      <html
        lang="sl"
        className={`${GeistSans.variable} ${GeistMono.variable} dark`}
        suppressHydrationWarning
      >
        <body className="min-h-screen bg-background text-ink antialiased">
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#13131E",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#E8E8F0",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
