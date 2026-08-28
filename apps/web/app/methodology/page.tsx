import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { RESEARCH_BASIS } from "@/lib/content/research-basis";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/methodology")!;

export const metadata = contentMetadata(meta.slug);

const COMPONENTS: [string, number, string][] = [
  ["Entity Clarity", 20, "How unambiguously the site says who the business is, what it does and where."],
  ["Offer Clarity", 20, "Whether the products or services are stated plainly and in detail."],
  ["Prompt Coverage", 20, "How well the pages answer the questions customers actually ask."],
  ["Sourceability", 15, "Whether the content is specific, first-party and extractable as a source."],
  ["Structured Data", 10, "Whether machine-readable schema states the facts accurately."],
  ["Evidence & Trust", 10, "Identity, contact, policies and references that make the site accountable."],
  ["Technical Accessibility", 5, "Whether a machine can actually fetch and read the pages."],
];

export default function Page() {
  return (
    <ArticleLayout
      title="How scoring works"
      description="How Find Your AI Score turns your website into a 0 to 100 readiness score: the seven weighted components, the three readiness stages, and the deterministic rules behind every point."
      category="Reference"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Is the score based on AI or on fixed rules?",
          a: "Fixed rules. The engine reads your pages and applies a versioned set of deterministic checks. The same site scored twice gives the same result, and we never send your pages to an AI model to be graded.",
        },
        {
          q: "Does a high score mean I will be cited by ChatGPT?",
          a: "No. The score measures how ready your site is to be found, trusted and quoted. It does not measure or guarantee actual mentions, citations or rankings in any AI product. No tool controls what an AI system says.",
        },
        {
          q: "Why is Technical Accessibility only 5% of the score?",
          a: "Because for most sites it is already fine and rarely the thing holding you back. It still matters as a gate: if a machine cannot fetch your pages at all, nothing else can be measured, and the report is marked provisional.",
        },
        {
          q: "What if a signal does not apply to my type of site?",
          a: "It is marked not applicable and excluded from the calculation rather than counted as zero. The engine also detects your site type (for example SaaS, local business or publisher) so location- or product-specific checks only apply where they make sense.",
        },
        {
          q: "Is there a scientific basis for the method?",
          a: "Yes. It is informed by peer-reviewed research on generative-engine optimization, retrieval-augmented generation and citation/verifiability, plus open web standards like Schema.org. The 'The research this builds on' section lists the sources and what each one informs. We translate those principles into deterministic checks rather than reproducing any single study.",
        },
      ]}
    >
      <p>
        Find Your AI Score turns your website into a single number from 0 to 100. This page explains
        exactly how that number is built, so nothing about the score is a black box.
      </p>

      <h2>The overall score</h2>
      <p>
        The overall score is a weighted average of seven components. Each component is scored from 0
        to 100 on its own, then combined using the weights below. The weights reflect how much each
        area tends to affect whether AI answer engines can use your site.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Weight</th>
              <th>What it measures</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENTS.map(([name, weight, desc]) => (
              <tr key={name}>
                <td>
                  <strong>{name}</strong>
                </td>
                <td>{weight}%</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The free preview shows all seven component scores and the overall number. The Premium audit
        adds the specific findings, the evidence behind each one, and a paste-ready fix.
      </p>

      <h2>The three readiness stages</h2>
      <p>
        Alongside the components, the report shows three diagnostic stages that map to what actually
        happens when an AI answer engine uses a page. These are derived from the components to help
        you see <em>where</em> in the pipeline you are weakest. They are shown separately and do{" "}
        <strong>not</strong> change the overall score.
      </p>
      <ol>
        <li>
          <strong>Retrieval readiness.</strong> Can a system find and correctly identify the right
          page for a question?
        </li>
        <li>
          <strong>Citation readiness.</strong> If the page is considered, is it trustworthy and
          specific enough to be used as a source?
        </li>
        <li>
          <strong>Answer extractability.</strong> Can a clean, correct answer be lifted out of the
          page?
        </li>
      </ol>

      <h2>How each point is earned</h2>
      <p>
        Every point traces back to something we observed on your pages. The engine crawls up to
        36 pages, extracts the visible text, structure and metadata, and applies a fixed set of
        rules. Three principles keep the score honest:
      </p>
      <ul>
        <li>
          <strong>Deterministic.</strong> The same site scored twice gives the same result. There is
          no AI grading and no randomness.
        </li>
        <li>
          <strong>Applicability-aware.</strong> A signal that does not apply to your type of site is
          excluded, not counted as zero, so you are not penalized for something irrelevant.
        </li>
        <li>
          <strong>Versioned.</strong> The scoring model has a version, so a score you got last month
          stays reproducible, and changes to the method are tracked rather than silent.
        </li>
      </ul>
      <p>
        Confidence is reported separately from the score. If the crawl was incomplete or a page
        could not be read, the report lowers confidence and can mark the result provisional, instead
        of pretending the site failed.
      </p>

      <h2>The research this builds on</h2>
      <p>
        The methodology is <strong>informed by peer-reviewed research</strong> on how generative
        AI systems retrieve, cite and answer from web content, together with open web standards
        such as Schema.org. We translate the principles that research establishes into
        deterministic, observable checks — we do not reproduce any single study, and none of these
        authors endorse this product. The three readiness stages above map directly onto how this
        literature separates retrieval from citation from extraction.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>What it informs</th>
            </tr>
          </thead>
          <tbody>
            {RESEARCH_BASIS.map((s) => (
              <tr key={s.url}>
                <td>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                  <br />
                  <span style={{ opacity: 0.7 }}>
                    {s.authors} · {s.venue} {s.year}
                  </span>
                </td>
                <td>{s.informs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Where the research is suggestive rather than conclusive, we stay conservative: a signal
        only enters the core score if we can observe it on your pages, measure it deterministically,
        explain it, and it is hard to game. Anything weaker is shown as a diagnostic, not scored.
      </p>

      <h2>What the score does and does not tell you</h2>
      <p>
        The score is a diagnostic of your website’s structural readiness for retrieval, citation and
        answer extraction. It is <strong>not</strong> a promise of rankings, traffic, or actual
        mentions in ChatGPT, Gemini, Perplexity or any other AI product. What you can control is how
        ready your site is to be read and quoted, and that is exactly what we measure.
      </p>
    </ArticleLayout>
  );
}
