// Free-preview projection of a report. The premium fields (action problem /
// recommendation / evidence / how-to-verify, clusters, diagnostics, stages,
// business profile) are NOT included, so they never cross the server→browser
// boundary for an unpaid viewer. Only the free-product fields are kept, plus the
// issue count and the ordered severities for a content-free locked teaser.
import type { ReportComponent, ReportDocument, ReportMeta } from "@/lib/report/types";

export interface PreviewDoc {
  meta: ReportMeta;
  overall_score: number;
  overall_level: string;
  components: ReportComponent[];
  issueCount: number;
  issueSeverities: string[];
  disclaimer: string;
}

export function toPreviewDoc(report: ReportDocument): PreviewDoc {
  return {
    meta: report.meta,
    overall_score: report.overall_score,
    overall_level: report.overall_level,
    components: report.components,
    issueCount: report.actions.length,
    issueSeverities: report.actions.map((a) => a.severity),
    disclaimer: report.disclaimer,
  };
}
