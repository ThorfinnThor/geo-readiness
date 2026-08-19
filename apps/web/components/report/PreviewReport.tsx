// E12 — Free Preview: overall, components, confidence, 3 strengths/gaps/actions,
// locked sections, CTA, and the mandatory disclaimer (§26/§41).
import Link from "next/link";

import type { ReportDocument } from "@/lib/report/types";
import { ComponentCard, OverallHeader, severityColor } from "@/components/report/shared";

const PREVIEW_ACTIONS = 3;
const LOCKED_SECTIONS = [
  "Full prompt-cluster matrix",
  "All evidence & page-level findings",
  "Full action backlog",
  "Downloadable report",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{children}</h2>
  );
}

export function PreviewReport({
  report,
  reportId,
}: {
  report: ReportDocument;
  reportId: string;
}) {
  return (
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

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionLabel>Top strengths</SectionLabel>
          <ul className="flex flex-col gap-2 text-sm">
            {report.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-excellent">▲</span>
                <span className="text-fg-muted">{s}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-3">
          <SectionLabel>Top gaps</SectionLabel>
          <ul className="flex flex-col gap-2 text-sm">
            {report.gaps.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="text-warn">▼</span>
                <span className="text-fg-muted">{g}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-3" aria-label="Recommended actions">
        <SectionLabel>Recommended actions</SectionLabel>
        <ol className="flex flex-col gap-3">
          {report.actions.slice(0, PREVIEW_ACTIONS).map((a) => (
            <li key={a.rule_id} className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: severityColor(a.severity) }}
                />
                <p className="font-medium">{a.title}</p>
              </div>
              <p className="mt-1.5 pl-4 text-sm text-fg-muted">{a.recommendation}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-border-strong p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(30rem 12rem at 20% 0%, var(--glow-a), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">Unlock the full audit</h2>
            <p className="mt-1 text-sm text-fg-muted">
              The complete cluster matrix, all evidence, and the full prioritized backlog.
            </p>
          </div>
          <ul className="grid gap-2 text-sm text-fg-muted sm:grid-cols-2">
            {LOCKED_SECTIONS.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="text-fg-subtle">◇</span> {s}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/pricing"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
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
      </section>

      <p className="border-t border-border pt-6 text-xs text-fg-subtle">{report.disclaimer}</p>
    </main>
  );
}
