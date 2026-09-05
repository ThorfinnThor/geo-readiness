import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TopBar } from "@/components/TopBar";
import { CrawlerCheck } from "@/components/tools/CrawlerCheck";
import { CRAWLERS, VERIFIED_ON } from "@/lib/content/crawlers";
import { ogImageUrl } from "@/lib/seo/content-metadata";
import { SITE, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo/site";

const HEADING = "Which AI crawlers can read your site?";
const DESC =
  "Enter a domain and see, from its live robots.txt, which of the 13 documented AI crawlers are " +
  "allowed in and which are blocked. Free, instant, no account.";

export const metadata: Metadata = {
  title: HEADING,
  description: DESC,
  alternates: { canonical: "/ai-crawler-check" },
  openGraph: {
    title: HEADING,
    description: DESC,
    url: "/ai-crawler-check",
    images: [ogImageUrl(HEADING, "Free tool")],
  },
  twitter: { card: "summary_large_image", title: HEADING, description: DESC },
};

const FAQS = [
  {
    q: "What exactly does this check?",
    a: "It fetches https://yourdomain.com/robots.txt and works out, for each documented AI user agent, whether that file lets it crawl your site root. It reads one public file and nothing else.",
  },
  {
    q: "I have no robots.txt. Is that bad?",
    a: "No. With no file, everything is allowed, which is the right default for most businesses. It does mean you have no way to opt out of model training without adding one.",
  },
  {
    q: "It says allowed, but I still do not appear in AI answers.",
    a: "Access is the first hurdle, not the last. A crawler that reaches a page built entirely in JavaScript still leaves with nothing, and a page that never answers the question has nothing to quote. That is what a readiness scan measures.",
  },
  {
    q: "Two agents are marked as ignoring robots.txt. What do I do about those?",
    a: "OpenAI and Perplexity both state that their user-triggered agents do not follow robots.txt, because a person asked for that page. If you need to stop them, robots.txt is the wrong layer — block at the server, CDN or firewall instead.",
  },
];

export default function Page() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "AI crawler check", path: "/ai-crawler-check" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: HEADING,
      url: absoluteUrl("/ai-crawler-check"),
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
      description: DESC,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <TopBar />
      <JsonLd data={jsonLd} />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
            Free tool
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{HEADING}</h1>
          <p className="text-lg text-fg-muted">
            {CRAWLERS.length} documented AI user agents read the web for the major answer engines,
            and they do different jobs. This reads your live <code>robots.txt</code> and tells you
            which of them you are letting in &mdash; and, more usefully, which ones you have blocked
            without meaning to.
          </p>
        </header>

        <CrawlerCheck />

        <section className="flex flex-col gap-3 border-t border-border pt-8">
          <h2 className="text-xl font-semibold tracking-tight">The mistake this is here to catch</h2>
          <p className="text-fg-muted">
            Blocking <code>GPTBot</code> keeps your content out of OpenAI&rsquo;s training data and
            costs you nothing in ChatGPT search. Blocking <code>OAI-SearchBot</code> removes you
            from ChatGPT&rsquo;s answers entirely. They are different tokens with different
            consequences, and most &ldquo;block AI crawlers&rdquo; snippets circulating online block
            both. If you wanted the first and got the second, this is where you find out.
          </p>
          <p className="text-fg-muted">
            Every token checked here comes from the vendor&rsquo;s own documentation, last verified{" "}
            {new Date(VERIFIED_ON).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            . The full reference, with what each one does and three copy-paste robots.txt policies,
            is on <Link href="/ai-crawlers">the AI crawler page</Link>.
          </p>
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
          <dl className="flex flex-col divide-y divide-border">
            {FAQS.map((f) => (
              <div key={f.q} className="flex flex-col gap-2 py-4">
                <dt className="font-medium">{f.q}</dt>
                <dd className="text-fg-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <aside className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-lg font-semibold">Access is the first hurdle, not the last</h2>
          <p className="text-sm text-fg-muted">
            Letting a crawler in does not mean it can use what it finds. A free readiness scan reads
            your site the way these bots do and scores seven signals, from whether your content
            survives without JavaScript to whether you answer what people actually ask.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
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
