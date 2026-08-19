// E12 — Free Preview: overall, components, confidence, 3 strengths/gaps/actions,
// locked sections, CTA, and the mandatory disclaimer (§26/§41).
import Link from "next/link";

import type { ReportDocument } from "@/lib/report/types";
import { ComponentCard, OverallHeader } from "@/components/report/shared";

const PREVIEW_ACTIONS = 3;
const LOCKED_SECTIONS = [
  "Full prompt-cluster matrix",
  "All evidence & page-level findings",
  "Full action backlog",
  "Downloadable report",
];

export function PreviewReport({
  report,
  reportId,
}: {
  report: ReportDocument;
  reportId: string;
}) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <OverallHeader
        domain={report.meta.canonical_domain}
        score={report.overall_score}
        level={report.overall_level}
        confidenceBand={report.meta.confidence_band}
        pages={report.meta.pages_analyzed}
        clusters={report.meta.clusters_evaluated}
      />

      <section aria-label="Component scores" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {report.components.map((c) => (
          <ComponentCard key={c.key} component={c} />
        ))}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Top strengths
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {report.strengths.map((s) => (
              <li key={s}>✓ {s}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Top gaps
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {report.gaps.map((g) => (
              <li key={g}>• {g}</li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-label="Recommended actions">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Recommended actions
        </h2>
        <ol className="flex flex-col gap-3">
          {report.actions.slice(0, PREVIEW_ACTIONS).map((a) => (
            <li
              key={a.rule_id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-neutral-500">{a.recommendation}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
        <h2 className="text-sm font-semibold">Unlock the full audit</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-500">
          {LOCKED_SECTIONS.map((s) => (
            <li key={s}>🔒 {s}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Get the full audit
          </Link>
          <Link href={`/report/${reportId}`} className="px-4 py-2 text-sm text-neutral-500 underline">
            View full report (demo)
          </Link>
        </div>
      </section>

      <p className="text-xs text-neutral-500">{report.disclaimer}</p>
    </main>
  );
}
