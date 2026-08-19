import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PreviewReport } from "@/components/report/PreviewReport";
import { FullReport } from "@/components/report/FullReport";
import { exampleReport } from "@/lib/report/example";

describe("PreviewReport (E12)", () => {
  it("renders the overall score, components, and disclaimer", () => {
    render(<PreviewReport report={exampleReport} reportId="demo" />);
    expect(screen.getByText(String(Math.round(exampleReport.overall_score)))).toBeDefined();
    expect(screen.getByText("Entity Clarity")).toBeDefined();
    expect(screen.getByText(/does not measure actual/i)).toBeDefined();
  });

  it("locks the full sections and shows a CTA", () => {
    render(<PreviewReport report={exampleReport} reportId="demo" />);
    expect(screen.getByText("Unlock the full audit")).toBeDefined();
    expect(screen.getByText("Get the full audit")).toBeDefined();
  });

  it("shows at most three preview actions", () => {
    render(<PreviewReport report={exampleReport} reportId="demo" />);
    const shown = exampleReport.actions.slice(0, 3);
    for (const a of shown) {
      expect(screen.getByText(a.title)).toBeDefined();
    }
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
});
