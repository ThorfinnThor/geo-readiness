import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import {
  FULL_AUDIT_PRICE_EUR as PRICE_EUR,
  FULL_AUDIT_PRODUCT_NAME as PRODUCT,
  FULL_AUDIT_REGULAR_PRICE_EUR as REGULAR_EUR,
} from "@/lib/seo/site";

const PRODUCT_DESC =
  "The AI search readiness audit reads your website the way an AI answer engine does and scores " +
  "seven readiness signals, then gives you the evidence and a paste-ready fix for every issue.";

export const metadata: Metadata = {
  title: "The AI search readiness audit",
  description: PRODUCT_DESC,
  alternates: { canonical: "/product" },
  openGraph: {
    title: "The AI search readiness audit",
    description: PRODUCT_DESC,
    url: "/product",
    type: "website",
    images: [ogImageUrl("Product")],
  },
  twitter: {
    card: "summary_large_image",
    title: "The AI search readiness audit",
    description: PRODUCT_DESC,
    images: [ogImageUrl("Product")],
  },
};

// What the audit checks — the seven components, stated concretely so the offering
// is explicit in visible content, not only in schema.
const CHECKS: [string, string][] = [
  ["Entity Clarity", "Whether a machine can identify who your business is, what it does and where."],
  ["Offer Clarity", "Whether your products and services are stated plainly and in detail."],
  ["Prompt Coverage", "Whether your pages answer the questions your customers actually ask AI."],
  ["Sourceability", "Whether your content is specific, first-party and extractable as a source."],
  ["Structured Data", "Whether machine-readable schema states your facts accurately."],
  ["Evidence & Trust", "Whether identity, contact, policies and references make you accountable."],
  ["Technical Accessibility", "Whether a crawler can actually fetch and read your pages."],
];

const PREMIUM: string[] = [
  "The full score across all seven components and three readiness stages",
  "Every finding with the exact evidence the audit observed on your pages",
  "A prioritized fix for each issue, plus a paste-ready prompt for your AI coding assistant",
  "A downloadable report you can share with your team",
  "A before-and-after comparison when you rescan after making changes",
];

const AUDIENCE: string[] = [
  "Business owners who want to be the answer AI search quotes, not the competitor",
  "Marketers and SEO teams adding GEO to what they already do",
  "Agencies auditing client sites for AI search readiness",
];

function Check() {
  return (
    <span aria-hidden className="mt-0.5 shrink-0 text-[color:var(--excellent)]">
      ✓
    </span>
  );
}

export default function ProductPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-4xl flex-col gap-14 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Product
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            The AI search readiness audit
          </h1>
          <p className="max-w-2xl text-lg text-fg-muted">
            Find Your AI Score is a deterministic audit that reads your website the way an AI answer
            engine does, scores how ready it is to be found, trusted and quoted, and shows you
            exactly what to fix. It runs on fixed rules, never sends your pages to an AI model to be
            graded, and gives the same site the same score every time.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] transition-opacity hover:opacity-90"
            >
              Run a free scan
            </Link>
            <Link
              href="/report/demo"
              className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              See a full sample report
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-6 border-t border-border pt-12">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">What the audit checks</h2>
            <p className="max-w-2xl text-fg-muted">
              Every scan crawls up to 36 of your pages, extracts the text, structure and metadata,
              and scores seven readiness signals. Each one traces back to something observed on your
              pages.
            </p>
          </div>
          <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {CHECKS.map(([name, desc], i) => (
              <div key={name} className="flex gap-4">
                <span className="font-mono text-sm text-fg-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{name}</span>
                  <span className="text-sm text-fg-muted">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-border pt-12 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">What you get</h2>
            <p className="text-sm text-fg-muted">
              The free preview shows your score. The {PRODUCT} (€{PRICE_EUR} at launch, €{REGULAR_EUR}{" "}
              after) shows exactly what to change and how.
            </p>
            <ul className="flex flex-col gap-2.5">
              {PREMIUM.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-fg-muted">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className="mt-1 text-sm font-medium text-[color:var(--accent)] hover:underline"
            >
              See pricing →
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Who it is for</h2>
            <ul className="flex flex-col gap-2.5">
              {AUDIENCE.map((a) => (
                <li key={a} className="flex gap-2.5 text-sm text-fg-muted">
                  <Check />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-6 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="flex flex-col gap-4">
            {[
              "Enter your domain. No account, no credit card for the free score.",
              "We crawl up to 36 pages, build the questions AI search would ask about your business, and check page by page whether you answer them.",
              "You get a 0 to 100 readiness score in minutes, then unlock the findings and fixes when you are ready.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-mono text-sm text-fg-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-fg-muted">{step}</span>
              </li>
            ))}
          </ol>
          <p className="max-w-2xl text-sm text-fg-subtle">
            The score measures how ready your site is to be read and quoted. It does not measure or
            guarantee rankings, citations or traffic, and implementing the fixes does not guarantee
            any AI system will mention you. No tool controls what an AI says.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
