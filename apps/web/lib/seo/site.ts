// Central SEO/site config. One source of truth for canonical URL, names, and
// the structured-data identity used across pages.

export const SITE = {
  name: "GEO AI Search Readiness",
  shortName: "geo/readiness",
  // Production URL. Override per environment via NEXT_PUBLIC_APP_URL.
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "https://geo-readiness-web.vercel.app").replace(
    /\/$/,
    "",
  ),
  description:
    "A deterministic, evidence-based audit of how ready your website is for AI answer " +
    "engines and search — retrieval, citation and answer extraction. No AI-provider calls.",
  locale: "en_US",
} as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Organization + WebSite JSON-LD for the site identity (rendered once, in layout). */
export function siteJsonLd(): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
    },
  ];
}
