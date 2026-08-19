import Link from "next/link";

import { ScanForm } from "@/components/scan/ScanForm";
import { READINESS_DISCLAIMER } from "@/lib/readiness";

const DIMENSIONS = [
  "Entity Clarity",
  "Offer Clarity",
  "Prompt Coverage",
  "Sourceability",
  "Structured Data",
  "Evidence & Trust",
  "Technical Access",
];

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-2))" }}
          />
          <span className="font-mono text-sm font-medium tracking-tight">geo/readiness</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-fg-muted">
          <Link href="/methodology" className="hover:text-fg">
            Methodology
          </Link>
          <Link href="/pricing" className="hover:text-fg">
            Pricing
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1 font-mono text-xs text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-excellent" />
          deterministic · evidence-based · zero AI-provider calls
        </span>

        <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          How ready is your website for <span className="brand-gradient">AI Search</span>?
        </h1>

        <p className="max-w-xl text-lg text-fg-muted">
          A deterministic, evidence-based audit of how clearly AI search and answer
          systems can understand your site — and use it as a source.
        </p>

        <div className="mt-2 w-full max-w-xl">
          <ScanForm />
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-fg-subtle">
            <span>Free · no signup</span>
            <span className="text-border-strong">•</span>
            <Link href="/scan/demo" className="font-mono underline underline-offset-4 hover:text-fg-muted">
              see an example report →
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {DIMENSIONS.map((d) => (
            <span
              key={d}
              className="rounded-md border border-border bg-surface/40 px-2.5 py-1 font-mono text-xs text-fg-subtle"
            >
              {d}
            </span>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-fg-subtle">
        {READINESS_DISCLAIMER}
      </footer>
    </div>
  );
}
