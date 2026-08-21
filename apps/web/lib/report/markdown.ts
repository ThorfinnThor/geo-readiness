// Render a ReportDocument as Markdown for download. Mirrors the sections shown
// in FullReport so the export matches the on-screen report.
import type { ReportDocument } from "@/lib/report/types";

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

export function reportToMarkdown(report: ReportDocument): string {
  const m = report.meta;
  const out: string[] = [];

  out.push(`# GEO AI Search Readiness — ${m.canonical_domain}`);
  out.push("");
  out.push(`**Overall readiness: ${report.overall_score.toFixed(0)}/100 (${report.overall_level})**`);
  out.push("");
  out.push(
    `- Confidence: ${m.confidence_score.toFixed(0)}/100 (${m.confidence_band})`,
    `- Pages analyzed: ${m.pages_analyzed}`,
    `- Prompt clusters: ${m.clusters_evaluated}`,
    `- Methodology: ${m.methodology_version}`,
  );
  if (m.as_of) out.push(`- Measured: ${m.as_of.slice(0, 10)}`);
  out.push("");

  out.push("## Component scores", "");
  out.push(
    table(
      ["Component", "Score", "Level"],
      report.components.map((c) => [c.name, c.score.toFixed(0), c.level]),
    ),
    "",
  );

  const stages = report.stages ?? [];
  if (stages.length > 0) {
    out.push("## Readiness stages", "");
    for (const s of stages) {
      out.push(`### ${s.name} — ${s.score.toFixed(0)}/100 (${s.level})`, "", s.explanation, "");
    }
  }

  const limiting = (report.diagnostics ?? []).filter((d) => d.explanation);
  if (limiting.length > 0) {
    out.push("## What's limiting your weakest areas", "");
    for (const d of limiting) out.push(`- ${d.explanation}`);
    out.push("");
  }

  const p = report.business_profile;
  out.push("## Business profile", "");
  out.push(
    `- Brand: ${p.brand_name ?? "Unknown — needs confirmation"}`,
    `- Legal name: ${p.legal_name ?? "—"}`,
    `- Locations: ${p.locations.join(", ") || "—"}`,
    `- Services: ${p.services.join(", ") || "—"}`,
    `- Products: ${p.products.join(", ") || "—"}`,
    `- Languages: ${p.languages.join(", ") || "—"}`,
    "",
  );

  if (report.clusters.length > 0) {
    out.push("## Prompt cluster map & coverage", "");
    out.push(
      table(
        ["Intent", "Topic", "Coverage", "Missing requirements"],
        report.clusters.map((c) => [
          c.intent,
          c.label,
          c.coverage_score.toFixed(0),
          c.missing_requirements.join(", ") || "—",
        ]),
      ),
      "",
    );
  }

  out.push("## Prioritized fixes", "");
  report.actions.forEach((a, i) => {
    out.push(`### ${i + 1}. ${a.title}  \`${a.severity}\` (${a.rule_id})`, "");
    out.push(`**Problem:** ${a.problem}`, "");
    out.push(`**Fix:** ${a.recommendation}`, "");
    out.push(`**Verify:** ${a.how_to_verify}`, "");
    if (a.evidence.length > 0) {
      out.push("**Evidence:**");
      for (const e of a.evidence) out.push(`- ${e}`);
    }
    out.push("");
  });

  out.push("---", "", `_${report.disclaimer}_`, "");
  return out.join("\n");
}

/** Filename-safe slug for the download, e.g. geo-readiness-example-com.md */
export function reportFileBase(report: ReportDocument): string {
  const domain = report.meta.canonical_domain.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `geo-readiness-${domain || "report"}`;
}
