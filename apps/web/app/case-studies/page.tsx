import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { RadialScore } from "@/components/report/shared";
import { TopBar } from "@/components/TopBar";
import { ogImageUrl } from "@/lib/seo/content-metadata";

const CASE_DESC =
  "A real before-and-after case study: we ran Find Your AI Score on our own site, found a weak " +
  "spot, fixed it honestly, and rescored. Offer Clarity went from 36 to 83.";

export const metadata: Metadata = {
  title: "Case study: auditing our own site",
  description: CASE_DESC,
  alternates: { canonical: "/case-studies" },
  openGraph: {
    title: "Case study: auditing our own site",
    description: CASE_DESC,
    url: "/case-studies",
    type: "article",
    images: [ogImageUrl("Case study")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Case study: auditing our own site",
    description: CASE_DESC,
    images: [ogImageUrl("Case study")],
  },
};

// Real, verifiable numbers from scanning findyouraiscore.com before and after the fix.
const BEFORE_AFTER: [string, string, string][] = [
  ["Overall readiness", "75 (Good)", "89 (Strong)"],
  ["Offer Clarity", "36 (Weak)", "83 (Strong)"],
  ["Evidence & Trust", "64 (Needs improvement)", "94 (Excellent)"],
  ["Structured Data", "99 (Excellent)", "100 (Excellent)"],
];

export default function CaseStudiesPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Case study
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            We audited our own site
          </h1>
          <p className="max-w-2xl text-lg text-fg-muted">
            The most honest test of an audit tool is to run it on yourself. So we ran Find Your AI
            Score on findyouraiscore.com, took the result seriously, and fixed what it found. Here is
            exactly what happened, with the real numbers.
          </p>
        </header>

        <section className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface/50 p-8 sm:flex-row sm:justify-center sm:gap-12">
          <div className="flex flex-col items-center gap-2">
            <RadialScore score={75} level="Good" size={132} />
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Before
            </span>
          </div>
          <span className="text-3xl text-fg-subtle sm:rotate-0" aria-hidden>
            →
          </span>
          <div className="flex flex-col items-center gap-2">
            <RadialScore score={89} level="Strong" size={132} />
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              After applying the fixes
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">What the audit found</h2>
          <p className="text-fg-muted">
            Our overall score was 75 (Good), but two components stood out: Offer Clarity at 36
            (Weak) and Evidence &amp; Trust at 64 (Needs improvement). The Offer Clarity result
            surprised us, because our structured data was already strong (Structured Data scored
            99). The audit was right, though. Offer Clarity measures the <em>visible</em> content,
            not the schema, and our offering lived mostly in prose and on the pricing page. There
            was no single page that plainly stated what we sell, and no dedicated contact page.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">What we changed</h2>
          <p className="text-fg-muted">
            No tricks, and nothing invented. For Offer Clarity we added a dedicated{" "}
            <Link href="/product" className="text-[color:var(--accent)] hover:underline">
              product page
            </Link>{" "}
            that states the offering plainly — what the audit is, the seven things it checks, what
            you get and who it is for — plus a clear offering section on the homepage. For Evidence
            &amp; Trust we added a{" "}
            <Link href="/contact" className="text-[color:var(--accent)] hover:underline">
              contact page
            </Link>{" "}
            and this very case study. That is the same advice the report gives everyone else.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">The result</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-fg-subtle">
                  <th className="py-2 pr-4 font-medium">Signal</th>
                  <th className="py-2 pr-4 font-medium">Before</th>
                  <th className="py-2 font-medium">After</th>
                </tr>
              </thead>
              <tbody>
                {BEFORE_AFTER.map(([signal, before, after]) => (
                  <tr key={signal} className="border-b border-border">
                    <td className="py-2 pr-4 text-fg">{signal}</td>
                    <td className="py-2 pr-4 font-mono text-fg-muted">{before}</td>
                    <td className="py-2 font-mono text-fg">{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-fg-muted">
            Offer Clarity went from 36 (Weak) to 83 (Strong), Evidence &amp; Trust from 64 to 94
            (Excellent), and our overall score rose from 75 to 89 (Strong). We changed nothing about
            how the score is calculated — only the site, following the audit&apos;s own fixes.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-5">
          <h2 className="text-lg font-semibold tracking-tight">The honest caveat</h2>
          <p className="text-sm text-fg-muted">
            This is one site, our own, and the numbers are a readiness score, not a ranking. A higher
            score does not guarantee that any AI system will cite us. It means our site is more ready
            to be found, trusted and quoted. That is the only thing the audit measures, and the only
            thing we changed.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] transition-opacity hover:opacity-90"
          >
            Run a free scan on your site
          </Link>
          <Link
            href="/product"
            className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            What the audit does
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
