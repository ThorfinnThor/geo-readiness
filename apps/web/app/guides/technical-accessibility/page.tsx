import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/guides/technical-accessibility")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="Technical Accessibility: make sure machines can read your site at all"
      description="The best content is worthless if a machine cannot fetch or read it. Here is how to make sure your pages are reachable, server-visible and not accidentally blocking AI."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "What does 'server-visible content' mean?",
          a: "It's the text that's present in the page as delivered, before any scripts run. AI crawlers often read that raw version. If your real content only appears after heavy JavaScript, the machine may see an almost empty page even though your browser shows a full one.",
        },
        {
          q: "How would I be 'accidentally blocking' AI?",
          a: "A robots.txt rule, an over-aggressive bot filter, or a firewall setting can block automated visitors. Sometimes a security product blocks everything that isn't a mainstream browser. Then your pages return errors to crawlers and score zero — not because of content, but access.",
        },
        {
          q: "Do I need my site to be lightning fast?",
          a: "It helps, but the bigger wins here are reachability and server-visible content. A reasonably fast, reachable page with its text present beats a beautiful page that a crawler can't load or read.",
        },
      ]}
    >
      <p>
        <strong>Technical accessibility</strong> is the foundation everything else sits on: can a
        machine actually <em>fetch and read</em> your pages? It sounds obvious, yet it is where some
        sites silently score zero — the content is great, but a crawler never gets to it.
      </p>

      <h2>The three things that go wrong</h2>
      <ol>
        <li>
          <strong>The page is blocked.</strong> A robots rule, a bot filter or a security product
          returns an error to anything that isn&apos;t a mainstream browser. The crawler gets
          nothing.
        </li>
        <li>
          <strong>The content isn&apos;t server-visible.</strong> Your headline, prices and copy are
          built by scripts after the page loads. Your browser runs them; many crawlers read the raw
          page and see an empty shell.
        </li>
        <li>
          <strong>The structure is missing.</strong> No clear title, headings or links — so even
          when the text is read, the machine can&apos;t tell what&apos;s important.
        </li>
      </ol>

      <h2>How to fix it</h2>
      <ol>
        <li>
          <strong>Check that your key content is in the page source.</strong> View the raw HTML (or
          disable JavaScript) and confirm your headline, main copy and prices are actually there. If
          not, your site needs server-side rendering or static content for those parts.
        </li>
        <li>
          <strong>Review robots.txt.</strong> Make sure you are not disallowing your important
          pages. Blocking admin areas is fine; blocking your content is not.
        </li>
        <li>
          <strong>Don&apos;t over-block bots.</strong> Aggressive &quot;block all non-browser
          traffic&quot; settings can lock out legitimate crawlers. Allow well-behaved ones to read
          public pages.
        </li>
        <li>
          <strong>Use real HTML structure</strong> — one clear page title, proper headings, real
          links. This is how a machine understands the shape of your page.
        </li>
        <li>
          <strong>Keep pages reasonably fast and reliable.</strong> Timeouts and errors mean missed
          pages.
        </li>
      </ol>

      <h2>Why this is the first thing to check</h2>
      <p>
        If a machine can&apos;t reach or read a page, none of the other work — clarity, quotable
        content, trust — even gets a chance. It is the cheapest, highest-leverage fix: get access
        right first, then improve what&apos;s on the page.
      </p>

      <p>
        A free readiness scan fetches your site exactly as an AI crawler would and reports what it
        could actually reach and read — including pages that came back blocked or empty.
      </p>
    </ArticleLayout>
  );
}
