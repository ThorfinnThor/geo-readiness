// Free-preview projection of a report. The premium fields (action problem /
// recommendation / evidence / how-to-verify, clusters, diagnostics, stages,
// business profile) are NOT included, so they never cross the server→browser
// boundary for an unpaid viewer. Only the free-product fields are kept, plus the
// issue count and the ordered severities for a content-free locked teaser — and
// exactly ONE full fix as an honest sample of what the paid report contains. Its
// paste-ready `fix_prompt` is stripped, so the premium payload still never ships
// for free.
import { sampleCitationQuery } from "@/lib/report/citationTest";
import type { ReportAction, ReportComponent, ReportDocument, ReportMeta } from "@/lib/report/types";

export interface PreviewDoc {
  meta: ReportMeta;
  overall_score: number;
  overall_level: string;
  components: ReportComponent[];
  issueCount: number;
  issueSeverities: string[];
  sampleAction: ReportAction | null;
  sampleCitationQuery: string | null;
  /** Who may read the site, from its robots.txt. Free on purpose: the public
   *  crawler check hands this to anyone for any domain, so paywalling it in the
   *  owner's own report would be indefensible. Just the verdicts — the rest of
   *  the crawl block stays behind the boundary. */
  aiCrawlerAccess: Record<string, boolean> | null;
  disclaimer: string;
}

export function toPreviewDoc(report: ReportDocument): PreviewDoc {
  // The single highest-priority fix, shown in full as the teaser; its paste-ready
  // prompt is removed so only the paid report carries it.
  const top = [...report.actions].sort((a, b) => b.priority_score - a.priority_score)[0] ?? null;
  const sampleAction = top ? { ...top, fix_prompt: undefined } : null;
  // Remaining fixes stay locked — their severities drive the redacted skeletons.
  const remaining = top ? report.actions.filter((a) => a.rule_id !== top.rule_id) : report.actions;

  return {
    meta: report.meta,
    overall_score: report.overall_score,
    overall_level: report.overall_level,
    components: report.components,
    issueCount: report.actions.length,
    issueSeverities: remaining.map((a) => a.severity),
    sampleAction,
    sampleCitationQuery: sampleCitationQuery(report),
    aiCrawlerAccess: report.crawl?.ai_crawler_access ?? null,
    disclaimer: report.disclaimer,
  };
}
