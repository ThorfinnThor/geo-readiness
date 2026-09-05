import { describe, expect, it } from "vitest";

import { CRAWLERS, SOURCES, robotsSnippet, crawlersByPurpose } from "@/lib/content/crawlers";

// The page's entire value is that the tokens are right: a misspelled user-agent
// line in robots.txt is not an error, it is a rule that silently matches nothing.
describe("AI crawler reference", () => {
  it("has unique, whitespace-free tokens with a source for every company", () => {
    const tokens = CRAWLERS.map((c) => c.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    for (const c of CRAWLERS) {
      expect(c.token, c.token).toMatch(/^[A-Za-z][A-Za-z0-9-]*$/);
      expect(c.what.length, c.token).toBeGreaterThan(20);
    }
    const companies = new Set(CRAWLERS.map((c) => c.company));
    for (const company of companies) {
      expect(SOURCES.map((s) => s.company), company).toContain(company);
    }
  });

  it("keeps the search/training split that the recipes depend on", () => {
    // The whole point of the page: these are different tokens with different
    // consequences. If a bot were ever in both buckets the recipes would
    // contradict themselves.
    const search = crawlersByPurpose("search").map((c) => c.token);
    const training = crawlersByPurpose("training").map((c) => c.token);
    expect(search.length).toBeGreaterThan(0);
    expect(training.length).toBeGreaterThan(0);
    expect(search.filter((t) => training.includes(t))).toEqual([]);
    // The two most-confused tokens must stay on opposite sides.
    expect(search).toContain("OAI-SearchBot");
    expect(training).toContain("GPTBot");
  });

  it("renders a robots.txt snippet one directive per agent", () => {
    const snippet = robotsSnippet(["GPTBot", "CCBot"], "Disallow: /");
    expect(snippet).toBe("User-agent: GPTBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /");
  });

  it("records which agents the vendor says ignore robots.txt", () => {
    const ignoring = CRAWLERS.filter((c) => !c.obeysRobots).map((c) => c.token);
    expect(ignoring).toEqual(["ChatGPT-User", "Perplexity-User"]);
    // Any bot documented as ignoring robots.txt must say so, or the reader will
    // write a rule that does nothing.
    for (const c of CRAWLERS.filter((x) => !x.obeysRobots)) expect(c.note).toBeTruthy();
  });
});
