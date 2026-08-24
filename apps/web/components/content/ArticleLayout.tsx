// Shared template for content/guide pages. The DESIGN is identical across pages
// (consistent, good for UX + crawlability); each page supplies its own UNIQUE
// content via `children`, plus Article + optional FAQ structured data — the FAQ
// doubles as clean, extractable Q&A for AI answer engines (GEO).
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TopBar } from "@/components/TopBar";
import { SITE, absoluteUrl } from "@/lib/seo/site";

export interface Faq {
  q: string;
  a: string;
}

export function ArticleLayout({
  title,
  description,
  category,
  published,
  updated,
  path,
  faqs = [],
  children,
}: {
  title: string;
  description: string;
  category?: string;
  published?: string; // ISO date; falls back to `updated`
  updated?: string; // ISO date
  path: string; // site-relative, for canonical + Article url
  faqs?: Faq[];
  children: React.ReactNode;
}) {
  const url = absoluteUrl(path);
  // author + publisher are the Organization itself: honest E-E-A-T without
  // inventing a person, and it's the trust signal the audit scores.
  const org = { "@type": "Organization", name: SITE.name, url: SITE.url };
  const datePublished = published ?? updated;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    ...(datePublished ? { datePublished } : {}),
    ...(updated ? { dateModified: updated } : {}),
    author: org,
    publisher: org,
  };
  // Home → Learn → this page, so AI engines and SERPs get the site hierarchy.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Learn", item: absoluteUrl("/learn") },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };
  const faqJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;
  const jsonLd = [articleJsonLd, breadcrumbJsonLd, ...(faqJsonLd ? [faqJsonLd] : [])];

  return (
    <>
      <TopBar />
      <JsonLd data={jsonLd} />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
        <article className="flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            {category && (
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
                {category}
              </span>
            )}
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="text-lg text-fg-muted">{description}</p>
            {updated && (
              <p className="font-mono text-xs text-fg-subtle">
                Updated{" "}
                {new Date(updated).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </header>

          <div className="content-prose">{children}</div>

          {faqs.length > 0 && (
            <section className="flex flex-col gap-4 border-t border-border pt-8">
              <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
              <dl className="flex flex-col divide-y divide-border">
                {faqs.map((f) => (
                  <div key={f.q} className="flex flex-col gap-2 py-4">
                    <dt className="font-medium">{f.q}</dt>
                    <dd className="text-fg-muted">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>

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
