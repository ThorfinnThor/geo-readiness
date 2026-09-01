// Glossary source of truth. Each term is its own indexable page at
// /glossary/<slug>, plus the /glossary index. `def` is the one-line definition
// (also used on the index); `long` adds genuine, unique substance so each page
// stands on its own and is not thin/doorway content; `related` drives internal
// links between term pages.
export interface GlossaryTerm {
  term: string;
  slug: string;
  def: string;
  long: string;
  related: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "AI answer engine",
    slug: "ai-answer-engine",
    def: "A tool that answers a question with written text instead of a list of links, such as ChatGPT, Gemini, Perplexity or Google's AI overviews. It builds its answer partly from information it reads on websites.",
    long: "Unlike a search engine that returns ten blue links, an answer engine composes one written response and decides for itself which pages to read and quote. That moves the goal from ranking a link to being one of the few sources the model actually pulls facts from. If your pages are slow to fetch, blocked, or vague, the engine simply assembles its answer from someone else.",
    related: ["geo", "retrieval", "citation"],
  },
  {
    term: "GEO (Generative Engine Optimization)",
    slug: "geo",
    def: "The work of making your website easy for AI answer engines to find, trust and quote. The goal is not to rank a link, but to have your facts used inside an AI-generated answer.",
    long: "GEO covers everything that makes your facts usable inside a generated answer: being reachable, being unambiguous about who you are, stating claims plainly, and backing them with evidence a model trusts. It overlaps with SEO on fundamentals like crawlability and clean structure, but the finish line is a citation inside an answer, not a position on a results page. A readiness score measures how close a site is to that.",
    related: ["seo", "readiness-score", "sourceability"],
  },
  {
    term: "SEO (Search Engine Optimization)",
    slug: "seo",
    def: "The work of getting your pages to rank well in traditional search results. GEO and SEO share many fundamentals but aim at different finish lines.",
    long: "SEO optimizes for a ranked list of links, where clicks and backlinks carry a lot of weight. GEO reuses the same technical groundwork — reachable pages, clean structure, clear entities — but adds a heavier emphasis on extractable, well-sourced statements. A site can rank well and still be a weak source for an answer engine, and closing that gap is the point of GEO.",
    related: ["geo", "retrieval", "structured-data"],
  },
  {
    term: "Retrieval",
    slug: "retrieval",
    def: "The step where a system finds and fetches your page. If a page is blocked, unreachable, or clearly not about the topic asked, it is never retrieved, and nothing else matters.",
    long: "Retrieval is the first gate: before a model can trust or quote a page, it has to fetch and read it. A robots rule, an aggressive bot filter, or content that only appears after heavy JavaScript can all leave the crawler with an empty or missing page. This is why technical accessibility is scored first — everything downstream depends on it.",
    related: ["crawler", "citation", "answer-extraction"],
  },
  {
    term: "Citation",
    slug: "citation",
    def: "When an AI answer credits or quotes your page as a source. To be cited, your claims usually need to be specific and backed by identifiable evidence the system trusts.",
    long: "A citation is the payoff of GEO: the model not only read your page but chose it as the source worth naming. Specific, verifiable claims — numbers, dates, named sources — are cited far more often than broad marketing copy. Trust signals like a real about page, contact details and references raise the odds a model is willing to attribute an answer to you.",
    related: ["trust-signals", "sourceability", "ai-answer-engine"],
  },
  {
    term: "Answer extraction",
    slug: "answer-extraction",
    def: "The step where the system lifts a specific fact from your page into its answer, like a price, a definition, a step or a yes or no. Content written as clear, self-contained statements extracts cleanly. Vague copy does not.",
    long: "Extraction rewards writing that answers a question in one place, in plain words, without needing the surrounding page for context. A sentence like \"Our 8.4 kW systems offset about 92% of a typical home's annual use\" extracts cleanly; \"industry-leading efficiency\" gives a model nothing to lift. Tables, lists and direct question-and-answer phrasing all make extraction easier.",
    related: ["sourceability", "structured-data", "citation"],
  },
  {
    term: "Structured data (schema)",
    slug: "structured-data",
    def: "Hidden labels in your page's code that state facts in a machine-readable format, for example that a block of text is your business's name, address and phone number. It removes guesswork for machines.",
    long: "Structured data (usually JSON-LD) states facts in a format machines read directly, instead of inferring them from layout. Organization, Product, Service, FAQ and Article schema tell a model exactly who you are and what you offer, which reduces mistakes and hallucinations. It is one of the seven signals the readiness score checks, because it turns implicit facts into explicit, extractable ones.",
    related: ["entity-clarity", "sourceability", "answer-extraction"],
  },
  {
    term: "Entity clarity",
    slug: "entity-clarity",
    def: "How obvious it is what your business is called, what it does and where it operates. Low entity clarity means AI systems leave you out of specific, local or branded answers.",
    long: "Entity clarity is whether a machine can pin down, unambiguously, who you are — your name, what you do, and where you operate. When those facts are scattered, implied or inconsistent across pages, a model hedges and leaves you out of specific or local answers. A clear business name, consistent details, and Organization schema all raise it.",
    related: ["structured-data", "trust-signals", "geo"],
  },
  {
    term: "Sourceability",
    slug: "sourceability",
    def: "How usable your content is as a source. It asks whether there are concrete facts and figures, attributed claims, and information laid out in extractable structures like tables and lists.",
    long: "Sourceability is the difference between a page a model can quote and one it can only skim. Concrete figures, attributed claims and information laid out in tables or lists give an engine something specific to lift; generic prose does not. It is one of the strongest levers on whether your facts end up inside an answer.",
    related: ["answer-extraction", "citation", "trust-signals"],
  },
  {
    term: "Crawler (bot)",
    slug: "crawler",
    def: "An automated program that fetches web pages. Search engines and AI systems use crawlers to read the web. Crawlers read the raw page and often do not run all of a site's scripts.",
    long: "A crawler fetches the raw HTML your server returns, and many crawlers do not run all of your JavaScript. If your headline, prices or copy are only assembled by scripts in the browser, a crawler can see an almost empty page. Server-rendered or static content, and a robots.txt that does not block your real pages, keep crawlers able to read you.",
    related: ["retrieval", "structured-data", "thin-content"],
  },
  {
    term: "Thin content and doorway pages",
    slug: "thin-content",
    def: "Mass-produced pages with little unique value, for example the same page repeated with only a city name swapped. Search engines demote these, and AI systems ignore them. The fix is genuine, unique content per page, not cosmetic variation.",
    long: "Thin or doorway pages are churned out at scale with barely any unique value — the same template with a city or keyword swapped. Search engines demote them and answer engines ignore them, because there is nothing specific worth quoting. The fix is never more near-duplicate pages; it is genuine, distinct content on each page that earns its place.",
    related: ["sourceability", "crawler", "readiness-score"],
  },
  {
    term: "Hallucination",
    slug: "hallucination",
    def: "When an AI system states something confidently that is wrong or made up. Clear, specific, well-sourced pages reduce the chance a system guesses wrongly about your business.",
    long: "A hallucination is a confident but wrong statement a model invents when it lacks a solid source. When your own pages are vague or contradictory, a model is more likely to fill the gap with a guess about your business. Clear, specific, structured facts give it something real to rely on instead, which is one reason entity clarity and structured data matter.",
    related: ["entity-clarity", "structured-data", "trust-signals"],
  },
  {
    term: "Trust signals",
    slug: "trust-signals",
    def: "Checkable evidence that you are a real, accountable business. This includes an about page, contact and legal details, references or case studies, and claims backed by sources. AI systems favor accountable pages over anonymous ones.",
    long: "Trust signals are the checkable evidence that a real, accountable business stands behind a page: an about page, contact and legal details, named references, and claims backed by sources. Answer engines lean toward accountable pages because attributing an answer to an anonymous site is risky. Adding this evidence is often the difference between being read and being cited.",
    related: ["citation", "entity-clarity", "sourceability"],
  },
  {
    term: "Readiness score",
    slug: "readiness-score",
    def: "A measurement of how prepared your website is to be read, trusted and quoted by AI systems. It is a diagnostic of your site's readiness. It is not a promise of rankings, traffic or actual AI mentions.",
    long: "A readiness score condenses seven signals — from technical accessibility to evidence and trust — into a single 0 to 100 diagnostic of how ready your site is to be found, trusted and quoted. It is deterministic: the same site scores the same way every time, and every point traces back to something observed on your pages. It measures readiness, not outcomes — no tool controls what an AI system ultimately says.",
    related: ["geo", "sourceability", "trust-signals"],
  },
];

export function glossaryTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}
