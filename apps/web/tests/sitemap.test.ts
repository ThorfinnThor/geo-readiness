import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { GLOSSARY } from "@/lib/content/glossary";
import { CONTENT } from "@/lib/content/registry";
import { SEGMENTS } from "@/lib/content/segments";

describe("sitemap", () => {
  const urls = sitemap().map((e) => e.url);

  it("lists every content, glossary and site-type page exactly once", () => {
    expect(new Set(urls).size).toBe(urls.length);
    for (const e of CONTENT) expect(urls).toContain(`https://findyouraiscore.com${e.slug}`);
    for (const t of GLOSSARY)
      expect(urls).toContain(`https://findyouraiscore.com/glossary/${t.slug}`);
    for (const s of SEGMENTS) expect(urls).toContain(`https://findyouraiscore.com/for/${s.slug}`);
  });

  it("never lists a per-scan or internal route, which robots.txt disallows", () => {
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\//);
      expect(u).not.toMatch(/\/(api|report|scan|admin)(\/|$)/);
    }
  });
});
