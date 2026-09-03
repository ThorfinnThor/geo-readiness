import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TopBar } from "@/components/TopBar";
import { CONTENT, contentByCategory, type ContentCategory } from "@/lib/content/registry";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo/site";

const LEARN_TITLE = "Learn AI search readiness, in plain language";
const LEARN_DESC =
  "Guides and explainers on getting your website ready for AI answer engines like ChatGPT, " +
  "Gemini and Perplexity, written for business owners, not engineers.";

export const metadata: Metadata = {
  title: LEARN_TITLE,
  description: LEARN_DESC,
  alternates: { canonical: "/learn" },
  openGraph: {
    title: LEARN_TITLE,
    description: LEARN_DESC,
    url: "/learn",
    type: "website",
    images: [ogImageUrl(LEARN_TITLE)],
  },
  twitter: {
    card: "summary_large_image",
    title: LEARN_TITLE,
    description: LEARN_DESC,
    images: [ogImageUrl(LEARN_TITLE)],
  },
};

const ORDER: ContentCategory[] = ["Explainer", "Comparison", "Guide", "Reference"];
const BLURB: Record<ContentCategory, string> = {
  Explainer: "Start here. What AI search is and why it matters for your business.",
  Comparison: "How AI search relates to the SEO you may already know.",
  Guide: "Practical, do-this-next guides to improve your readiness.",
  Reference: "Definitions and quick lookups.",
};

export default function LearnPage() {
  const byCat = contentByCategory();
  return (
    <>
      <TopBar />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/learn" },
          ]),
          // The hub as a machine-readable list: an engine gets the whole content
          // set and its addresses without having to parse the card grid.
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "AI search readiness, in plain language",
            url: absoluteUrl("/learn"),
            itemListElement: CONTENT.map((e, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: e.title,
              url: absoluteUrl(e.slug),
            })),
          },
        ]}
      />
      <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Learn
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            AI search readiness, in plain language
          </h1>
          <p className="max-w-2xl text-lg text-fg-muted">
            Everything you need to understand how AI answer engines read your website, and how to
            make yours one they find, trust and quote. Written for business owners.
          </p>
        </header>

        {ORDER.filter((c) => byCat[c].length > 0).map((cat) => (
          <section key={cat} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
                {cat}
              </h2>
              <p className="text-sm text-fg-subtle">{BLURB[cat]}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {byCat[cat].map((e) => (
                <Link
                  key={e.slug}
                  href={e.slug}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-strong"
                >
                  <span className="font-medium">{e.title}</span>
                  <span className="text-sm text-fg-muted">{e.description}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
