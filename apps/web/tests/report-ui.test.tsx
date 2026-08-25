import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// PaywallCTA (inside PreviewReport) uses the app-router hook.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { PreviewReport } from "@/components/report/PreviewReport";
import { FullReport } from "@/components/report/FullReport";
import { exampleReport } from "@/lib/report/example";
import { toPreviewDoc } from "@/lib/report/preview";

describe("PreviewReport (E12)", () => {
  it("renders the overall score, components, and disclaimer", () => {
    render(<PreviewReport preview={toPreviewDoc(exampleReport)} reportId="demo" />);
    expect(screen.getByText(String(Math.round(exampleReport.overall_score)))).toBeDefined();
    expect(screen.getAllByText("Entity Clarity").length).toBeGreaterThan(0);
    expect(screen.getByText(/does not measure or guarantee/i)).toBeDefined();
  });

  it("locks the fixes and shows a CTA with the issue count", () => {
    render(<PreviewReport preview={toPreviewDoc(exampleReport)} reportId="demo" />);
    expect(screen.getByText("Unlock the Premium AI Readiness Audit")).toBeDefined();
    expect(screen.getByText("Get the Premium Audit")).toBeDefined();
    expect(screen.getByText(/issues found/i)).toBeDefined();
  });

  it("does not expose premium fix text in the preview DTO or DOM", () => {
    const SENTINEL = "PREMIUM_SENTINEL_DO_NOT_EXPOSE";
    const report = {
      ...exampleReport,
      actions: exampleReport.actions.map((a, i) =>
        i === 0 ? { ...a, title: SENTINEL, problem: SENTINEL, recommendation: SENTINEL } : a,
      ),
    };
    const preview = toPreviewDoc(report);
    // The DTO carries only counts + severities, never the fix text.
    expect(JSON.stringify(preview)).not.toContain(SENTINEL);
    const { container } = render(<PreviewReport preview={preview} reportId="x" />);
    expect(container.textContent).not.toContain(SENTINEL);
  });
});

describe("FullReport (E13)", () => {
  it("renders the full action backlog and cluster coverage", () => {
    render(<FullReport report={exampleReport} reportId="demo" />);
    // Every action appears (full backlog, not just 3).
    for (const a of exampleReport.actions) {
      expect(screen.getByText(a.title)).toBeDefined();
    }
    expect(screen.getByText("Prompt cluster map & coverage")).toBeDefined();
    expect(screen.getByText("Full action backlog")).toBeDefined();
  });

  it("shows the business profile", () => {
    render(<FullReport report={exampleReport} reportId="demo" />);
    expect(screen.getByText("Business profile")).toBeDefined();
  });

  it("omits V2 stage sections for a V1 report", () => {
    // The default fixture is V2 now; synthesize a V1-shaped doc (no stages).
    const v1: typeof exampleReport = {
      ...exampleReport,
      meta: { ...exampleReport.meta, methodology_version: "geo-readiness-v1" },
      stages: [],
      diagnostics: [],
    };
    render(<FullReport report={v1} reportId="demo" />);
    expect(screen.queryByText("Readiness stages")).toBeNull();
    expect(screen.queryByText("What's limiting each area")).toBeNull();
  });

  it("renders V2 stages, limiting factors, and provenance when present", () => {
    const v2: typeof exampleReport = {
      ...exampleReport,
      meta: {
        ...exampleReport.meta,
        methodology_version: "geo-readiness-v2",
        methodology_hash: "abcdef0123456789",
        as_of: "2026-01-01T00:00:00+00:00",
      },
      stages: [
        {
          key: "retrieval_readiness",
          name: "Retrieval Readiness",
          score: 62,
          level: "Good",
          explanation: "How findable the pages are.",
        },
        {
          key: "citation_readiness",
          name: "Citation Readiness",
          score: 40,
          level: "Needs improvement",
          explanation: "Whether claims are trustworthy enough to cite.",
        },
      ],
      diagnostics: [
        {
          component: "sourceability",
          strongest_signals: [],
          limiting_signals: ["quantified_information"],
          explanation: "Sourceability is primarily limited by specific quantified information.",
        },
      ],
    };
    render(<FullReport report={v2} reportId="demo" />);
    expect(screen.getByText("Readiness stages")).toBeDefined();
    expect(screen.getByText("Retrieval Readiness")).toBeDefined();
    expect(screen.getByText("Citation Readiness")).toBeDefined();
    expect(screen.getByText("What's limiting each area")).toBeDefined();
    expect(
      screen.getByText(/limited by specific quantified information/i),
    ).toBeDefined();
    expect(screen.getByText(/hash abcdef012345/i)).toBeDefined();
  });
});
