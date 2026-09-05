// @vitest-environment node
import { describe, expect, it } from "vitest";

import { CRAWLERS } from "@/lib/content/crawlers";
import { fetchRobots } from "@/lib/robots/fetch";
import { parseRobots, rootVerdict } from "@/lib/robots/parse";

// Runs in the node environment, not jsdom: jsdom cannot make real
// cross-origin requests, so the fetch would fail for the wrong reason.
//
// Opt-in: this one really goes to the network, so it stays out of the default
// run. Enable with LIVE_ROBOTS=1 (and NODE_EXTRA_CA_CERTS if your machine's
// Node has no usable trust store).
const live = process.env.LIVE_ROBOTS === "1" ? describe : describe.skip;

live("fetchRobots against the real internet", () => {
  it("follows an apex-to-www redirect and reads the file", async () => {
    const r = await fetchRobots("findyouraiscore.com");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.finalUrl).toBe("https://www.findyouraiscore.com/robots.txt");
    expect(r.status).toBe(200);
    const file = parseRobots(r.text);
    // Our own robots allows everything except the per-scan routes, so every
    // documented agent should come back allowed at the root.
    for (const c of CRAWLERS) {
      expect(rootVerdict(file, c.token).verdict, c.token).toBe("allowed");
    }
  }, 20_000);

  it("treats a domain with no robots.txt as fully allowed", async () => {
    const r = await fetchRobots("example.com");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe(404);
    expect(r.text).toBe("");
  }, 20_000);

  it("refuses a host that resolves to a private address", async () => {
    // localhost.localdomain style names are rejected by normalizeDomain; this
    // checks the DNS layer with a public name that resolves to 127.0.0.1.
    const r = await fetchRobots("localtest.me");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("private_host");
  }, 20_000);
});
