import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/guides/sourceability")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="Sourceability: make your content quotable by AI"
      description="To be quoted, your pages need concrete facts, attributed claims and extractable structure — not vague marketing copy. Here is how to write content an AI can actually lift into an answer."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "What makes content 'quotable'?",
          a: "A specific, self-contained fact an AI can lift without needing the rest of the page: a price, a number, a definition, a step, a clear yes/no. If a sentence only makes sense with three paragraphs of context, it is hard to quote.",
        },
        {
          q: "Do I need to add citations like an academic paper?",
          a: "No, but attributing important, checkable claims helps — 'according to the U.S. Energy Information Administration…' or a link to the source. It signals your facts are real, which makes an AI more comfortable repeating them.",
        },
        {
          q: "Won't concrete numbers date my content?",
          a: "Some will, and that's fine — keep them current. The alternative (saying nothing specific to stay evergreen) means never being quotable. Date-stamp what changes and maintain it.",
        },
      ]}
    >
      <p>
        <strong>Sourceability</strong> is how usable your content is <em>as a source</em>. It is the
        difference between a page an AI can quote and one it can only glance past. This is where the
        most polished-looking sites often score worst — because good marketing copy and good{" "}
        <em>source material</em> are not the same thing.
      </p>

      <h2>The four ingredients of quotable content</h2>
      <ul>
        <li>
          <strong>Concrete facts and figures.</strong> Prices, percentages, measurements, counts,
          timeframes, outcomes. Specifics are quotable; adjectives are not.
        </li>
        <li>
          <strong>Attributed claims.</strong> When you state something checkable, say where it comes
          from — your own data, a named source, a link. It signals the fact is real.
        </li>
        <li>
          <strong>Extractable structure.</strong> Real tables for specs and comparisons, lists for
          steps and options, clear definitions. A machine lifts a table row far more easily than a
          buried sentence.
        </li>
        <li>
          <strong>Direct answers.</strong> For a common question, a short, standalone answer near
          the top — then the detail.
        </li>
      </ul>

      <h2>Rewrite for extraction</h2>
      <p>The same information, made quotable:</p>
      <blockquote>
        &quot;Our installations are known for their exceptional efficiency and long-lasting
        quality.&quot; → nothing to lift.
      </blockquote>
      <blockquote>
        &quot;Our 8.4 kW systems offset about 92% of a typical home&apos;s annual usage and carry a
        25-year performance warranty.&quot; → three quotable facts.
      </blockquote>

      <h2>How to fix it</h2>
      <ol>
        <li>Go through your key pages and replace vague adjectives with the specific number behind them.</li>
        <li>Turn spec lists and comparisons into real tables, and processes into numbered steps.</li>
        <li>Add a one-sentence direct answer at the top of sections that answer a question.</li>
        <li>Attribute important external claims to a named or linked source.</li>
        <li>Keep the figures current — quotable content is worth maintaining.</li>
      </ol>

      <p>
        Sourceability is usually the biggest, most fixable gap for well-designed sites. A free
        readiness scan scores it directly and points to the specific pages where your content is
        not yet quotable.
      </p>
    </ArticleLayout>
  );
}
