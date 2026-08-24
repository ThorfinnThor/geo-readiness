import type { Metadata } from "next";

import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung gemäß § 5 DDG.",
  alternates: { canonical: "/imprint" },
};

export default function ImprintPage() {
  return (
    <>
      <TopBar />
      <main lang="de" className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Rechtliches
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Impressum</h1>
        </header>

        <div className="content-prose">
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            Schayan Yousefian
            <br />
            Freienwalder Str. 34
            <br />
            13359 Berlin
            <br />
            Deutschland
          </p>

          <h2>Kontakt</h2>
          <p>E-Mail: info@findyouraiscore.com</p>

          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            Schayan Yousefian
            <br />
            Freienwalder Str. 34
            <br />
            13359 Berlin
          </p>

          <h2>EU-Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr/">https://ec.europa.eu/consumers/odr/</a>.
            Unsere E-Mail-Adresse findest du oben. Wir sind nicht bereit oder verpflichtet, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
