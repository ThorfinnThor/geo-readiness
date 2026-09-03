// Registry of published content pages. Drives the /learn hub and the sitemap so
// adding a page is a one-line change here plus its route file. Only list pages
// that actually exist (no links to 404s).

export type ContentCategory = "Explainer" | "Comparison" | "Guide" | "Reference";

export interface ContentEntry {
  slug: string; // site-relative path, e.g. "/what-is-geo"
  title: string;
  description: string;
  category: ContentCategory;
  updated: string; // ISO date
}

export const CONTENT: ContentEntry[] = [
  {
    slug: "/what-is-geo",
    title: "What is GEO? AI Search Readiness explained",
    description:
      "Generative Engine Optimization (GEO) means making your website easy for AI answer " +
      "engines to find, trust and quote. Here is what that means for your business, in plain language.",
    category: "Explainer",
    updated: "2026-08-21",
  },
  {
    slug: "/methodology",
    title: "How scoring works",
    description:
      "How Find Your AI Score turns your website into a 0 to 100 readiness score: the seven " +
      "weighted components, the three readiness stages, and the deterministic, versioned rules " +
      "behind every point.",
    category: "Reference",
    updated: "2026-08-26",
  },
  {
    slug: "/how-ai-reads-your-website",
    title: "How AI answer engines read your website",
    description:
      "ChatGPT, Gemini and Perplexity do not browse like a person. They fetch pages, extract " +
      "facts and decide what to quote. Here is what actually happens to your site, and why it matters.",
    category: "Explainer",
    updated: "2026-08-21",
  },
  {
    slug: "/geo-vs-seo",
    title: "GEO vs SEO. What is the difference?",
    description:
      "SEO gets your page ranked. GEO gets your facts quoted in an AI answer. They overlap, but " +
      "they are not the same job. A plain-language comparison for business owners.",
    category: "Comparison",
    updated: "2026-08-21",
  },
  {
    slug: "/glossary",
    title: "GEO and AI search glossary",
    description:
      "Clear, jargon-free definitions of the terms behind AI search readiness, from answer " +
      "extraction to structured data, so the rest of it actually makes sense.",
    category: "Reference",
    updated: "2026-08-21",
  },

  // Actionable guides, one per readiness component the audit scores.
  {
    slug: "/guides/entity-clarity",
    title: "Entity Clarity. Make it obvious who your business is",
    description:
      "AI systems leave you out of specific, local and branded answers when it is unclear what " +
      "your business is called, what it does and where it operates. Here is how to fix that.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/offer-clarity",
    title: "Offer Clarity. State what you sell, plainly",
    description:
      "If your products, services and prices are vague or trapped in images, an AI cannot " +
      "recommend them. Make your offer unmistakable to both people and machines.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/prompt-coverage",
    title: "Prompt Coverage. Answer the questions customers actually ask",
    description:
      "AI answers specific questions. If no page clearly addresses one, a competitor's page does. " +
      "Here is how to find and cover the questions that matter for your business.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/sourceability",
    title: "Sourceability. Make your content quotable by AI",
    description:
      "To be quoted, your pages need concrete facts, attributed claims and extractable structure, " +
      "not vague marketing copy. Here is how to write content an AI can actually lift.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/structured-data",
    title: "Structured Data. Stop making machines guess",
    description:
      "Structured data spells out your facts in a machine-readable format so AI does not have to " +
      "guess who you are. A plain-language guide to adding it, no coding degree required.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/evidence-and-trust",
    title: "Evidence and Trust. Show you are a real, accountable business",
    description:
      "AI favors accountable pages over anonymous ones. Here are the trust signals to add, like " +
      "about, contact and evidence, most of which you already have the content for.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/technical-accessibility",
    title: "Technical Accessibility. Make sure machines can read your site at all",
    description:
      "The best content is worthless if a machine cannot fetch or read it. Here is how to make " +
      "sure your pages are reachable, server-visible and not accidentally blocking AI.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/for",
    title: "AI search readiness by site type",
    description:
      "The audit asks a comparison site different questions than a local business or a one-pager. " +
      "What that means for each kind of site: the questions, what the audit reads, and the " +
      "failure modes that keep coming back.",
    category: "Reference",
    updated: "2026-09-03",
  },
  {
    slug: "/faq",
    title: "Frequently asked questions",
    description:
      "What the audit measures, what it deliberately does not, why it makes no AI-provider calls, " +
      "and how to read the result. Straight answers, including the uncomfortable ones.",
    category: "Reference",
    updated: "2026-09-03",
  },
];

// Maps a readiness component (by its key in the report) to the guide that
// explains how to improve it. Used to link the report back into the content.
export const COMPONENT_GUIDE: Record<string, string> = {
  entity_clarity: "/guides/entity-clarity",
  offer_clarity: "/guides/offer-clarity",
  prompt_coverage: "/guides/prompt-coverage",
  sourceability: "/guides/sourceability",
  structured_data: "/guides/structured-data",
  evidence_trust: "/guides/evidence-and-trust",
  technical_access: "/guides/technical-accessibility",
};

export function contentByCategory(): Record<ContentCategory, ContentEntry[]> {
  const out = { Explainer: [], Comparison: [], Guide: [], Reference: [] } as Record<
    ContentCategory,
    ContentEntry[]
  >;
  for (const e of CONTENT) out[e.category].push(e);
  return out;
}
