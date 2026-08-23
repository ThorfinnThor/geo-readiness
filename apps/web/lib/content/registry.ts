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
];

export function contentByCategory(): Record<ContentCategory, ContentEntry[]> {
  const out = { Explainer: [], Comparison: [], Guide: [], Reference: [] } as Record<
    ContentCategory,
    ContentEntry[]
  >;
  for (const e of CONTENT) out[e.category].push(e);
  return out;
}
