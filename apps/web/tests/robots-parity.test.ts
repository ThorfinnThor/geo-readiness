import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CRAWLERS } from "@/lib/content/crawlers";
import { parseRobots, rootVerdict } from "@/lib/robots/parse";

// The same cases the Python worker suite runs. A site sees these verdicts twice
// — once in its report, once in the public checker — and the two must agree.
// Pinning both implementations to one fixture file is what makes that true
// rather than hoped for.
const CONFIGS = join(__dirname, "..", "..", "..", "configs");

interface ParityCase {
  name: string;
  robots: string;
  expect: Record<string, "allowed" | "blocked">;
}

const cases: ParityCase[] = JSON.parse(
  readFileSync(join(CONFIGS, "ai-crawlers.parity.json"), "utf-8"),
).cases;

describe("robots verdict parity with the worker", () => {
  it("loads the shared cases", () => {
    expect(cases.length).toBeGreaterThan(5);
  });

  for (const c of cases) {
    it(c.name, () => {
      const file = parseRobots(c.robots);
      for (const [token, expected] of Object.entries(c.expect)) {
        expect(rootVerdict(file, token).verdict, `${c.name}: ${token}`).toBe(expected);
      }
    });
  }

  it("checks tokens the crawler list actually contains", () => {
    const known = new Set(CRAWLERS.map((x) => x.token));
    for (const c of cases) {
      for (const token of Object.keys(c.expect)) expect(known, `${c.name}: ${token}`).toContain(token);
    }
  });
});

describe("crawler list parity with the shared config", () => {
  interface ConfigCrawler {
    token: string;
    company: string;
    purpose: string;
    obeys_robots: boolean;
  }
  const config: ConfigCrawler[] = JSON.parse(
    readFileSync(join(CONFIGS, "ai-crawlers.json"), "utf-8"),
  ).crawlers;

  it("lists the same tokens, companies, purposes and robots behaviour as the worker reads", () => {
    expect(CRAWLERS.map((c) => c.token).sort()).toEqual(config.map((c) => c.token).sort());
    for (const c of config) {
      const ours = CRAWLERS.find((x) => x.token === c.token)!;
      expect(ours.company, c.token).toBe(c.company);
      expect(ours.purpose, c.token).toBe(c.purpose);
      expect(ours.obeysRobots, c.token).toBe(c.obeys_robots);
    }
  });
});
