// E13 — Full Report: everything, printable HTML, noindex (§26). Rendered from
// the report contract; page-level access control is enforced by the API layer.
import type { ReportDocument } from "@/lib/report/types";
import {
  ComponentCard,
  LevelChip,
  OverallHeader,
  StageCard,
  severityColor,
} from "@/components/report/shared";
import { ReportExport } from "@/components/report/ReportExport";
import { TopBar } from "@/components/TopBar";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{title}</h2>
      {children}
    </section>
  );
}

function coverageColor(score: number): string {
  if (score >= 80) return "var(--excellent)";
  if (score >= 50) return "var(--good)";
  if (score > 0) return "var(--warn)";
  return "var(--weak)";
}

export function FullReport({ report }: { report: ReportDocument; reportId?: string }) {
  const p = report.business_profile;
  const stages = report.stages ?? [];
  const limiting = (report.diagnostics ?? []).filter((d) => d.explanation);
  return (
    <>
      <div className="print:hidden">
        <TopBar />
      </div>
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 print:py-4 sm:py-14">
        <ReportExport report={report} />
        <OverallHeader
        domain={report.meta.canonical_domain}
        score={report.overall_score}
        level={report.overall_level}
        confidenceBand={report.meta.confidence_band}
        pages={report.meta.pages_analyzed}
        clusters={report.meta.clusters_evaluated}
      />

      <Section title="Component scores">
        {/* Flex-fill so the 7 cards form two full rows (4 + 3) with no orphan. */}
        <div className="flex flex-wrap gap-3">
          {report.components.map((c) => (
            <div key={c.key} className="grow basis-[47%] lg:basis-[22%]">
              <ComponentCard component={c} />
            </div>
          ))}
        </div>
      </Section>

      {stages.length > 0 && (
        <Section title="Readiness stages">
          <p className="-mt-1 text-sm text-fg-muted">
            How ready the site is at each step machines take: finding a page,
            trusting it enough to cite, and pulling a clean answer from it.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {stages.map((s) => (
              <StageCard key={s.key} stage={s} />
            ))}
          </div>
          <p className="text-xs text-fg-subtle">
            Stage scores are diagnostic views of the components above — they do not
            change the overall score.
          </p>
        </Section>
      )}

      {limiting.length > 0 && (
        <Section title="What's limiting each area">
          <ul className="flex flex-col gap-2">
            {limiting.map((d) => (
              <li
                key={d.component}
                className="rounded-xl border border-border bg-surface/50 px-5 py-3 text-sm text-fg-muted"
              >
                {d.explanation}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Business profile">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-border bg-surface/50 p-5 text-sm sm:grid-cols-3">
          <Field label="Brand" value={p.brand_name ?? "Unknown — needs confirmation"} />
          <Field label="Legal name" value={p.legal_name ?? "—"} />
          <Field label="Locations" value={p.locations.join(", ") || "—"} />
          <Field label="Services" value={p.services.join(", ") || "—"} />
          <Field label="Products" value={p.products.join(", ") || "—"} />
          <Field label="Languages" value={p.languages.join(", ") || "—"} />
        </dl>
      </Section>

      <Section title="Prompt cluster map & coverage">
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/50">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wide text-fg-subtle">
                <th className="px-4 py-2.5 font-medium">Intent</th>
                <th className="px-4 py-2.5 font-medium">Topic</th>
                <th className="px-4 py-2.5 font-medium">Coverage</th>
                <th className="px-4 py-2.5 font-medium">Missing requirements</th>
              </tr>
            </thead>
            <tbody>
              {report.clusters.map((c) => (
                <tr key={c.cluster_key} className="border-t border-border">
                  <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">{c.intent}</td>
                  <td className="px-4 py-2.5">{c.label}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2" style={{ color: coverageColor(c.coverage_score) }}>
                      <span className="font-mono tabular-nums text-fg">
                        {c.coverage_score.toFixed(0)}
                      </span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full bg-current"
                          style={{ width: `${Math.max(0, Math.min(100, c.coverage_score))}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-fg-subtle">
                    {c.missing_requirements.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Full action backlog">
        <ol className="flex flex-col gap-3">
          {report.actions.map((a) => (
            <li key={a.rule_id} className="rounded-xl border border-border bg-surface/50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
                  style={{
                    color: severityColor(a.severity),
                    backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
                  }}
                >
                  {a.severity}
                </span>
                <span className="font-medium">{a.title}</span>
                <span className="ml-auto font-mono text-xs text-fg-subtle">{a.rule_id}</span>
              </div>
              <p className="mt-3 text-sm text-fg-muted">{a.problem}</p>
              <p className="mt-2 text-sm">
                <span className="text-accent">→</span> {a.recommendation}
              </p>
              <p className="mt-2 text-xs text-fg-subtle">
                <span className="font-mono">verify:</span> {a.how_to_verify}
              </p>
              {a.evidence.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 font-mono text-xs text-fg-subtle">
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
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/50 p-5 text-sm text-fg-muted">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs">{report.meta.methodology_version}</span>
            <LevelChip level={report.overall_level} />
            <span className="font-mono text-xs text-fg-subtle">
              confidence {report.meta.confidence_score.toFixed(0)}/100 · {report.meta.confidence_band}
            </span>
          </div>
          {(report.meta.methodology_hash || report.meta.as_of) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.7rem] text-fg-subtle">
              {report.meta.as_of && (
                <span>measured {report.meta.as_of.slice(0, 10)}</span>
              )}
              {report.meta.methodology_hash && (
                <span>hash {report.meta.methodology_hash.slice(0, 12)}</span>
              )}
            </div>
          )}
          <p className="text-xs">{report.disclaimer}</p>
        </div>
      </Section>
      </main>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.7rem] uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
