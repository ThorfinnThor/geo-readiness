import { describe, expect, it } from "vitest";

import { exampleReport } from "@/lib/report/example";
import { reportFileBase, reportToMarkdown } from "@/lib/report/markdown";

describe("reportToMarkdown", () => {
  const md = reportToMarkdown(exampleReport);

  it("includes the header, score, and key sections", () => {
    expect(md).toContain(`# Find Your AI Score report for ${exampleReport.meta.canonical_domain}`);
    expect(md).toContain(`${exampleReport.overall_score.toFixed(0)}/100`);
    expect(md).toContain("## Component scores");
    expect(md).toContain("## Prioritized fixes");
  });

  it("lists every action with its fix and verify steps", () => {
    for (const a of exampleReport.actions) {
      expect(md).toContain(a.title);
      expect(md).toContain(a.recommendation);
      expect(md).toContain(a.how_to_verify);
    }
  });

  it("ends with the disclaimer", () => {
    expect(md).toContain(exampleReport.disclaimer);
  });

  it("builds a filename-safe base", () => {
    expect(reportFileBase(exampleReport)).toMatch(/^geo-readiness-[a-z0-9-]+$/i);
  });
});
