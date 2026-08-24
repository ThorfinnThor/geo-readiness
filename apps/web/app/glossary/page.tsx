import { ArticleLayout } from "@/components/content/ArticleLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";
import { absoluteUrl } from "@/lib/seo/site";

const meta = CONTENT.find((c) => c.slug === "/glossary")!;

export const metadata = contentMetadata(meta.slug);

const TERMS: { term: string; id: string; def: string }[] = [
  {
    term: "AI answer engine",
    id: "ai-answer-engine",
    def: "A tool that answers a question with written text instead of a list of links, such as ChatGPT, Gemini, Perplexity or Google's AI overviews. It builds its answer partly from information it reads on websites.",
  },
  {
    term: "GEO (Generative Engine Optimization)",
    id: "geo",
    def: "The work of making your website easy for AI answer engines to find, trust and quote. The goal is not to rank a link, but to have your facts used inside an AI-generated answer.",
  },
  {
    term: "SEO (Search Engine Optimization)",
    id: "seo",
    def: "The work of getting your pages to rank well in traditional search results. GEO and SEO share many fundamentals but aim at different finish lines.",
  },
  {
    term: "Retrieval",
    id: "retrieval",
    def: "The step where a system finds and fetches your page. If a page is blocked, unreachable, or clearly not about the topic asked, it is never retrieved, and nothing else matters.",
  },
  {
    term: "Citation",
    id: "citation",
    def: "When an AI answer credits or quotes your page as a source. To be cited, your claims usually need to be specific and backed by identifiable evidence the system trusts.",
  },
  {
    term: "Answer extraction",
    id: "answer-extraction",
    def: "The step where the system lifts a specific fact from your page into its answer, like a price, a definition, a step or a yes or no. Content written as clear, self-contained statements extracts cleanly. Vague copy does not.",
  },
  {
    term: "Structured data (schema)",
    id: "structured-data",
    def: "Hidden labels in your page's code that state facts in a machine-readable format, for example that a block of text is your business's name, address and phone number. It removes guesswork for machines.",
  },
  {
    term: "Entity clarity",
    id: "entity-clarity",
    def: "How obvious it is what your business is called, what it does and where it operates. Low entity clarity means AI systems leave you out of specific, local or branded answers.",
  },
  {
    term: "Sourceability",
    id: "sourceability",
    def: "How usable your content is as a source. It asks whether there are concrete facts and figures, attributed claims, and information laid out in extractable structures like tables and lists.",
  },
  {
    term: "Crawler (bot)",
    id: "crawler",
    def: "An automated program that fetches web pages. Search engines and AI systems use crawlers to read the web. Crawlers read the raw page and often do not run all of a site's scripts.",
  },
  {
    term: "Thin content and doorway pages",
    id: "thin-content",
    def: "Mass-produced pages with little unique value, for example the same page repeated with only a city name swapped. Search engines demote these, and AI systems ignore them. The fix is genuine, unique content per page, not cosmetic variation.",
  },
  {
    term: "Hallucination",
    id: "hallucination",
    def: "When an AI system states something confidently that is wrong or made up. Clear, specific, well-sourced pages reduce the chance a system guesses wrongly about your business.",
  },
  {
    term: "Trust signals",
    id: "trust-signals",
    def: "Checkable evidence that you are a real, accountable business. This includes an about page, contact and legal details, references or case studies, and claims backed by sources. AI systems favor accountable pages over anonymous ones.",
  },
  {
    term: "Readiness score",
    id: "readiness-score",
    def: "A measurement of how prepared your website is to be read, trusted and quoted by AI systems. It is a diagnostic of your site's readiness. It is not a promise of rankings, traffic or actual AI mentions.",
  },
];

// DefinedTermSet is the schema built for a glossary: each term becomes an
// addressable, extractable definition an AI engine can lift — the sourceability
// signal the audit itself scores.
const glossaryJsonLd = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "GEO and AI search glossary",
  url: absoluteUrl("/glossary"),
  hasDefinedTerm: TERMS.map((t) => ({
    "@type": "DefinedTerm",
    "@id": absoluteUrl(`/glossary#${t.id}`),
    name: t.term,
    description: t.def,
    url: absoluteUrl(`/glossary#${t.id}`),
    inDefinedTermSet: absoluteUrl("/glossary"),
  })),
};

export default function Page() {
  return (
    <ArticleLayout
      title="GEO and AI search glossary"
      description="Clear, jargon-free definitions of the terms behind AI search readiness, from answer extraction to structured data, so the rest of it actually makes sense."
      category="Reference"
      updated={meta.updated}
      path={meta.slug}
    >
      <JsonLd data={glossaryJsonLd} />
      <p>
        The world of AI search comes with its own vocabulary. Here are the terms that matter,
        explained in plain language for business owners, with no computer-science degree required.
      </p>
      {TERMS.map((t) => (
        <div key={t.id}>
          <h2 id={t.id}>{t.term}</h2>
          <p>{t.def}</p>
        </div>
      ))}
    </ArticleLayout>
  );
}
