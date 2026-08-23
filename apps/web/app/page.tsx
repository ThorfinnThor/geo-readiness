import Link from "next/link";

import { ScanForm } from "@/components/scan/ScanForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RadialScore } from "@/components/report/shared";
import { READINESS_DISCLAIMER } from "@/lib/readiness";

const SIGNALS: [string, string][] = [
  ["Entity Clarity", "Can a machine identify who you are, unambiguously?"],
  ["Offer Clarity", "Are your services and products explicit and structured?"],
  ["Prompt Coverage", "Do your pages answer the questions AI search asks?"],
  ["Sourceability", "Is your content specific, first-party and extractable?"],
  ["Structured Data", "Do machines get clean schema, not guesses?"],
  ["Evidence & Trust", "Is there real proof behind your claims?"],
  ["Technical Access", "Can crawlers actually read the page at all?"],
];

const QUESTIONS: [string, number][] = [
  ["Which solar installers serve Austin, TX?", 95],
  ["Which battery storage system is right for a small business?", 88],
  ["How much does a home solar system cost?", 42],
];

function Row({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="w-24 shrink-0 text-fg-subtle">{k}</span>
      <span className="flex-1 truncate text-fg">{v}</span>
      {ok && <span className="text-excellent">✓</span>}
    </div>
  );
}

function Inspector() {
  return (
    <div className="panel overflow-hidden shadow-2xl" aria-hidden>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-weak/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-excellent/70" />
        <span className="ml-2 font-mono text-xs text-fg-subtle">
          readiness://brightsolar.example
        </span>
      </div>

      <div
        className="relative overflow-hidden p-5 font-mono"
        style={{ "--scan-h": "320px" } as React.CSSProperties}
      >
        <div
          className="scanline pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 14%, transparent), transparent)",
          }}
        />

        <div className="mb-4 flex items-center gap-2 text-xs text-fg-subtle">
          <span className="text-accent">▸</span> reading 10 pages
          <span className="caret text-accent">▋</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <Row k="entity" v="BrightSolar Inc." ok />
          <Row k="offers" v="solar panels · battery storage" ok />
          <Row k="location" v="Austin, TX" ok />
        </div>

        <div className="my-4 border-t border-dashed border-border" />

        <div className="flex flex-col gap-2">
          <span className="text-xs text-fg-subtle">ai search asks</span>
          <p className="text-sm text-fg">“Which solar installers serve Austin, TX?”</p>
          <div className="flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-excellent" style={{ width: "95%" }} />
            </span>
            <span className="text-xs text-excellent">95 covered</span>
          </div>
        </div>

        <div className="my-4 border-t border-dashed border-border" />

        <div className="flex items-center gap-4">
          <RadialScore score={84} level="Strong" size={92} />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-fg-subtle">readiness</span>
            <span className="text-sm font-semibold text-excellent">Strong</span>
            <span className="text-xs text-fg-subtle">confidence: moderate</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
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
          <Link href="/scan/demo" className="hidden font-mono text-xs text-fg-subtle hover:text-fg sm:block">
            example
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero — asymmetric: the pitch on the left, the product's own output on the right. */}
      <main className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <section className="flex flex-col gap-6">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-fg-subtle">
            AI search readiness audit
          </span>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[3.4rem]">
            Your website,
            <br />
            read by machines.
          </h1>
          <p className="max-w-xl text-lg text-fg-muted">
            AI answer engines don’t rank pages, they extract facts. We read your site the way
            they do, generate the questions they ask about your business, and score whether your
            pages actually answer them.
          </p>

          <div className="flex flex-col gap-3">
            <ScanForm />
            <p className="font-mono text-xs text-fg-subtle">
              ≤ 50 pages &nbsp;·&nbsp; 7 signals &nbsp;·&nbsp; deterministic &nbsp;·&nbsp; 0
              AI-provider calls
            </p>
          </div>
        </section>

        <section className="lg:pl-4">
          <Inspector />
        </section>
      </main>

      {/* The unique bit: the actual questions the engine generates. */}
      <section className="flex flex-col gap-6 border-t border-border py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            We generate the questions AI search asks.
          </h2>
          <p className="max-w-2xl text-fg-muted">
            Deterministically, from your own business profile, with no external AI. Then we check,
            page by page, whether you answer them. Coverage gaps are exactly where AI search
            can’t use you as a source.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40">
          {QUESTIONS.map(([q, cov]) => {
            const covered = cov >= 60;
            return (
              <li key={q} className="flex items-center gap-4 px-5 py-4">
                <span className="font-mono text-fg-subtle">?</span>
                <span className="flex-1 text-sm text-fg">{q}</span>
                <span
                  className="shrink-0 font-mono text-xs"
                  style={{ color: covered ? "var(--excellent)" : "var(--warn)" }}
                >
                  {covered ? "● covered" : "○ gap"} {cov}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Seven signals — substance, not pills. */}
      <section className="flex flex-col gap-6 border-t border-border py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Seven signals, one score.</h2>
        <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {SIGNALS.map(([name, desc], i) => (
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

      {/* Honest positioning — the disclaimer as a stance, not fine print. */}
      <section className="border-t border-border py-16">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight text-fg-muted">
            Readiness isn’t ranking, and we won’t pretend it is.
          </h2>
          <p className="mt-2 text-fg-subtle">
            We measure how usable your site is as a source, with evidence for every finding. We
            don’t fabricate visibility scores or claim a specific AI will cite you. {READINESS_DISCLAIMER}
          </p>
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-border py-6 font-mono text-xs text-fg-subtle">
        <span>geo/readiness</span>
        <span>evidence-based · deterministic</span>
      </footer>
    </div>
  );
}
