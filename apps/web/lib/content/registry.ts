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
      "Generative Engine Optimization (GEO) is making your website easy for AI answer " +
      "engines to find, trust and quote. Here is what that means for your business — in plain language.",
    category: "Explainer",
    updated: "2026-08-21",
  },
  {
    slug: "/how-ai-reads-your-website",
    title: "How AI answer engines read your website",
    description:
      "ChatGPT, Gemini and Perplexity do not browse like a person. They fetch pages, " +
      "extract facts and decide what to quote. Here is what actually happens to your site — and why it matters.",
    category: "Explainer",
    updated: "2026-08-21",
  },
  {
    slug: "/geo-vs-seo",
    title: "GEO vs SEO: what is the difference?",
    description:
      "SEO gets your page ranked. GEO gets your facts quoted in an AI answer. They overlap, " +
      "but they are not the same job. A plain-language comparison for business owners.",
    category: "Comparison",
    updated: "2026-08-21",
  },
  {
    slug: "/glossary",
    title: "GEO & AI search glossary",
    description:
      "Clear, jargon-free definitions of the terms behind AI search readiness — from " +
      "answer extraction to structured data — so the rest of it actually makes sense.",
    category: "Reference",
    updated: "2026-08-21",
  },

  // Actionable guides — one per readiness component the audit scores.
  {
    slug: "/guides/entity-clarity",
    title: "Entity Clarity: make it obvious who your business is",
    description:
      "AI systems leave you out of specific, local and branded answers when it is unclear what " +
      "your business is called, what it does and where it operates. Here is how to fix that.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/offer-clarity",
    title: "Offer Clarity: state what you sell, plainly",
    description:
      "If your products, services and prices are vague or trapped in images, an AI cannot " +
      "recommend them. Make your offer unmistakable to both people and machines.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/prompt-coverage",
    title: "Prompt Coverage: answer the questions customers actually ask",
    description:
      "AI answers specific questions. If no page clearly addresses one, a competitor's page does. " +
      "Here is how to find and cover the questions that matter for your business.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/sourceability",
    title: "Sourceability: make your content quotable by AI",
    description:
      "To be quoted, your pages need concrete facts, attributed claims and extractable structure " +
      "— not vague marketing copy. Here is how to write content an AI can actually lift.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/structured-data",
    title: "Structured Data: stop making machines guess",
    description:
      "Structured data spells out your facts in a machine-readable format so AI does not have to " +
      "guess who you are. A plain-language guide to adding it — no coding degree required.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/evidence-and-trust",
    title: "Evidence & Trust: show you are a real, accountable business",
    description:
      "AI favors accountable pages over anonymous ones. Here are the trust signals to add — " +
      "about, contact, evidence — most of which you already have the content for.",
    category: "Guide",
    updated: "2026-08-21",
  },
  {
    slug: "/guides/technical-accessibility",
    title: "Technical Accessibility: make sure machines can read your site at all",
    description:
      "The best content is worthless if a machine cannot fetch or read it. Here is how to make " +
      "sure your pages are reachable, server-visible and not accidentally blocking AI.",
    category: "Guide",
    updated: "2026-08-21",
  },
];

export function contentByCategory(): Record<ContentCategory, ContentEntry[]> {
  const out = { Explainer: [], Comparison: [], Guide: [], Reference: [] } as Record<
    ContentCategory,
    ContentEntry[]
  >;
  for (const e of CONTENT) out[e.category].push(e);
  return out;
}
