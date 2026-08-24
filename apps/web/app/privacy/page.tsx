import type { Metadata } from "next";

import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we process personal data (GDPR).",
  alternates: { canonical: "/privacy" },
};

// SCAFFOLD. Reflects the app's actual data flows (Vercel, Supabase, GitHub
// Actions, scan storage) but every [PLACEHOLDER] and processor detail must be
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
          <strong>Draft / placeholder.</strong> This notice reflects the app&apos;s actual data
          flows, but the processor details still need to be completed with verified information and
          legally reviewed before launch. This is not legal advice.
        </div>

        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Legal
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        </header>

        <div className="content-prose">
          <h2>1. Controller</h2>
          <p>
            The controller responsible for data processing on this website is:
            <br />
            Schayan Yousefian, Freienwalder Str. 34, 13359 Berlin, Germany. Email:
            info@findyouraiscore.com. Further details are in the{" "}
            <a href="/imprint">legal notice</a>.
          </p>

          <h2>2. When you scan a website</h2>
          <p>
            The core function of the service is to analyze a website you enter. In doing so we
            process:
          </p>
          <ul>
            <li>the domain you enter,</li>
            <li>publicly accessible content of that website, which we fetch and analyze automatically,</li>
            <li>the resulting assessment (score, components, recommendations).</li>
          </ul>
          <p>
            This data is stored in our database so we can show you the result and make it available
            again later. If you scan a website that is not your own, please make sure you are
            entitled to do so. The legal basis is the performance of the service you requested
            (Art. 6(1)(b) and (f) GDPR).
          </p>

          <h2>3. Server log files and hosting</h2>
          <p>
            The website is hosted by [HOSTING PROVIDER, e.g. Vercel Inc., USA]. When the site is
            accessed, access data (including IP address, time, page requested, browser type) is
            processed automatically, as is technically necessary to operate a website. The legal
            basis is our legitimate interest in secure, stable operation (Art. 6(1)(f) GDPR).
          </p>

          <h2>4. Services used (processors)</h2>
          <ul>
            <li>
              <strong>[Hosting, e.g. Vercel Inc., USA]</strong> — serving the website.
            </li>
            <li>
              <strong>[Database, e.g. Supabase, region to be specified]</strong> — storing scans
              and results.
            </li>
            <li>
              <strong>[Scan processing, e.g. GitHub Actions, GitHub Inc., USA]</strong> — running
              the analysis.
            </li>
            <li>
              [If payments are active:] <strong>[Payment provider, e.g. Stripe]</strong> —
              processing payments.
            </li>
          </ul>
          <p>
            A data processing agreement must be concluded with each of these providers. Where a
            provider is located outside the EU/EEA, transfers are made on the basis of appropriate
            safeguards (e.g. EU standard contractual clauses). [TO BE VERIFIED AND COMPLETED.]
          </p>

          <h2>5. Cookies and local storage</h2>
          <p>
            We do not use tracking cookies. For the display (light/dark) only a technical value is
            stored locally in your browser (localStorage); this value is not transmitted to us.
          </p>

          <h2>6. Accounts (if used)</h2>
          <p>
            [If you offer accounts:] When you register, we process your email address and a secured
            (hashed) password in order to give you access to your assessments. The legal basis is
            the performance of a contract (Art. 6(1)(b) GDPR).
          </p>

          <h2>7. Retention period</h2>
          <p>
            We store scan data [DEFINE PERIOD, e.g. up to 90 days] and delete it afterwards, unless
            statutory retention obligations require otherwise.
          </p>

          <h2>8. Your rights</h2>
          <p>
            You have the right to access, rectification, erasure, restriction of processing, data
            portability and objection. You may also lodge a complaint with a supervisory authority.
            To exercise these rights, contact info@findyouraiscore.com.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
