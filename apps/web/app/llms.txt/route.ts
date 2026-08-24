import { contentByCategory, type ContentCategory } from "@/lib/content/registry";
import { SITE, absoluteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

// /llms.txt — the llmstxt.org convention: a plain-markdown map of the site for
// AI answer engines. Generated from the same registry that drives the sitemap,
// so it never drifts. Fitting for a product about being readable to AI: we
// publish exactly the extractable, self-describing index we tell others to.
const ORDER: ContentCategory[] = ["Explainer", "Comparison", "Guide", "Reference"];
const HEADING: Record<ContentCategory, string> = {
  Explainer: "Explainers",
  Comparison: "Comparisons",
  Guide: "Guides",
  Reference: "Reference",
};

export function GET(): Response {
  const byCategory = contentByCategory();
  const sections = ORDER.filter((c) => byCategory[c].length > 0)
    .map((c) => {
      const items = byCategory[c]
        .map((e) => `- [${e.title}](${absoluteUrl(e.slug)}): ${e.description}`)
        .join("\n");
      return `## ${HEADING[c]}\n\n${items}`;
    })
    .join("\n\n");

  const body = `# ${SITE.name}

> ${SITE.description}

Find Your AI Score runs a free readiness scan that reads a website the way an AI
answer engine does and scores seven signals: entity clarity, offer clarity,
prompt coverage, sourceability, structured data, evidence and trust, and
technical accessibility. It measures readiness to be found, trusted and quoted;
it does not call any AI provider and does not claim or guarantee AI mentions.

- Home: ${SITE.url}
- Pricing: ${absoluteUrl("/pricing")}
- Learn hub: ${absoluteUrl("/learn")}
- Contact: ${SITE.email}

${sections}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
