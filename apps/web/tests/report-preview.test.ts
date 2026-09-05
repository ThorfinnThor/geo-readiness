import { describe, expect, it } from "vitest";

import { exampleReport } from "@/lib/report/example";
import { toPreviewDoc } from "@/lib/report/preview";
import type { ReportDocument } from "@/lib/report/types";

// The preview is what an UNPAID viewer's browser receives. Anything premium in
// here has already leaked by the time the page renders, so the boundary is
// asserted rather than trusted.
function withCrawl(access: Record<string, boolean> | undefined): ReportDocument {
  return {
    ...exampleReport,
    crawl: {
      status: "completed",
      pages_analyzed: 10,
      pages_fetched: 12,
      errors: 0,
      robots_skipped: 0,
      homepage_reachable: true,
      robots_blocked_core: false,
      valid_response_ratio: 1,
      ...(access ? { ai_crawler_access: access } : {}),
    },
  };
}

describe("free preview boundary", () => {
  it("ships the crawler verdicts, which the public checker gives away anyway", () => {
    const p = toPreviewDoc(withCrawl({ GPTBot: false, "OAI-SearchBot": true }));
    expect(p.aiCrawlerAccess).toEqual({ GPTBot: false, "OAI-SearchBot": true });
  });

  it("ships only the verdicts, not the rest of the crawl block", () => {
    const p = toPreviewDoc(withCrawl({ GPTBot: false })) as unknown as Record<string, unknown>;
    expect(p.crawl).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain("valid_response_ratio");
    expect(JSON.stringify(p)).not.toContain("robots_skipped");
  });

  it("is null on reports written before the check existed", () => {
    expect(toPreviewDoc(withCrawl(undefined)).aiCrawlerAccess).toBeNull();
    expect(toPreviewDoc({ ...exampleReport, crawl: null }).aiCrawlerAccess).toBeNull();
  });

  it("still withholds the premium payload", () => {
    const p = toPreviewDoc(withCrawl({ GPTBot: true })) as unknown as Record<string, unknown>;
    // Clusters, diagnostics, stages and the business profile stay server-side,
    // and the one sample fix ships without its paste-ready prompt.
    for (const key of ["clusters", "diagnostics", "stages", "business_profile", "actions"]) {
      expect(p[key], key).toBeUndefined();
    }
    expect(p.sampleAction && (p.sampleAction as Record<string, unknown>).fix_prompt).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain("fix_prompt_master");
  });
});
