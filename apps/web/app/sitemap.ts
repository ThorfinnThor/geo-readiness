import type { MetadataRoute } from "next";

import { CONTENT } from "@/lib/content/registry";
import { absoluteUrl } from "@/lib/seo/site";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];
const MARKETING: { path: string; priority: number; changeFrequency: Freq }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/learn", priority: 0.7, changeFrequency: "weekly" },
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
  return [...marketing, ...content];
}
