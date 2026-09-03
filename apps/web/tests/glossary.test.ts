import { describe, expect, it } from "vitest";

import { GLOSSARY, glossaryTerm } from "@/lib/content/glossary";

describe("glossary", () => {
  it("has unique slugs and no unresolvable related links", () => {
    const slugs = GLOSSARY.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const t of GLOSSARY) {
      for (const r of t.related) {
        expect(glossaryTerm(r), `${t.slug} -> ${r}`).toBeDefined();
      }
    }
  });

  it("gives every term real substance, so no page is thin", () => {
    for (const t of GLOSSARY) {
      expect(t.term.length, t.slug).toBeGreaterThan(2);
      expect(t.def.split(/\s+/).length, t.slug).toBeGreaterThan(20);
      expect(t.long.split(/\s+/).length, t.slug).toBeGreaterThan(50);
      expect(t.related.length, t.slug).toBeGreaterThan(0);
    }
  });
});
