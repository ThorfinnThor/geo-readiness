// The AI crawler reference. Every user-agent token here was taken from the
// vendor's own documentation (linked per company in SOURCES) rather than from
// a blog post, because the whole value of this page is that the strings are
// right — a typo'd token in a robots.txt rule silently does nothing.
//
// Verified 2026-09-05. Vendors add and rename bots, so this needs re-checking;
// each row carries its source so that is a five-minute job.

export type CrawlerPurpose = "search" | "training" | "user" | "ads";

export interface Crawler {
  /** The exact robots.txt user-agent token. Case matters to some parsers. */
  token: string;
  company: string;
  purpose: CrawlerPurpose;
  what: string;
  /** Whether the vendor states it obeys robots.txt. */
  obeysRobots: boolean;
  /** Only where the vendor makes a claim worth quoting back at the reader. */
  note?: string;
}

export const PURPOSE_LABEL: Record<CrawlerPurpose, string> = {
  search: "Search & answers",
  training: "Model training",
  user: "User-triggered fetch",
  ads: "Ad verification",
};

export const PURPOSE_BLURB: Record<CrawlerPurpose, string> = {
  search:
    "These decide whether you can appear in an AI answer at all. Blocking one removes you from that product's results.",
  training:
    "These collect content that may be used to train models. Blocking them is a rights and licensing decision; it does not remove you from search or answers.",
  user:
    "These fetch a page because a person asked about it right now. Two of them state outright that they do not follow robots.txt, because a human initiated the request.",
  ads: "These check pages submitted as advertisements. Only relevant if you advertise on that platform.",
};

export const CRAWLERS: Crawler[] = [
  // --- OpenAI -----------------------------------------------------------
  {
    token: "OAI-SearchBot",
    company: "OpenAI",
    purpose: "search",
    what: "Surfaces websites in ChatGPT's search features.",
    obeysRobots: true,
    note: "This is the one that decides whether you can show up in ChatGPT search results. Block it and you are out.",
  },
  {
    token: "GPTBot",
    company: "OpenAI",
    purpose: "training",
    what: "Crawls content that may be used to train OpenAI's foundation models.",
    obeysRobots: true,
    note: "The bot most often blocked by mistake in place of OAI-SearchBot. Blocking GPTBot does not affect ChatGPT search.",
  },
  {
    token: "ChatGPT-User",
    company: "OpenAI",
    purpose: "user",
    what: "Fetches a page live when a person or a custom GPT asks about it.",
    obeysRobots: false,
    note: "OpenAI states this does not follow robots.txt, because the action is initiated by a user rather than by a crawl.",
  },
  {
    token: "OAI-AdsBot",
    company: "OpenAI",
    purpose: "ads",
    what: "Validates the safety of pages submitted as ads on ChatGPT.",
    obeysRobots: true,
  },
  // --- Anthropic --------------------------------------------------------
  {
    token: "Claude-SearchBot",
    company: "Anthropic",
    purpose: "search",
    what: "Analyses content to improve the relevance and accuracy of search results in Claude.",
    obeysRobots: true,
  },
  {
    token: "ClaudeBot",
    company: "Anthropic",
    purpose: "training",
    what: "Collects web content that may contribute to training Anthropic's models.",
    obeysRobots: true,
  },
  {
    token: "Claude-User",
    company: "Anthropic",
    purpose: "user",
    what: "Accesses a page when a Claude user asks a question that needs it.",
    obeysRobots: true,
    note: "Unlike its OpenAI and Perplexity equivalents, Anthropic states this one does honour robots.txt.",
  },
  // --- Perplexity -------------------------------------------------------
  {
    token: "PerplexityBot",
    company: "Perplexity",
    purpose: "search",
    what: "Surfaces and links websites in Perplexity's results.",
    obeysRobots: true,
    note: "Perplexity states this is not used for model training.",
  },
  {
    token: "Perplexity-User",
    company: "Perplexity",
    purpose: "user",
    what: "Visits pages to answer a question a user just asked.",
    obeysRobots: false,
    note: "Perplexity states this generally ignores robots.txt, because a user initiated the request.",
  },
  // --- Google -----------------------------------------------------------
  {
    token: "Google-Extended",
    company: "Google",
    purpose: "training",
    what:
      "Controls whether your content trains Gemini models and grounds their answers. Not a crawler of its own.",
    obeysRobots: true,
    note: "Google states this has no effect on inclusion in Google Search and is not a ranking signal.",
  },
  // --- Apple ------------------------------------------------------------
  {
    token: "Applebot",
    company: "Apple",
    purpose: "search",
    what: "Powers search in Spotlight, Siri and Safari.",
    obeysRobots: true,
  },
  {
    token: "Applebot-Extended",
    company: "Apple",
    purpose: "training",
    what: "Opts your content out of training Apple's generative models.",
    obeysRobots: true,
    note: "Apple states it does not crawl pages at all, and that disallowing it leaves you in Spotlight, Siri and Safari results.",
  },
  // --- Common Crawl -----------------------------------------------------
  {
    token: "CCBot",
    company: "Common Crawl",
    purpose: "training",
    what:
      "Builds the open Common Crawl corpus, which many model builders use as a training source.",
    obeysRobots: true,
    note: "Blocking it reaches further than one vendor, since the corpus is public and widely reused.",
  },
];

export const SOURCES: { company: string; url: string }[] = [
  { company: "OpenAI", url: "https://developers.openai.com/api/docs/bots" },
  {
    company: "Anthropic",
    url: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler",
  },
  { company: "Perplexity", url: "https://docs.perplexity.ai/guides/bots" },
  {
    company: "Google",
    url: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
  },
  { company: "Apple", url: "https://support.apple.com/en-us/119829" },
  { company: "Common Crawl", url: "https://commoncrawl.org/ccbot" },
];

export const VERIFIED_ON = "2026-09-05";

export function crawlersByPurpose(purpose: CrawlerPurpose): Crawler[] {
  return CRAWLERS.filter((c) => c.purpose === purpose);
}

/** A robots.txt block for a set of tokens, as a copy-paste snippet. */
export function robotsSnippet(tokens: string[], rule: "Allow: /" | "Disallow: /"): string {
  return tokens.map((t) => `User-agent: ${t}\n${rule}`).join("\n\n");
}
