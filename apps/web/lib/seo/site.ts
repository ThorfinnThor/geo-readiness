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

// Single source of truth for the paid product, shared by the pricing page, the
// paywall and the Offer structured data so nothing can drift.
export const FULL_AUDIT_PRODUCT_NAME = "Premium AI Readiness Audit";
export const FULL_AUDIT_PRICE_EUR = Number(process.env.GEO_FULL_AUDIT_PRICE_EUR ?? "4.99");
// Regular (post-launch) price, shown as the anchor next to the launch price.
export const FULL_AUDIT_REGULAR_PRICE_EUR = Number(
  process.env.GEO_FULL_AUDIT_REGULAR_PRICE_EUR ?? "49",
);

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
  const offers = [
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
      name: FULL_AUDIT_PRODUCT_NAME,
      price: String(FULL_AUDIT_PRICE_EUR),
      priceCurrency: "EUR",
      url: absoluteUrl("/pricing"),
      description:
        "The full AI readiness score across all seven dimensions, concrete findings with " +
        "evidence, prioritized fixes, and a downloadable report.",
    },
  ];
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE.url}/#service`,
    name: FULL_AUDIT_PRODUCT_NAME,
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
    offers,
  };
  // The product is a web-delivered software tool (a SaaS audit app). Accurate
  // SoftwareApplication schema — improves structured data and lets a reader
  // identify the archetype rather than mistaking the content library for a blog.
  const webApplication = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE.url}/#app`,
    name: SITE.name,
    url: SITE.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    provider: { "@id": ORG_ID },
    description:
      "A web-based tool that audits how ready a website is for AI answer engines and returns a " +
      "readiness score with prioritized fixes.",
    offers,
  };
  return [organization, website, service, webApplication];
}
