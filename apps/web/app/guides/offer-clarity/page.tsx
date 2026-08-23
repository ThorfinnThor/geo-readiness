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
      title="Offer Clarity. State what you sell, plainly"
      description="If your products, services and prices are vague or trapped in images, an AI cannot recommend them. Make your offer unmistakable to both people and machines."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Should I really put prices on my site?",
          a: "Where you can, yes, even a starting price or a range. Saying systems from 12,400 euros is quotable and builds trust. Saying contact us for a quote gives an AI nothing to work with. If prices genuinely vary, state the range and what drives it.",
        },
        {
          q: "My services are described on the homepage. Isn't that enough?",
          a: "Often not. A clear, dedicated page per core service, with its own plain description, is far stronger than one homepage paragraph that lists everything. It also gives you a specific page to be matched to a specific question.",
        },
        {
          q: "What if my offer is complex or custom?",
          a: "Break it into named parts. Even bespoke work has components, typical scopes, and starting points you can describe concretely. Saying we do custom work is invisible. Saying we build custom X, typically starting at Y, over Z weeks is not.",
        },
      ]}
    >
      <p>
        Offer clarity is how plainly your website states what you actually sell, meaning your
        products, services and, where possible, prices. When this is fuzzy, an AI assistant simply
        cannot put you forward as the answer to who does X or what does Y cost, because it has nothing
        concrete to say about you.
      </p>

      <h2>The core problem is that marketing language hides the offer</h2>
      <p>
        Businesses love phrases like tailored solutions and end-to-end services. To a person skimming,
        that sounds fine. To a machine deciding what to quote, it is empty. It cannot recommend a
        solution. It can recommend <em>solar panel installation</em>, <em>home battery storage</em>,
        or <em>bookkeeping for small retailers</em>. Name the actual things.
      </p>

      <h2>How to fix it</h2>
      <ol>
        <li>
          <strong>List your services and products by name</strong>, using the words a customer would
          actually say, not internal jargon or clever branding.
        </li>
        <li>
          <strong>Give each core offering its own page</strong> with a plain description of what it
          is, who it is for, and what is included.
        </li>
        <li>
          <strong>State prices where you can</strong>, whether that is a figure, a starting price, or
          an honest range with what changes it. A concrete number is one of the most quotable facts on
          your site.
        </li>
        <li>
          <strong>Get key details out of images.</strong> Prices, package contents and specs baked
          into a graphic are invisible to machines. Put them in real text too.
        </li>
        <li>
          <strong>Use lists and tables for specifics.</strong> A clean comparison table of packages is
          both easy for customers and directly extractable into an answer.
        </li>
      </ol>

      <h2>Before and after</h2>
      <p>
        &quot;We offer comprehensive, tailored energy solutions for your home&quot; gives a machine
        nothing to recommend.
      </p>
      <p>
        &quot;We install solar panel systems from &euro;12,400 and home batteries with 13.5 kWh from
        &euro;6,900 for homeowners in Central Texas&quot; states a clear offer with quotable facts.
      </p>

      <p>
        Want to see how your offer reads to a machine, and whether it even detected your services? A
        free readiness scan extracts your offerings and shows you exactly what came through.
      </p>
    </ArticleLayout>
  );
}
