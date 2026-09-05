import { describe, expect, it } from "vitest";

import { hasPathRestrictions, parseRobots, rootVerdict } from "@/lib/robots/parse";

const v = (text: string, token: string) => rootVerdict(parseRobots(text), token);

describe("robots.txt parsing", () => {
  it("treats a missing or empty file as fully allowed", () => {
    expect(v("", "GPTBot").verdict).toBe("allowed");
    expect(v("", "GPTBot").matchedBy).toBe("default");
  });

  it("applies the wildcard group when the agent has none of its own", () => {
    const r = v("User-agent: *\nDisallow: /", "GPTBot");
    expect(r.verdict).toBe("blocked");
    expect(r.matchedBy).toBe("wildcard");
  });

  it("lets the agent's own group override a blanket wildcard block", () => {
    const text = "User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /";
    expect(v(text, "GPTBot")).toMatchObject({ verdict: "allowed", matchedBy: "agent" });
    expect(v(text, "PerplexityBot")).toMatchObject({ verdict: "blocked", matchedBy: "wildcard" });
  });

  it("matches the agent token exactly, never as a substring", () => {
    // Substring matching would let a Claude-SearchBot rule capture Claude-User.
    const text = "User-agent: Claude-SearchBot\nDisallow: /";
    expect(v(text, "Claude-SearchBot").verdict).toBe("blocked");
    expect(v(text, "Claude-User")).toMatchObject({ verdict: "allowed", matchedBy: "default" });
  });

  it("is case-insensitive on the token", () => {
    expect(v("User-agent: gptbot\nDisallow: /", "GPTBot").verdict).toBe("blocked");
    expect(v("user-AGENT: GPTBOT\ndisallow: /", "GPTBot").verdict).toBe("blocked");
  });

  it("treats an empty Disallow as imposing nothing", () => {
    expect(v("User-agent: *\nDisallow:", "GPTBot").verdict).toBe("allowed");
  });

  it("lets Allow win when both govern the root", () => {
    expect(v("User-agent: *\nDisallow: /\nAllow: /", "GPTBot").verdict).toBe("allowed");
  });

  it("does not treat a path-level Disallow as blocking the site", () => {
    const r = v("User-agent: *\nDisallow: /admin\nDisallow: /cart", "GPTBot");
    expect(r.verdict).toBe("allowed");
    expect(hasPathRestrictions(r)).toBe(true);
  });

  it("groups consecutive user-agent lines together, and splits after rules", () => {
    const f = parseRobots("User-agent: A\nUser-agent: B\nDisallow: /\n\nUser-agent: C\nAllow: /");
    expect(f.groups).toHaveLength(2);
    expect(f.groups[0]!.agents).toEqual(["a", "b"]);
    expect(f.groups[1]!.agents).toEqual(["c"]);
    expect(v("User-agent: A\nUser-agent: B\nDisallow: /", "B").verdict).toBe("blocked");
  });

  it("ignores comments and collects sitemaps", () => {
    const f = parseRobots("# hello\nUser-agent: * # everyone\nDisallow: / # all of it\nSitemap: https://x.example/sitemap.xml");
    expect(f.sitemaps).toEqual(["https://x.example/sitemap.xml"]);
    expect(rootVerdict(f, "GPTBot").verdict).toBe("blocked");
  });

  it("ignores rules that appear before any user-agent line", () => {
    expect(v("Disallow: /\nUser-agent: *\nAllow: /", "GPTBot").verdict).toBe("allowed");
  });
});
