import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/guides/evidence-and-trust")!;

export const metadata = contentMetadata(meta.slug);

export default function Page() {
  return (
    <ArticleLayout
      title="Evidence and Trust. Show you are a real, accountable business"
      description="AI favors accountable pages over anonymous ones. Here are the trust signals to add, like about, contact and evidence, most of which you already have the content for."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Why does an AI care about trust pages?",
          a: "Because it does not want to repeat information from a source that might be fake, abandoned or misleading. Visible accountability, meaning who you are, how to reach you and evidence for claims, is a proxy for this being safe to quote.",
        },
        {
          q: "We're a small business. Do we really need case studies?",
          a: "Not necessarily case studies, but some proof. A named example, a result with a number, a genuine testimonial with attribution, or references. Even one concrete, checkable proof point beats a page of adjectives.",
        },
        {
          q: "Do these pages help even if AI never crawls them all?",
          a: "Yes. Linking clearly to your about, contact and legal pages from the footer already signals accountability, and it helps real customers too. It is one of the highest-return, lowest-effort improvements.",
        },
      ]}
    >
      <p>
        Evidence and trust is whether your site looks like a real, accountable business worth quoting.
        AI systems weigh this before repeating your claims. They favor pages that are clearly owned by
        someone identifiable over anonymous, evidence-free ones, even when the anonymous page is
        technically correct.
      </p>
      <p>The good news is that most of this is content you already have or can produce in an afternoon.</p>

      <h2>The trust signals that matter</h2>
      <ul>
        <li>
          <strong>An about page</strong> covering who you are, what you do, and since when. It puts
          identity and accountability in one place.
        </li>
        <li>
          <strong>Contact and legal details</strong>, meaning a real way to reach you and, where
          required, imprint or company details. Linked from the footer is enough to signal it.
        </li>
        <li>
          <strong>Evidence for claims</strong>, such as a number behind a boast, a named example, a
          reference, or a link to a source. Proof, not adjectives.
        </li>
        <li>
          <strong>Named proof</strong>, since a genuine testimonial or case with attribution beats a
          vague our clients love us.
        </li>
        <li>
          <strong>Freshness</strong>, meaning content that is maintained and, where relevant, dated.
          Stale pages read as abandoned.
        </li>
      </ul>

      <h2>How to fix it</h2>
      <ol>
        <li>
          <strong>Publish or improve your about page.</strong> Make it short, honest and specific, not
          a wall of mission-statement language.
        </li>
        <li>
          <strong>Make contact and legal pages easy to find</strong> by linking them in the footer of
          every page.
        </li>
        <li>
          <strong>Add one concrete proof point per key claim.</strong> Replace highly efficient with
          the figure, and replace trusted by many with a real number or example.
        </li>
        <li>
          <strong>Attribute testimonials and references.</strong> A name, company or link makes them
          credible to people and machines alike.
        </li>
        <li>
          <strong>Keep time-sensitive pages current</strong> and show when they were updated.
        </li>
      </ol>

      <p>
        A note on honesty. Trust signals must be real. Inventing testimonials or evidence is both
        wrong and self-defeating, because the point is to <em>show</em> the credibility you actually
        have. A free readiness scan checks which trust signals your site exposes and which are missing.
      </p>
    </ArticleLayout>
  );
}
