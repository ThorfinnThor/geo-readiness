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
  {
    term: "AEO (Answer Engine Optimization)",
    slug: "aeo",
    def: "Another name for the same job as GEO: preparing a site so answer engines can use it. The two terms are used interchangeably, with AEO emphasising the answer and GEO the generative model producing it.",
    long: "There is no meaningful technical difference between AEO and GEO, and no standards body has separated them. Both describe making a page reachable, unambiguous and quotable so a model composing an answer has something concrete to lift. If a vendor insists the two are different disciplines requiring separate budgets, ask them which specific checks differ. In practice the work is one list: be crawlable, state facts plainly, mark them up, and back them with evidence.",
    related: ["geo", "seo", "ai-answer-engine"],
  },
  {
    term: "AI Overviews",
    slug: "ai-overviews",
    def: "Google's generated summary that appears above the ordinary results for many searches, built from pages Google has read. Sites named in it get the visibility that used to belong to the first blue link.",
    long: "An AI Overview is assembled from a handful of sources Google selects, and it answers the question on the results page itself. That changes what a good position is worth: a page ranked fourth but quoted in the overview can outperform the page ranked first that is not. The sites that get pulled in tend to state a specific fact plainly, near a heading that matches the question, on a page that loads without JavaScript gymnastics.",
    related: ["ai-answer-engine", "citation", "answer-extraction"],
  },
  {
    term: "llms.txt",
    slug: "llms-txt",
    def: "A plain-text file at the root of a site that lists its most important pages for large language models, in the way robots.txt lists crawl rules. It is a proposed convention, not a standard any engine is obliged to honour.",
    long: "The idea is to hand a model a short, curated map instead of making it infer one from your navigation. It costs almost nothing to publish and it cannot hurt, but be honest about the status: no major engine has committed to reading it, and it will not compensate for pages that are blocked, thin or contradictory. Treat it as a courtesy on top of a site that already works, never as a shortcut around one that does not.",
    related: ["robots-txt", "crawler", "retrieval"],
  },
  {
    term: "robots.txt",
    slug: "robots-txt",
    def: "A file at the root of your site telling automated visitors which paths they may fetch. Many AI crawlers respect it, so a careless rule here can quietly remove you from AI answers entirely.",
    long: "robots.txt is the bluntest instrument on your site: one wrong line can exclude everything. It is also where AI crawlers are handled specifically, since several announce their own user agents. Blocking them is a legitimate business decision, but it should be a decision, not an accident inherited from a template. If you want to be quoted, check that the agents you care about are allowed and that your sitemap is declared here.",
    related: ["crawler", "llms-txt", "technical-accessibility"],
  },
  {
    term: "JSON-LD",
    slug: "json-ld",
    def: "The format used to embed structured data in a page: a block of JSON in a script tag that states machine-readable facts about the page. It is the format Google recommends and the one this audit looks for.",
    long: "JSON-LD sits apart from your visible markup, which is why it is the practical choice: designers can change the layout without breaking the facts. What matters is that the facts are true and match what a reader sees. Schema claiming a price the page does not show, or a rating nobody left, is worse than no schema at all — it is the kind of contradiction that costs trust with both search engines and models.",
    related: ["structured-data", "entity-clarity", "trust-signals"],
  },
  {
    term: "Canonical URL",
    slug: "canonical-url",
    def: "The one address you declare as the real home of a piece of content, when the same content is reachable at several. Without it, machines have to guess which version to trust and quote.",
    long: "Duplicate addresses appear on their own: with and without www, with tracking parameters, with a trailing slash, in a print view. Each one splits the evidence for that page. A canonical tag consolidates them into a single address, which is exactly what a model needs when it decides which URL to cite. It is a small tag with a large effect on whether your strongest page reads as one strong page or four weak ones.",
    related: ["thin-content", "crawler", "retrieval"],
  },
  {
    term: "Knowledge graph",
    slug: "knowledge-graph",
    def: "A machine-held map of things and how they relate: this company, its products, its location, its people. Search engines and AI systems consult one to decide who you are before deciding whether to quote you.",
    long: "You do not edit a knowledge graph directly; you feed it. Consistent naming across your site, matching details in your schema, an imprint that agrees with your footer, and corroboration on independent sources are what turn a name into a recognised entity. Until that happens you are an ambiguous string, and ambiguous strings lose to competitors the machine is sure about.",
    related: ["entity-clarity", "structured-data", "trust-signals"],
  },
  {
    term: "E-E-A-T",
    slug: "e-e-a-t",
    def: "Experience, Expertise, Authoritativeness and Trust: Google's shorthand for the qualities its raters look for in a page. It is not a score you can read anywhere, but the underlying evidence is visible on your site.",
    long: "E-E-A-T is often discussed as if it were a hidden metric. It is better read as a checklist of things you either show or you do not: who wrote this, what they have actually done, whether anyone independent says so, and whether the business behind the page is identifiable and reachable. Those are the same things that make a page safe for a model to quote, which is why the work overlaps almost entirely with GEO.",
    related: ["trust-signals", "sourceability", "knowledge-graph"],
  },
  {
    term: "RAG (retrieval-augmented generation)",
    slug: "rag",
    def: "The standard way answer engines work: fetch relevant documents first, then write an answer from them. It is the reason your page content, not the model's training, decides whether you are quoted today.",
    long: "In a RAG system the model does not answer from memory. A retrieval step finds candidate passages, and the model writes using those. That has a practical consequence worth internalising: your pages compete at the retrieval step, before any writing happens. A page the retriever never returns cannot be cited no matter how good it is, which is why accessibility and clear, self-contained passages matter more than polish.",
    related: ["retrieval", "chunking", "grounding"],
  },
  {
    term: "Chunking",
    slug: "chunking",
    def: "The splitting of a page into smaller passages before a machine indexes it. Each passage is judged on its own, so a fact that only makes sense with the rest of the page around it often loses.",
    long: "Chunking is why long, meandering pages underperform their content. If the answer to a question is spread across three paragraphs, an introduction and a table, no single chunk contains it. The fix is not shorter pages, it is self-contained sections: a heading that states the question, and an answer directly beneath it that stands up when read alone.",
    related: ["answer-extraction", "rag", "sourceability"],
  },
  {
    term: "Embedding",
    slug: "embedding",
    def: "A numerical representation of a passage's meaning, used to match a question against your content. It is why a page can be retrieved for a question that uses none of its exact words.",
    long: "Embeddings mean keyword matching is no longer the whole game: a page about “winter tyre pressure” can surface for “how hard should my tyres be when it is cold”. The practical lesson is the opposite of keyword stuffing. Write the way your customers actually ask, cover the meaning fully, and stop contorting sentences around a phrase — the match happens on sense, not on spelling.",
    related: ["retrieval", "rag", "prompt-coverage"],
  },
  {
    term: "Prompt coverage",
    slug: "prompt-coverage",
    def: "How much of what people actually ask about your kind of business your pages answer. A gap in coverage is a question where an AI system has to use somebody else's site.",
    long: "Coverage is measured by generating the questions a buyer would put to an answer engine about a business like yours, then checking, page by page, whether you answer them. It is the most actionable signal in an audit because every gap names a specific missing page or paragraph. It is also the one most sites are worst at: they describe what they sell, and never answer what people ask before buying it.",
    related: ["embedding", "answer-extraction", "readiness-score"],
  },
  {
    term: "Grounding",
    slug: "grounding",
    def: "Tying a generated answer to real source documents rather than the model's own recollection. Grounded answers carry links, which is where your citation comes from.",
    long: "Grounding is the mechanism behind the little source links under an AI answer. It also explains a frustration site owners report: an engine describing your business wrongly. If nothing on your site states the fact plainly, there is nothing to ground on, and the model falls back on inference. Publishing the fact clearly, in text, is the only reliable correction.",
    related: ["citation", "hallucination", "rag"],
  },
  {
    term: "First-party content",
    slug: "first-party-content",
    def: "Information only you can supply: your prices, your process, your data, your cases. It is the material an answer engine has a reason to quote, because it exists nowhere else.",
    long: "Rewritten industry background competes with a thousand identical pages and wins none of them. First-party content has no competition by definition. A price range, a real project with numbers, the conditions under which you decline a job — these are the passages that get lifted, because a model looking for a specific answer finds it only on your page.",
    related: ["sourceability", "thin-content", "trust-signals"],
  },
  {
    term: "Client-side rendering",
    slug: "client-side-rendering",
    def: "Building the page in the visitor's browser with JavaScript instead of sending finished HTML. Crawlers that do not run scripts see an empty shell where your content should be.",
    long: "Plenty of AI crawlers fetch raw HTML and never execute JavaScript. If your content only exists after the scripts run, those crawlers see a blank page and move on — and you will not get an error, just silence. Testing this is easy: fetch your own page without JavaScript and read what comes back. Whatever is missing is invisible to a meaningful share of the machines you are trying to reach.",
    related: ["technical-accessibility", "crawler", "retrieval"],
  },
  {
    term: "Technical accessibility",
    slug: "technical-accessibility",
    def: "Whether a machine can fetch and read your page at all: status codes, response speed, robots rules and content that exists without JavaScript. It is the precondition for every other signal.",
    long: "This is the least glamorous signal and the one that most often explains a bad result outright. A page behind a blocked path, a slow response, a redirect chain or a script-only render is not judged harshly by an answer engine; it is simply never considered. Fixing accessibility rarely improves anything by itself, but nothing else you fix counts until it is right.",
    related: ["client-side-rendering", "robots-txt", "crawler"],
  },
];

export function glossaryTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}
