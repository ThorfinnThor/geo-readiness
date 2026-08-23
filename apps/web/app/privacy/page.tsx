import type { Metadata } from "next";

import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Wie wir personenbezogene Daten verarbeiten (DSGVO).",
  alternates: { canonical: "/privacy" },
};

// SCAFFOLD. Reflects the app's actual data flows (Vercel, Supabase, GitHub
// Actions, scan storage) but every [PLATZHALTER] and processor detail must be
// completed and legally reviewed. This is not legal advice.
export default function PrivacyPage() {
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
          <strong>Entwurf / Platzhalter.</strong> Diese Erklärung bildet die tatsächlichen
          Datenflüsse der App ab, muss aber mit deinen Firmendaten und geprüften Auftragsverarbeiter-
          Angaben ergänzt und vor dem Launch rechtlich geprüft werden. Dies ist keine Rechtsberatung.
        </div>

        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Rechtliches
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Datenschutzerklärung</h1>
        </header>

        <div className="content-prose">
          <h2>1. Verantwortlicher</h2>
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            <br />
            [FIRMENNAME / BETREIBER], [ANSCHRIFT], E-Mail: info@findyouraiscore.com. Weitere Angaben findest
            du im <a href="/imprint">Impressum</a>.
          </p>

          <h2>2. Wenn du eine Website scannst</h2>
          <p>
            Kernfunktion des Dienstes ist die Analyse einer von dir eingegebenen Website. Dabei
            verarbeiten wir:
          </p>
          <ul>
            <li>die von dir eingegebene Domain,</li>
            <li>
              öffentlich abrufbare Inhalte dieser Website, die wir automatisiert abrufen und
              analysieren,
            </li>
            <li>das daraus erzeugte Auswertungsergebnis (Score, Komponenten, Empfehlungen).</li>
          </ul>
          <p>
            Diese Daten werden in unserer Datenbank gespeichert, um dir das Ergebnis anzuzeigen und
            es erneut aufrufbar zu machen. Wenn du eine fremde Website scannst, prüfe bitte, dass du
            dazu berechtigt bist. Rechtsgrundlage ist die Durchführung des von dir angeforderten
            Dienstes (Art. 6 Abs. 1 lit. b bzw. f DSGVO).
          </p>

          <h2>3. Server-Logfiles und Hosting</h2>
          <p>
            Die Website wird bei [HOSTING-ANBIETER, z. B. Vercel Inc., USA] gehostet. Beim Aufruf
            werden automatisch Zugriffsdaten (u. a. IP-Adresse, Zeitpunkt, aufgerufene Seite,
            Browsertyp) verarbeitet, wie es beim Betrieb einer Website technisch erforderlich ist.
            Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren, stabilen Betrieb
            (Art. 6 Abs. 1 lit. f DSGVO).
          </p>

          <h2>4. Eingesetzte Dienste (Auftragsverarbeiter)</h2>
          <ul>
            <li>
              <strong>[Hosting, z. B. Vercel Inc., USA]</strong> — Auslieferung der Website.
            </li>
            <li>
              <strong>[Datenbank, z. B. Supabase, Region ausfüllen]</strong> — Speicherung der
              Scans und Ergebnisse.
            </li>
            <li>
              <strong>[Scan-Verarbeitung, z. B. GitHub Actions, GitHub Inc., USA]</strong> —
              Ausführung der Analyse.
            </li>
            <li>
              [Falls Zahlungen aktiv:] <strong>[Zahlungsdienstleister, z. B. Stripe]</strong> —
              Abwicklung von Zahlungen.
            </li>
          </ul>
          <p>
            Mit diesen Anbietern ist jeweils ein Auftragsverarbeitungsvertrag zu schließen. Soweit
            Anbieter außerhalb der EU/des EWR sitzen, erfolgt die Übermittlung auf Grundlage
            geeigneter Garantien (z. B. EU-Standardvertragsklauseln). [ANGABEN PRÜFEN UND ERGÄNZEN.]
          </p>

          <h2>5. Cookies und lokale Speicherung</h2>
          <p>
            Wir setzen keine Tracking-Cookies ein. Für die Anzeige (hell/dunkel) wird ausschließlich
            ein technischer Wert lokal in deinem Browser (localStorage) gespeichert; dieser Wert
            wird nicht an uns übertragen.
          </p>

          <h2>6. Konten (falls genutzt)</h2>
          <p>
            [Falls du Konten anbietest:] Bei einer Registrierung verarbeiten wir E-Mail-Adresse und
            ein gesichertes (gehashtes) Passwort, um dir Zugang zu deinen Auswertungen zu geben.
            Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
          </p>

          <h2>7. Speicherdauer</h2>
          <p>
            Wir speichern Scan-Daten [ZEITRAUM FESTLEGEN, z. B. bis zu 90 Tage] und löschen sie
            anschließend, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>

          <h2>8. Deine Rechte</h2>
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
            Datenübertragbarkeit sowie Widerspruch. Außerdem kannst du dich bei einer
            Aufsichtsbehörde beschweren. Wende dich dafür an info@findyouraiscore.com.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
