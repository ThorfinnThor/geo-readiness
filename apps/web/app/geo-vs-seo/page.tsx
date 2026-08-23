import type { Metadata } from "next";

import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";

const meta = CONTENT.find((c) => c.slug === "/geo-vs-seo")!;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: meta.slug },
  openGraph: { title: meta.title, description: meta.description, url: meta.slug, type: "article" },
};

export default function Page() {
  return (
    <ArticleLayout
      title="GEO vs SEO: what is the difference?"
      description="SEO gets your page into a list of links. GEO gets your facts quoted inside an AI-generated answer. They overlap, but they are not the same job — here is how they differ and which one your business needs."
      category="Comparison"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Does GEO replace SEO?",
          a: "No. Traditional search is still huge, and SEO still drives most web traffic today. GEO adds a second front: being usable inside AI answers. For now, most businesses should do both — and the good news is that strong fundamentals help both at once.",
        },
        {
          q: "If I already rank well on Google, am I automatically ready for AI?",
          a: "Not necessarily. Ranking rewards relevance and authority signals; AI answers additionally need your facts to be specific, self-contained and easy to extract. Plenty of well-ranked pages are hard for an AI to quote because their key facts are vague or buried.",
        },
        {
          q: "Which should a small business focus on first?",
          a: "Start with the fundamentals that serve both: a clearly identified business, plain descriptions of what you offer, real trust pages, and key facts written as clear statements. Then measure your AI readiness specifically and close the remaining gaps.",
        },
        {
          q: "Is GEO just SEO with a new name?",
          a: "They share DNA, but the target differs. SEO optimizes for a ranking algorithm that orders links. GEO optimizes for a system that reads, trusts and quotes your content inside a written answer. Same hygiene, different finish line.",
        },
      ]}
    >
      <p>
        <strong>SEO</strong> (Search Engine Optimization) and <strong>GEO</strong> (Generative
        Engine Optimization) get confused because they rhyme and overlap. But they answer two
        different questions about your website:
      </p>
      <ul>
        <li>
          <strong>SEO asks:</strong> will my page show up — and rank well — in a list of search
          results?
        </li>
        <li>
          <strong>GEO asks:</strong> will my facts be quoted inside the answer an AI assistant
          writes?
        </li>
      </ul>
      <p>
        One is about <strong>being listed</strong>. The other is about <strong>being used</strong>.
        A customer clicks a search result themselves; with an AI answer, the machine reads your
        page on their behalf and decides what to repeat.
      </p>

      <h2>Side by side</h2>
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>SEO</th>
            <th>GEO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Goal</strong></td>
            <td>Rank in a list of links</td>
            <td>Be quoted in a written answer</td>
          </tr>
          <tr>
            <td><strong>Audience</strong></td>
            <td>A person scanning results</td>
            <td>A machine summarizing the web</td>
          </tr>
          <tr>
            <td><strong>Wins with</strong></td>
            <td>Relevance, links, authority, speed</td>
            <td>Clarity, specific facts, trust, extractable structure</td>
          </tr>
          <tr>
            <td><strong>Success looks like</strong></td>
            <td>Higher position, more clicks</td>
            <td>Your business named or your fact cited in the answer</td>
          </tr>
          <tr>
            <td><strong>Biggest mistake</strong></td>
            <td>Thin, duplicate pages</td>
            <td>Vague copy with no quotable facts</td>
          </tr>
        </tbody>
      </table>

      <h2>Where they overlap</h2>
      <p>
        Most of the fundamentals serve both. Fast, reachable pages; clear headings and structure;
        honest, useful content; a well-identified business — all of this helps you rank{" "}
        <em>and</em> helps a machine quote you. If you do the basics well, you are not choosing
        between GEO and SEO; you are building the shared foundation for both.
      </p>

      <h2>Where they diverge</h2>
      <p>
        The gap shows up in the details. SEO can tolerate a page that is broadly &quot;about&quot; a
        topic and earns links. GEO is less forgiving: if your key facts are not{" "}
        <strong>specific and self-contained</strong>, there is nothing for the machine to lift into
        an answer, no matter how well the page ranks. This is why a page can rank on page one of
        Google and still never appear in an AI answer — the ranking system found it relevant, but
        the answer engine found nothing quotable.
      </p>

      <h2>Which should you do?</h2>
      <p>
        For nearly every business today: <strong>both</strong>. Traditional search still drives the
        majority of traffic, so SEO is not going anywhere. But the share of people asking an AI
        assistant instead is climbing fast, and being absent there means a competitor&apos;s
        information fills the gap. The practical path is to build the shared fundamentals, then{" "}
        <strong>measure your AI readiness specifically</strong> — because that is the part most
        sites have never checked.
      </p>
      <p>
        A free readiness scan shows exactly where your site stands on the GEO side: how clearly your
        business is identified, how quotable your content is, and what to fix first.
      </p>
    </ArticleLayout>
  );
}
