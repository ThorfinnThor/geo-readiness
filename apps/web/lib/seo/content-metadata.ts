import type { Metadata } from "next";

import { CONTENT } from "@/lib/content/registry";

/** URL of the dynamically generated Open Graph image for a title/category. */
export function ogImageUrl(title: string, category?: string): string {
  const params = new URLSearchParams({ title });
  if (category) params.set("category", category);
  return `/og?${params.toString()}`;
}

/** Full page Metadata for a content entry, including a per-title OG image. */
export function contentMetadata(slug: string): Metadata {
  const e = CONTENT.find((c) => c.slug === slug)!;
  const image = ogImageUrl(e.title, e.category);
  return {
    title: e.title,
    description: e.description,
    alternates: { canonical: e.slug },
    openGraph: {
      title: e.title,
      description: e.description,
      url: e.slug,
      type: "article",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: e.title,
      description: e.description,
      images: [image],
    },
  };
}
