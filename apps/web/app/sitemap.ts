import type { MetadataRoute } from "next";

import { GLOSSARY } from "@/lib/content/glossary";
import { SEGMENTS } from "@/lib/content/segments";
import { CONTENT } from "@/lib/content/registry";
import { absoluteUrl } from "@/lib/seo/site";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];
const MARKETING: { path: string; priority: number; changeFrequency: Freq }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/product", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/learn", priority: 0.7, changeFrequency: "weekly" },
  { path: "/insights", priority: 0.8, changeFrequency: "weekly" },
  { path: "/ai-crawler-check", priority: 0.9, changeFrequency: "monthly" },
  { path: "/badge", priority: 0.5, changeFrequency: "yearly" },
  // Legal pages carry real identity signals, so they belong in the index too.
  { path: "/imprint", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const marketing = MARKETING.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  const content = CONTENT.map((c) => ({
    url: absoluteUrl(c.slug),
    lastModified: new Date(c.updated),
    changeFrequency: "monthly" as Freq,
    priority: 0.6,
  }));
  const glossaryTerms = GLOSSARY.map((t) => ({
    url: absoluteUrl(`/glossary/${t.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as Freq,
    priority: 0.5,
  }));
  const segments = SEGMENTS.map((s) => ({
    url: absoluteUrl(`/for/${s.slug}`),
    lastModified: new Date(s.updated),
    changeFrequency: "monthly" as Freq,
    priority: 0.7,
  }));
  return [...marketing, ...content, ...glossaryTerms, ...segments];
}
