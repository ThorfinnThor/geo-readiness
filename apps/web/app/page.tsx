import { Suspense } from "react";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { SignalInsights } from "@/components/marketing/SignalInsights";
import { Testimonials } from "@/components/marketing/Testimonials";
import { MobileMenu } from "@/components/MobileMenu";
import { ScanCounter } from "@/components/ScanCounter";
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

// An illustration of the mistake the checker exists to catch, using the real
// tokens: the training bot blocked on purpose, the search bot blocked by
// accident alongside it.
const CRAWLER_SAMPLE: [string, "allowed" | "blocked", string][] = [
  ["OAI-SearchBot", "blocked", "You are out of ChatGPT's answers. Almost nobody means this."],
  ["GPTBot", "blocked", "Out of OpenAI's training data. Costs you nothing in search."],
  ["PerplexityBot", "allowed", "Perplexity can find and link you."],
  ["Claude-SearchBot", "allowed", "Claude can source answers from you."],
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
    <div className="panel w-full max-w-full overflow-hidden shadow-2xl" aria-hidden>
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

export default async function HomePage() {
  return (
    <>
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="flex min-h-[44px] items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-2))" }}
          />
          <span className="font-mono text-sm font-medium tracking-tight">findyouraiscore</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-fg-muted sm:gap-6">
          <div className="hidden items-center gap-6 sm:flex">
            <Link href="/product" className="flex min-h-[44px] items-center hover:text-fg">
              Product
            </Link>
            <Link href="/methodology" className="flex min-h-[44px] items-center hover:text-fg">
              How scoring works
            </Link>
            <Link href="/learn" className="flex min-h-[44px] items-center hover:text-fg">
              Learn
            </Link>
            <Link href="/pricing" className="flex min-h-[44px] items-center hover:text-fg">
              Pricing
            </Link>
            <Link
              href="/report/demo"
              className="flex min-h-[44px] items-center text-fg-subtle hover:text-fg"
            >
              Example
            </Link>
          </div>
          <MobileMenu
            links={[
              { href: "/product", label: "Product" },
              { href: "/methodology", label: "How scoring works" },
              { href: "/learn", label: "Learn" },
              { href: "/pricing", label: "Pricing" },
              { href: "/report/demo", label: "Example report" },
            ]}
          />
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero — asymmetric: the pitch on the left, the product's own output on the right. */}
      <main className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <section className="flex min-w-0 flex-col gap-6">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-fg-subtle">
            AI search readiness audit
          </span>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[3.4rem]">
            Find out why AI search might skip your website.
          </h1>
          <p className="max-w-xl text-lg text-fg-muted">
            When people ask ChatGPT, Gemini or Perplexity about your business, is your site the
            answer they quote, or your competitor’s? We check how ready your pages are to be found
            and cited, and show you exactly what to fix.
          </p>

          <div className="flex flex-col gap-3">
            <ScanForm />
            <p className="flex flex-wrap gap-x-2 font-mono text-xs text-fg-subtle">
              <span>free score</span>
              <span aria-hidden>·</span>
              <span>results in minutes</span>
              <span aria-hidden>·</span>
              <span>no AI-provider calls</span>
            </p>
          </div>

          <p className="text-sm text-fg-muted">
            Not ready for a full scan?{" "}
            <Link
              href="/ai-crawler-check"
              className="font-medium text-accent underline underline-offset-4"
            >
              Check which AI crawlers can reach your site
            </Link>{" "}
            &mdash; it reads your robots.txt in a second. Nothing to sign up for.
          </p>

          <ScanCounter />
        </section>

        <section className="min-w-0 lg:pl-4">
          <Inspector />
        </section>
      </main>

      <Testimonials />

      {/* The unique bit: the actual questions the engine generates. */}
      <section className="flex flex-col gap-6 border-t border-border py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            We generate the questions AI search asks.
          </h2>
          <p className="max-w-2xl text-fg-muted">
            We build them from your own business profile, without any external AI, then check page
            by page whether you answer them. Where you don’t, AI search has to rely on someone else.
          </p>
          <p className="max-w-2xl text-fg-muted">
            They take the shape of your site, in your site’s language. A comparison site is asked
            the category decision, not who supplies one model. A local business gets questions with
            its town in them. A one-pager gets asked about its subject.{" "}
            <Link href="/for" className="text-accent underline-offset-4 hover:underline">
              See what that looks like for your kind of site →
            </Link>
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

      {/* The citation self-test — the part a readiness number cannot replace. */}
      <section className="flex flex-col gap-6 border-t border-border py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Then go and check what AI actually says.
          </h2>
          <p className="max-w-2xl text-fg-muted">
            A readiness score tells you whether your site can be used as a source. It cannot tell
            you what ChatGPT said this morning — nothing deterministic can, because answer engines
            give different answers to the same question. So the report hands you the test instead of
            guessing at the result.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            [
              "01",
              "Take your questions",
              "Neutral questions generated from your own profile. Your brand and domain are stripped out, so the model is not told who to look for.",
            ],
            [
              "02",
              "Paste prompt one",
              "A blind web search in ChatGPT, Claude or Perplexity. It answers the questions and lists the sources it used, with no idea whose site is being tested.",
            ],
            [
              "03",
              "Paste prompt two",
              "Only now does your domain come up: it checks the sources from step one and reports where you were cited, and where a competitor was.",
            ],
          ].map(([n, h, d]) => (
            <li
              key={n}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-5"
            >
              <span className="font-mono text-xs text-fg-subtle">{n}</span>
              <span className="font-medium">{h}</span>
              <span className="text-sm text-fg-muted">{d}</span>
            </li>
          ))}
        </ol>
        <p className="max-w-2xl text-sm text-fg-subtle">
          The test is blinded on purpose. Tell a model to look for your site and it will find it —
          that proves nothing. A miss is not proof a page is weak, and a hit is not a ranking. It is
          one honest observation, and you can repeat it whenever you like.
        </p>
      </section>

      {/* The free tool, given room where the reader now knows what is at stake. */}
      <section className="flex flex-col gap-6 border-t border-border py-16">
        <div className="grid items-start gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-w-0 flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-fg-subtle">
              Free tool
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">
              First, check that they can reach you at all.
            </h2>
            <p className="max-w-xl text-fg-muted">
              Thirteen documented AI crawlers read the web for the major answer engines, and they do
              different jobs. Blocking <code className="font-mono text-sm">GPTBot</code> keeps you
              out of OpenAI&rsquo;s training data and costs you nothing. Blocking{" "}
              <code className="font-mono text-sm">OAI-SearchBot</code> removes you from
              ChatGPT&rsquo;s answers entirely. Most &ldquo;block AI crawlers&rdquo; snippets
              circulating online do both.
            </p>
            <p className="max-w-xl text-fg-muted">
              The checker reads your live robots.txt and tells you which side of that line you are
              on. No account, no email, no scan.
            </p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link
                href="/ai-crawler-check"
                className="inline-flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
              >
                Check your crawlers →
              </Link>
              <Link
                href="/ai-crawlers"
                className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                The full reference
              </Link>
            </div>
          </div>
          <ul className="flex min-w-0 flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40 font-mono text-xs">
            {CRAWLER_SAMPLE.map(([token, verdict, meaning]) => (
              <li key={token} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="font-semibold text-fg">{token}</span>
                <span
                  className="ml-auto shrink-0 rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase"
                  style={{
                    color: verdict === "allowed" ? "var(--excellent)" : "var(--weak)",
                    backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
                  }}
                >
                  {verdict}
                </span>
                <span className="w-full text-fg-subtle">{meaning}</span>
              </li>
            ))}
          </ul>
        </div>
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

      {/* Real aggregate from actual scans — renders only once the sample is large enough. */}
      <Suspense fallback={null}>
        <SignalInsights />
      </Suspense>

      {/* The offering, stated plainly — what you actually get. */}
      <section className="flex flex-col gap-6 border-t border-border py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">What you get</h2>
          <p className="max-w-2xl text-fg-muted">
            Find Your AI Score is an AI search readiness audit. Enter a domain, get a score. No
            account, no card, no call.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/50 p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              Free
            </span>
            <ul className="flex flex-col gap-2 text-sm text-fg-muted">
              <li>A 0 to 100 readiness score for your domain</li>
              <li>All seven component scores, and how confident the result is</li>
              <li>A sample finding, and one of your citation-test questions</li>
            </ul>
          </div>
          <div
            className="flex flex-col gap-3 rounded-xl border p-5"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 40%, var(--border))",
              background: "color-mix(in srgb, var(--accent) 6%, var(--surface))",
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              Premium AI Readiness Audit
            </span>
            <ul className="flex flex-col gap-2 text-sm text-fg-muted">
              <li>Every finding with the evidence behind it, ranked by what to fix first</li>
              <li>A paste-ready fix prompt per issue, plus one master prompt for all of them</li>
              <li>The questions AI search asks about your business, with your coverage of each</li>
              <li>The full AI Citation Self-Test: all questions, both prompts, the pro protocol</li>
              <li>A downloadable report to hand to whoever does the work</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/product"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border-strong px-4 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            See what the audit does →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            Pricing
          </Link>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight text-fg-muted">
            What the score measures
          </h2>
          <p className="mt-2 text-fg-subtle">
            It measures how usable your site is as a source, and every finding comes with the
            evidence behind it. It does not predict rankings or traffic, and it cannot promise that a
            specific AI will mention you. {READINESS_DISCLAIMER}
          </p>
        </div>
      </section>

      </div>
      <Footer />
    </>
  );
}
