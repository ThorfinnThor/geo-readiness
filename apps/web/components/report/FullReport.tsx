// E13 — Full Report: everything, printable HTML, noindex (§26). Rendered from
// the report contract; page-level access control is enforced by the API layer.
import type { ReportDocument } from "@/lib/report/types";
import {
  ComponentCard,
  OverallHeader,
  levelClasses,
  severityClasses,
} from "@/components/report/shared";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function FullReport({ report }: { report: ReportDocument; reportId?: string }) {
  const p = report.business_profile;
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 print:py-4">
      <OverallHeader
        domain={report.meta.canonical_domain}
        score={report.overall_score}
        level={report.overall_level}
        confidenceBand={report.meta.confidence_band}
        pages={report.meta.pages_analyzed}
        clusters={report.meta.clusters_evaluated}
      />

      <Section title="Component scores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {report.components.map((c) => (
            <ComponentCard key={c.key} component={c} />
          ))}
        </div>
      </Section>

      <Section title="Business profile">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Field label="Brand" value={p.brand_name ?? "Unknown (needs confirmation)"} />
          <Field label="Legal name" value={p.legal_name ?? "—"} />
          <Field label="Locations" value={p.locations.join(", ") || "—"} />
          <Field label="Services" value={p.services.join(", ") || "—"} />
          <Field label="Products" value={p.products.join(", ") || "—"} />
          <Field label="Languages" value={p.languages.join(", ") || "—"} />
        </dl>
      </Section>

      <Section title="Prompt cluster map & coverage">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1 pr-4 font-medium">Intent</th>
                <th className="py-1 pr-4 font-medium">Topic</th>
                <th className="py-1 pr-4 font-medium">Coverage</th>
                <th className="py-1 font-medium">Missing</th>
              </tr>
            </thead>
            <tbody>
              {report.clusters.map((c) => (
                <tr key={c.cluster_key} className="border-t border-neutral-100 dark:border-neutral-900">
                  <td className="py-1 pr-4">{c.intent}</td>
                  <td className="py-1 pr-4">{c.label}</td>
                  <td className="py-1 pr-4 tabular-nums">{c.coverage_score.toFixed(0)}</td>
                  <td className="py-1 text-neutral-500">
                    {c.missing_requirements.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Full action backlog">
        <ol className="flex flex-col gap-4">
          {report.actions.map((a) => (
            <li key={a.rule_id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityClasses(a.severity)}`}>
                  {a.severity}
                </span>
                <span className="font-medium">{a.title}</span>
                <span className="text-xs text-neutral-400">{a.rule_id}</span>
              </div>
              <p className="mt-2 text-sm">{a.problem}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                <strong>Do:</strong> {a.recommendation}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                <strong>Verify:</strong> {a.how_to_verify}
              </p>
              {a.evidence.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500">
                  {a.evidence.map((e, i) => (
                    <li key={i}>— {e}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Methodology & limitations">
        <p className="text-sm text-neutral-500">
          Methodology {report.meta.methodology_version}. Confidence{" "}
          <span className={levelClasses(report.overall_level)}>{report.meta.confidence_band}</span>{" "}
          ({report.meta.confidence_score.toFixed(0)}/100). {report.disclaimer}
        </p>
      </Section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
