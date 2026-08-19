// E12 — Free Preview: the full report, but the prioritized fixes are blurred
// behind a paywall. Visible: overall score, all component scores, and which
// categories need improvement. Locked: the actual issues and how to fix them.
import Link from "next/link";

import type { ReportDocument } from "@/lib/report/types";
import { ComponentCard, LevelChip, OverallHeader } from "@/components/report/shared";
import { TopBar } from "@/components/TopBar";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{children}</h2>
  );
}

function IssueCard({
  title,
  problem,
  recommendation,
  severity,
}: {
  title: string;
  problem: string;
  recommendation: string;
  severity: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "color-mix(in srgb, var(--weak) 28%, var(--border))" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
          style={{ color: "var(--weak)", backgroundColor: "color-mix(in srgb, var(--weak) 14%, transparent)" }}
        >
          {severity}
        </span>
        <span className="font-medium">{title}</span>
      </div>
      <p className="mt-2 text-sm text-fg-muted">{problem}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--weak)" }}>
        → {recommendation}
      </p>
    </div>
  );
}

export function PreviewReport({
  report,
  reportId,
}: {
  report: ReportDocument;
  reportId: string;
}) {
  const gaps = report.components
    .filter((c) => c.level === "Weak" || c.level === "Needs improvement")
    .sort((a, b) => a.score - b.score);
  const focus = gaps.length > 0 ? gaps : [...report.components].sort((a, b) => a.score - b.score).slice(0, 3);
  const issueCount = report.actions.length;

  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-10 sm:py-14">
        <OverallHeader
        domain={report.meta.canonical_domain}
        score={report.overall_score}
        level={report.overall_level}
        confidenceBand={report.meta.confidence_band}
        pages={report.meta.pages_analyzed}
        clusters={report.meta.clusters_evaluated}
      />

      <section className="flex flex-col gap-3" aria-label="Component scores">
        <SectionLabel>Component scores</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {report.components.map((c) => (
            <ComponentCard key={c.key} component={c} />
          ))}
        </div>
      </section>

      {/* Visible: WHERE the problems are — the categories, not the fixes. */}
      <section className="flex flex-col gap-3">
        <SectionLabel>What needs improvement</SectionLabel>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40">
          {focus.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm font-medium">{c.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums text-fg-muted">
                  {c.score.toFixed(0)}
                </span>
                <LevelChip level={c.level} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Locked: the actual prioritized fixes, blurred behind the paywall. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <SectionLabel>Prioritized fixes</SectionLabel>
          <span className="font-mono text-xs" style={{ color: "var(--weak)" }}>
            {issueCount} issues found
          </span>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none max-h-[420px] select-none space-y-3 overflow-hidden blur-[6px]"
          >
            {report.actions.map((a) => (
              <IssueCard
                key={a.rule_id}
                title={a.title}
                problem={a.problem}
                recommendation={a.recommendation}
                severity={a.severity}
              />
            ))}
          </div>
          <div
            className="absolute inset-0 flex items-end justify-center rounded-xl"
            style={{
              background:
                "linear-gradient(to bottom, transparent 12%, color-mix(in srgb, var(--bg) 82%, transparent) 70%, var(--bg) 100%)",
            }}
          >
            <div className="mb-4 w-full max-w-sm rounded-2xl border border-border-strong bg-surface/80 p-5 text-center shadow-2xl backdrop-blur">
              <p className="font-mono text-xs" style={{ color: "var(--weak)" }}>
                {issueCount} issues are limiting how AI search reads your site
              </p>
              <h2 className="mt-2 text-base font-semibold">Unlock the full audit</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Every fix, with the evidence behind it and how to verify it.
              </p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <Link
                  href="/pricing"
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
                  style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
                >
                  Get the full audit
                </Link>
                <Link
                  href={`/report/${reportId}`}
                  className="font-mono text-xs text-fg-subtle underline underline-offset-4 hover:text-fg-muted"
                >
                  view full report (demo)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="border-t border-border pt-6 text-xs text-fg-subtle">{report.disclaimer}</p>
      </main>
    </>
  );
}
