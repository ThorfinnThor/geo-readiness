import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/guides/offer-clarity")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="Offer Clarity: state what you sell, plainly"
      description="If your products, services and prices are vague or trapped in images, an AI cannot recommend them. Make your offer unmistakable to both people and machines."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Should I really put prices on my site?",
          a: "Where you can, yes — even a starting price or a range. 'Systems from €12,400' is quotable and builds trust; 'contact us for a quote' gives an AI nothing to work with. If prices genuinely vary, state the range and what drives it.",
        },
        {
          q: "My services are described on the homepage. Isn't that enough?",
          a: "Often not. A clear, dedicated page per core service — with its own plain description — is far stronger than one homepage paragraph that lists everything. It also gives you a specific page to be matched to a specific question.",
        },
        {
          q: "What if my offer is complex or custom?",
          a: "Break it into named parts. Even bespoke work has components, typical scopes, and starting points you can describe concretely. 'We do custom work' is invisible; 'We build custom X, typically starting at Y, over Z weeks' is not.",
        },
      ]}
    >
      <p>
        <strong>Offer clarity</strong> is how plainly your website states{" "}
        <em>what you actually sell</em> — your products, services and (where possible) prices. When
        this is fuzzy, an AI assistant simply cannot put you forward as the answer to &quot;who does
        X&quot; or &quot;what does Y cost&quot;, because it has nothing concrete to say about you.
      </p>

      <h2>The core problem: marketing language hides the offer</h2>
      <p>
        Businesses love phrases like &quot;tailored solutions&quot; and &quot;end-to-end
        services&quot;. To a person skimming, that sounds fine. To a machine deciding what to quote,
        it is empty. It cannot recommend a &quot;solution&quot; — it can recommend{" "}
        <em>solar panel installation</em>, <em>home battery storage</em>, <em>bookkeeping for small
        retailers</em>. Name the actual things.
      </p>

      <h2>How to fix it</h2>
      <ol>
        <li>
          <strong>List your services and products by name</strong> — the words a customer would
          actually say, not internal jargon or clever branding.
        </li>
        <li>
          <strong>Give each core offering its own page</strong> with a plain description of what it
          is, who it&apos;s for, and what&apos;s included.
        </li>
        <li>
          <strong>State prices where you can</strong> — a figure, a starting price, or an honest
          range with what changes it. A concrete number is one of the most quotable facts on your
          site.
        </li>
        <li>
          <strong>Get key details out of images.</strong> Prices, package contents and specs baked
          into a graphic are invisible to machines. Put them in real text too.
        </li>
        <li>
          <strong>Use lists and tables for specifics.</strong> A clean comparison table of packages
          is both easy for customers and directly extractable into an answer.
        </li>
      </ol>

      <h2>Before and after</h2>
      <blockquote>
        &quot;We offer comprehensive, tailored energy solutions for your home.&quot; → nothing to
        recommend.
      </blockquote>
      <blockquote>
        &quot;We install solar panel systems (from €12,400) and home batteries (13.5 kWh, from
        €6,900) for homeowners in Central Texas.&quot; → clear offer, quotable facts.
      </blockquote>

      <p>
        Want to see how your offer reads to a machine — and whether it even detected your services?
        A free readiness scan extracts your offerings and shows you exactly what came through.
      </p>
    </ArticleLayout>
  );
}
