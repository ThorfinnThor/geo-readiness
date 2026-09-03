import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TopBar } from "@/components/TopBar";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import { readinessBenchmark } from "@/lib/scans/insights";
import { SITE, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo/site";

const TITLE = "The state of AI search readiness";
const DESC =
  "Real aggregate data from the websites scanned with Find Your AI Score: average readiness, " +
  "the score distribution, and which signals sites most often fall short on.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/insights" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "/insights",
    type: "article",
    images: [ogImageUrl(TITLE, "Insights")],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: [ogImageUrl(TITLE, "Insights")],
  },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{children}</h2>
  );
}

export default async function InsightsPage() {
  const data = await readinessBenchmark();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
  ]);

  // Dataset is the schema for published figures. It states the sample size, the
  // licence and who produced it, which is what a model needs before it will
  // quote a number — and what a journalist needs before citing one.
  const datasetJsonLd = data
    ? {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: TITLE,
        description: DESC,
        url: absoluteUrl("/insights"),
        license: "https://creativecommons.org/licenses/by/4.0/",
        isAccessibleForFree: true,
        creator: { "@type": "Organization", name: SITE.name, url: SITE.url },
        publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
        temporalCoverage: `../${new Date().toISOString().slice(0, 10)}`,
        variableMeasured: [
          {
            "@type": "PropertyValue",
            name: "Average AI search readiness score",
            value: Math.round(data.overallAvg),
            maxValue: 100,
            minValue: 0,
          },
          {
            "@type": "PropertyValue",
            name: "Sites in sample",
            value: data.sampleSize,
          },
          ...data.signals.map((sig) => ({
            "@type": "PropertyValue",
            name: `Average score: ${sig.name}`,
            value: Math.round(sig.avg),
            maxValue: 100,
            minValue: 0,
          })),
        ],
      }
    : null;

  return (
    <>
      <TopBar />
      <JsonLd data={datasetJsonLd ? [breadcrumb, datasetJsonLd] : breadcrumb} />
      <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Insights
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{TITLE}</h1>
          <p className="text-lg text-fg-muted">
            Every scan run here adds to a picture of how ready real websites are for AI answer
            engines. This page is that picture, straight from the data.
          </p>
        </header>

        {!data ? (
          <section className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface/50 p-6">
            <h2 className="text-lg font-semibold">We are still gathering data</h2>
            <p className="text-sm text-fg-muted">
              There are not yet enough scanned sites to publish a benchmark we would stand behind.
              Run a free scan to be part of it, and check back soon.
            </p>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
            >
              Run a free scan
            </Link>
          </section>
        ) : (
          <>
            <section className="flex flex-col gap-4">
              <p className="text-fg-muted">
                Based on{" "}
                <strong className="text-fg">
                  {data.sampleSize.toLocaleString("en-US")} sites
                </strong>{" "}
                scanned here, the average AI search readiness score is{" "}
                <strong className="text-fg">{Math.round(data.overallAvg)}/100</strong>. These sites
                are self-selected, owners checking their own readiness, so read this as where sites
                that bother to check tend to stand, not a web-wide average.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionLabel>Score distribution</SectionLabel>
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40">
                {data.buckets.map((b) => {
                  const maxCount = Math.max(1, ...data.buckets.map((x) => x.count));
                  const pct = data.sampleSize > 0 ? Math.round((100 * b.count) / data.sampleSize) : 0;
                  return (
                    <li key={b.label} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="w-40 shrink-0 text-sm font-medium">{b.label}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.round((100 * b.count) / maxCount)}%`,
                            background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                          }}
                        />
                      </span>
                      <span className="w-24 shrink-0 text-right font-mono text-sm tabular-nums text-fg-muted">
                        {b.count.toLocaleString("en-US")} ({pct}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <SectionLabel>Where sites fall short, by signal</SectionLabel>
              <p className="text-sm text-fg-muted">
                Average score per readiness signal, weakest first, with the share of sites that land
                in the weak or needs-improvement range on it.
              </p>
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40">
                {data.signals.map((s) => (
                  <li key={s.key} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="w-40 shrink-0 text-sm font-medium">{s.name}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, s.avg))}%`,
                          background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                        }}
                      />
                    </span>
                    <span className="flex w-24 shrink-0 flex-col items-end">
                      <span className="font-mono text-sm tabular-nums text-fg">
                        {Math.round(s.avg)}
                      </span>
                      <span className="text-[0.7rem] text-fg-subtle">
                        {Math.round(s.weakShare * 100)}% weak
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface/50 p-6">
              <h2 className="text-lg font-semibold">See where your site lands</h2>
              <p className="text-sm text-fg-muted">
                Run a free scan to get your own readiness score across all seven signals, and see how
                you compare to the sites above.
              </p>
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
              >
                Run a free scan
              </Link>
            </section>

            <section className="flex flex-col gap-3 border-t border-border pt-8">
              <SectionLabel>Using these figures</SectionLabel>
              <p className="text-sm text-fg-muted">
                The numbers on this page are free to reuse, including commercially, with
                attribution and a link back. If you quote them, say when you took them — the sample
                grows, so the figures move.
              </p>
              <p className="rounded-xl border border-border bg-surface-2/50 p-4 font-mono text-xs leading-relaxed text-fg-muted">
                Find Your AI Score, &ldquo;{TITLE}&rdquo;, n={data.sampleSize.toLocaleString("en-US")}{" "}
                sites, retrieved{" "}
                {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                . {absoluteUrl("/insights")}
              </p>
            </section>

            <p className="border-t border-border pt-6 text-xs text-fg-subtle">
              Live from real scans, updated hourly. Each site counts once (its latest scan). The
              sample is self-selected and not a web-wide benchmark; it grows and sharpens as more
              sites are scanned. Scores are a diagnostic of readiness, not a promise of rankings,
              traffic or AI mentions.
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
