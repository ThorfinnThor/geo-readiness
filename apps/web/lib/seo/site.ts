// Central SEO/site config. One source of truth for canonical URL, names, and
// the structured-data identity used across pages.

export const SITE = {
  name: "Find Your AI Score",
  shortName: "findyouraiscore",
  // Production URL. Override per environment via NEXT_PUBLIC_APP_URL.
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "https://findyouraiscore.com").replace(/\/$/, ""),
  // Contact address used in the imprint / privacy pages.
  email: "info@findyouraiscore.com",
  description:
    "A deterministic, evidence-based audit of how ready your website is for AI answer " +
    "engines and search across retrieval, citation and answer extraction. No AI-provider calls.",
  locale: "en_US",
} as const;

// Single source of truth for the full-audit price, shared by the pricing page
// and the Offer structured data so schema can never contradict visible content.
export const FULL_AUDIT_PRICE_EUR = Number(process.env.GEO_FULL_AUDIT_PRICE_EUR ?? "4.99");

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

const ORG_ID = `${SITE.url}/#organization`;

/**
 * Organization + WebSite + Service JSON-LD for the site identity (rendered once,
 * in layout). The Organization carries real, verifiable contact/identity; the
 * Service states the single offering with its two real price tiers. Everything
 * here matches visible content (the pricing page) — no invented facts.
 */
export function siteJsonLd(): Record<string, unknown>[] {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    logo: absoluteUrl("/icon.svg"),
    contactPoint: {
      "@type": "ContactPoint",
      email: SITE.email,
      contactType: "customer support",
      availableLanguage: ["en", "de"],
    },
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    publisher: { "@id": ORG_ID },
  };
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE.url}/#service`,
    name: "AI Search Readiness Audit",
    serviceType: "Generative Engine Optimization (GEO) audit",
    provider: { "@id": ORG_ID },
    url: SITE.url,
    areaServed: "Worldwide",
    audience: {
      "@type": "Audience",
      audienceType: "Website owners, marketers and SEO teams",
    },
    description:
      "A deterministic audit that reads a website the way an AI answer engine does and scores " +
      "seven readiness signals, with a prioritized list of fixes. It does not call any AI " +
      "provider and does not guarantee AI mentions.",
    offers: [
      {
        "@type": "Offer",
        name: "Free preview",
        price: "0",
        priceCurrency: "EUR",
        url: absoluteUrl("/pricing"),
        description:
          "Overall readiness score, all seven component scores and a confidence rating. No account needed.",
      },
      {
        "@type": "Offer",
        name: "Full audit",
        price: String(FULL_AUDIT_PRICE_EUR),
        priceCurrency: "EUR",
        url: absoluteUrl("/pricing"),
        description: "Every fix with the evidence behind it and how to verify it.",
      },
    ],
  };
  return [organization, website, service];
}
