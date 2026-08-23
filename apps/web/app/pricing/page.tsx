import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = { title: "Pricing" };

const PRICE_EUR = Number(process.env.GEO_FULL_AUDIT_PRICE_EUR ?? "249");

function Check() {
  return (
    <span aria-hidden className="mt-0.5 shrink-0 text-[color:var(--excellent)]">
      ✓
    </span>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm text-fg-muted">
      <Check />
      <span>{children}</span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Pricing
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See the score free. Unlock the fixes when you’re ready.
          </h1>
          <p className="mx-auto max-w-xl text-sm text-fg-muted">
            Every scan runs the full deterministic engine, with no AI-provider calls and no
            guesswork. The free preview shows your readiness. The full audit shows exactly
            what to change.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Free preview */}
          <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface/50 p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Free preview</h2>
              <p className="font-mono text-3xl font-semibold tabular-nums">€0</p>
              <p className="text-sm text-fg-subtle">per scan · no account needed</p>
            </div>
            <ul className="flex flex-col gap-2.5">
              <Feature>Overall readiness score (0 to 100)</Feature>
              <Feature>All seven component scores</Feature>
              <Feature>Which categories need improvement</Feature>
              <Feature>Confidence rating &amp; pages analyzed</Feature>
            </ul>
            <Link
              href="/"
              className="mt-auto rounded-lg border border-border-strong px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Run a free scan
            </Link>
          </section>

          {/* Full audit */}
          <section
            className="flex flex-col gap-5 rounded-2xl border p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 40%, var(--border))",
              background: "color-mix(in srgb, var(--accent) 6%, var(--surface))",
            }}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Full audit</h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
                  style={{
                    color: "var(--accent)",
                    backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
                  }}
                >
                  complete
                </span>
              </div>
              <p className="font-mono text-3xl font-semibold tabular-nums">
                €{PRICE_EUR.toLocaleString("en-US")}
              </p>
              <p className="text-sm text-fg-subtle">one-time · per scan</p>
            </div>
            <ul className="flex flex-col gap-2.5">
              <Feature>Everything in the free preview</Feature>
              <Feature>Every prioritized fix, ranked by impact</Feature>
              <Feature>The evidence behind each issue, and how to verify the fix</Feature>
              <Feature>Retrieval, citation &amp; answer-extraction stage scores</Feature>
              <Feature>Full prompt-cluster coverage map with missing requirements</Feature>
              <Feature>What’s limiting your weakest areas</Feature>
              <Feature>Download as PDF or Markdown</Feature>
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              <span
                className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-[color:var(--accent-fg)] opacity-70"
                style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
              >
                Card payment coming soon
              </span>
              <p className="text-center text-xs text-fg-subtle">
                Run a scan, then unlock its full audit from the results page, with a
                promo code today or card payment shortly.
              </p>
            </div>
          </section>
        </div>

        <p className="text-center text-xs text-fg-subtle">
          This audit measures deterministic website readiness for retrieval, citation and
          answer extraction. It does not measure or guarantee rankings, citations, traffic
          or visibility in ChatGPT, Gemini, Perplexity or other AI platforms.
        </p>
      </main>
    </>
  );
}
