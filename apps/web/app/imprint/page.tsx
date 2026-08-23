import type { Metadata } from "next";

import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung gemäß § 5 DDG.",
  alternates: { canonical: "/imprint" },
};

// SCAFFOLD. Replace every [PLATZHALTER] with your real details and have this
// reviewed by a lawyer before launch. This is not legal advice.
export default function ImprintPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12 sm:py-16">
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--warn) 40%, var(--border))",
            background: "color-mix(in srgb, var(--warn) 8%, transparent)",
          }}
        >
          <strong>Entwurf / Platzhalter.</strong> Alle Angaben in eckigen Klammern müssen mit deinen
          echten Daten ersetzt und vor dem Launch rechtlich geprüft werden. Dies ist keine
          Rechtsberatung.
        </div>

        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Rechtliches
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Impressum</h1>
        </header>

        <div className="content-prose">
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            [FIRMENNAME / BETREIBER]
            <br />
            [RECHTSFORM, z. B. Einzelunternehmen / GmbH]
            <br />
            [STRASSE UND HAUSNUMMER]
            <br />
            [PLZ UND ORT]
            <br />
            [LAND]
          </p>

          <h2>Vertreten durch</h2>
          <p>[VERTRETUNGSBERECHTIGTE PERSON, z. B. Geschäftsführer:in]</p>

          <h2>Kontakt</h2>
          <p>
            Telefon: [TELEFONNUMMER]
            <br />
            E-Mail: info@findyouraiscore.com
          </p>

          <h2>Registereintrag</h2>
          <p>
            [Falls zutreffend:] Eintragung im Handelsregister.
            <br />
            Registergericht: [REGISTERGERICHT]
            <br />
            Registernummer: [REGISTERNUMMER]
          </p>

          <h2>Umsatzsteuer-ID</h2>
          <p>
            [Falls zutreffend:] Umsatzsteuer-Identifikationsnummer gemäß § 27 a
            Umsatzsteuergesetz: [USt-IdNr.]
          </p>

          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            [NAME]
            <br />
            [ANSCHRIFT]
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
