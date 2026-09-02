import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TopBar } from "@/components/TopBar";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import {
  breadcrumbJsonLd,
  FULL_AUDIT_PRICE_EUR as PRICE_EUR,
  FULL_AUDIT_PRODUCT_NAME as PRODUCT,
  FULL_AUDIT_REGULAR_PRICE_EUR as REGULAR_EUR,
} from "@/lib/seo/site";

const PRICING_DESC =
  "See your AI search readiness score for free, then unlock the Premium AI Readiness Audit: the " +
  "full score across seven dimensions, findings with evidence, prioritized fixes and a " +
  "downloadable report.";

export const metadata: Metadata = {
  title: "Pricing",
  description: PRICING_DESC,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing",
    description: PRICING_DESC,
    url: "/pricing",
    type: "website",
    images: [ogImageUrl("Pricing")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing",
    description: PRICING_DESC,
    images: [ogImageUrl("Pricing")],
  },
};

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
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ])}
      />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Pricing
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See the score free. Unlock the fixes when you’re ready.
          </h1>
          <p className="mx-auto max-w-xl text-sm text-fg-muted">
            The free preview shows your readiness score. The Premium audit shows exactly what to
            change, with the evidence and a paste-ready fix for each issue.
          </p>
          <Link
            href="/report/demo"
            className="mx-auto inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            See a full sample report →
          </Link>
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
              className="mt-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border-strong px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:bg-surface-2"
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{PRODUCT}</h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
                  style={{
                    color: "var(--accent)",
                    backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
                  }}
                >
                  premium
                </span>
              </div>
              <p className="text-sm text-fg-muted">
                See how ready your website is for AI search, and exactly what to fix.
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="font-mono text-3xl font-semibold tabular-nums">
                  €{PRICE_EUR.toLocaleString("en-US")}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
                  style={{
                    color: "var(--accent)",
                    backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
                  }}
                >
                  Launch price
                </span>
              </div>
              <p className="text-sm text-fg-subtle">
                Regular price €{REGULAR_EUR.toLocaleString("en-US")} after launch · one-time payment
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              <Feature>Full AI Readiness Score across all seven dimensions</Feature>
              <Feature>Concrete findings, each with the evidence behind it</Feature>
              <Feature>Prioritized fixes, ranked by impact</Feature>
              <Feature>Prompt &amp; topic coverage map with missing requirements</Feature>
              <Feature>Retrieval, citation &amp; answer readiness</Feature>
              <Feature>A self-test kit to check if ChatGPT &amp; Claude actually cite you</Feature>
              <Feature>Structured data &amp; technical AI accessibility</Feature>
              <Feature>Downloadable report (PDF or Markdown)</Feature>
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
              >
                Run a free scan
              </Link>
              <p className="text-center text-xs text-fg-subtle">
                Run a scan, then unlock the Premium audit from your results page by card or promo
                code.
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
      <Footer />
    </>
  );
}
