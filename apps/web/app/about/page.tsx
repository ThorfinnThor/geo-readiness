import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TopBar } from "@/components/TopBar";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import { SITE, absoluteUrl } from "@/lib/seo/site";

const ABOUT_DESC =
  "Find Your AI Score is a deterministic, evidence-based audit of how ready a website is to be " +
  "found, trusted and quoted by AI answer engines. Here is who we are and how the method works.";

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_DESC,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About",
    description: ABOUT_DESC,
    url: "/about",
    type: "website",
    images: [ogImageUrl("About")],
  },
  twitter: {
    card: "summary_large_image",
    title: "About",
    description: ABOUT_DESC,
    images: [ogImageUrl("About")],
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${SITE.name}`,
  url: absoluteUrl("/about"),
  mainEntity: { "@id": `${SITE.url}/#organization` },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
    { "@type": "ListItem", position: 2, name: "About", item: absoluteUrl("/about") },
  ],
};

export default function AboutPage() {
  return (
    <>
      <TopBar />
      <JsonLd data={[aboutJsonLd, breadcrumbJsonLd]} />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            About
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            What Find Your AI Score is
          </h1>
          <p className="text-lg text-fg-muted">
            Find Your AI Score is a readiness audit for the age of AI search. It reads your website
            the way ChatGPT, Gemini and Perplexity do, then scores how ready your pages are to be
            found, trusted and quoted, and shows you exactly what to improve.
          </p>
        </header>

        <div className="content-prose">
          <h2>What we do</h2>
          <p>
            When someone asks an AI assistant a question, the answer is built partly from
            information the system reads on websites. Our audit measures whether your site is one it
            can cleanly read and cite. It scores seven signals: entity clarity, offer clarity,
            prompt coverage, sourceability, structured data, evidence and trust, and technical
            accessibility. Each score comes with the evidence behind it and a concrete fix.
          </p>

          <h2>How the method works</h2>
          <p>
            The scan crawls up to twelve pages of your site, extracts the text, structure and
            metadata, and runs a fixed set of deterministic rules. The same site scored twice gives
            the same result, because nothing about the score is guessed. We do not send your pages
            to an AI model to be graded. The engine is versioned, so a score you got last month
            stays reproducible, and every point on the report traces back to something we observed
            on your pages.
          </p>

          <h2>What we measure, and what we do not claim</h2>
          <p>
            We measure readiness across three stages: whether a system can retrieve your page,
            whether it would trust your page as a source, and whether it can extract a clean answer
            from it. That is a diagnostic of your site. It is not a promise of rankings, traffic or
            actual mentions in any AI product. No tool controls what an AI system says, and we do
            not pretend otherwise. What you can control is how ready your site is to be read and
            quoted, and that is what we score.
          </p>

          <h2>Who runs it</h2>
          <p>
            Find Your AI Score is an independent tool. For the legal operator, company details and
            contact address, see the{" "}
            <Link href="/imprint">imprint</Link>. Questions or feedback are welcome at{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. How we handle scan data is described
            in the <Link href="/privacy">privacy notice</Link>.
          </p>
        </div>

        <aside className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-lg font-semibold">See how your site scores</h2>
          <p className="text-sm text-fg-muted">
            Run a free readiness audit and get your score, a component breakdown and what to fix, in
            about a minute.
          </p>
          <Link
            href="/"
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
          >
            Run a free scan
          </Link>
        </aside>
      </main>
      <Footer />
    </>
  );
}
