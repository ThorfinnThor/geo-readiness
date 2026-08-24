import type { Metadata } from "next";

import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Legal Notice",
  description: "Provider identification pursuant to § 5 DDG.",
  alternates: { canonical: "/imprint" },
};

export default function ImprintPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Legal
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Legal Notice</h1>
        </header>

        <div className="content-prose">
          <h2>Information pursuant to § 5 DDG</h2>
          <p>
            Schayan Yousefian
            <br />
            Freienwalder Str. 34
            <br />
            13359 Berlin
            <br />
            Germany
          </p>

          <h2>Contact</h2>
          <p>Email: info@findyouraiscore.com</p>

          <h2>Responsible for content pursuant to § 18 (2) MStV</h2>
          <p>
            Schayan Yousefian
            <br />
            Freienwalder Str. 34
            <br />
            13359 Berlin
          </p>

          <h2>EU dispute resolution</h2>
          <p>
            The European Commission provides a platform for online dispute resolution (ODR):{" "}
            <a href="https://ec.europa.eu/consumers/odr/">https://ec.europa.eu/consumers/odr/</a>.
            Our email address is given above. We are neither willing nor obliged to take part in
            dispute resolution proceedings before a consumer arbitration board.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
