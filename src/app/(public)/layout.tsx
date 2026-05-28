import type { Metadata } from "next";
import "./landing.css";

export const metadata: Metadata = {
  title: "Magicflow — Vsaka fotografija postane živ spomin",
  description: "Magicflow je dogodkovna platforma, ki s pomočjo I2V modelov pretvori portrete v kratke filmske spomine.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="landing-body">{children}</div>;
}
