import { Suspense } from "react";
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
import { CitationSelfTest } from "@/components/report/CitationSelfTest";
import { CopyPromptButton } from "@/components/report/CopyPromptButton";
import { ReportExport } from "@/components/report/ReportExport";
import { ScanComparison } from "@/components/report/ScanComparison";
import { ScorePercentile } from "@/components/report/ScorePercentile";
import { TopBar } from "@/components/TopBar";
import {
  citationQueries,
  evaluationPrompt,
  kitLanguage,
  measurementPrompt,
  proProtocolMarkdown,
} from "@/lib/report/citationTest";
import { humanizeOffering, humanizeOfferingList } from "@/lib/report/humanize";
import { RESEARCH_BASIS, RESEARCH_NOTE } from "@/lib/content/research-basis";

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

export function FullReport({
  report,
  reportId,
}: {
  report: ReportDocument;
  reportId?: string;
}) {
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

      <Suspense fallback={null}>
        <ScorePercentile score={report.overall_score} />
      </Suspense>

      <div className="print:hidden">
        <ScanComparison
          domain={report.meta.canonical_domain}
          scanId={reportId ?? report.meta.canonical_domain}
          overall={report.overall_score}
          components={report.components.map((c) => ({ key: c.key, name: c.name, score: c.score }))}
        />
      </div>

      {report.provisional && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--warn) 40%, var(--border))",
            background: "color-mix(in srgb, var(--warn) 8%, transparent)",
          }}
        >
          <strong>Provisional score.</strong> The crawl could not fully read this site
          {report.crawl && !report.crawl.homepage_reachable ? " (the homepage was unreachable)" : ""}
          {report.crawl && report.crawl.robots_blocked_core ? " (robots.txt blocked core pages)" : ""}
          , so the score is based on limited coverage. Treat it as an early indication and re-scan
          once the pages are reachable.
        </div>
      )}

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
            How ready the site is at each step machines take, from finding a page,
            to trusting it enough to cite, to pulling a clean answer from it.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {stages.map((s) => (
              <StageCard key={s.key} stage={s} />
            ))}
          </div>
          <p className="text-xs text-fg-subtle">
            Stage scores are diagnostic views of the components above. They do not
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
          {p.site_type && <Field label="Site type" value={p.site_type.replace(/_/g, " ")} />}
          <Field label="Brand" value={p.brand_name ?? "Unknown, needs confirmation"} />
          <Field label="Legal name" value={p.legal_name ?? "None"} />
          <Field label="Locations" value={p.locations.join(", ") || "None"} />
          <Field label="Services" value={humanizeOfferingList(p.services)} />
          <Field label="Products" value={humanizeOfferingList(p.products)} />
          <Field label="Languages" value={p.languages.join(", ") || "None"} />
        </dl>
      </Section>

      <Section title="Prompt cluster map & coverage">
        {report.clusters.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface/50 p-5 text-sm text-fg-muted">
            {report.cluster_note ||
              "No prompt clusters could be generated from the crawled content."}
          </p>
        ) : (
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
                  <td className="px-4 py-2.5">{humanizeOffering(c.label)}</td>
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
                    {c.missing_requirements.join(", ") || "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Section>

      {report.language_coverage && report.language_coverage.length > 0 && (
        <Section title="Coverage by language">
          <p className="text-sm text-fg-muted">
            Each language is scored only from its own pages, so content in one language never counts
            as coverage for another.
          </p>
          <div className="flex flex-wrap gap-3">
            {report.language_coverage.map((lc) => (
              <div
                key={lc.language}
                className="min-w-[7rem] grow basis-[30%] rounded-xl border border-border bg-surface/50 p-4"
              >
                <div className="font-mono text-xs uppercase tracking-wide text-fg-subtle">
                  {lc.language}
                </div>
                <div
                  className="mt-1 font-mono text-2xl font-semibold tabular-nums"
                  style={{ color: coverageColor(lc.prompt_coverage_score) }}
                >
                  {lc.prompt_coverage_score.toFixed(0)}
                </div>
                <div className="text-xs text-fg-subtle">
                  {lc.pages} page{lc.pages === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Full action backlog">
        {report.fix_prompt_master && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 40%, var(--border))",
              background: "color-mix(in srgb, var(--accent) 6%, var(--surface))",
            }}
          >
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Fix everything with one prompt</h3>
              <p className="mt-0.5 text-xs text-fg-muted">
                Paste this into ChatGPT, Claude or hand it to your developer. It only uses facts
                that are true of your site and never invents any.
              </p>
            </div>
            <CopyPromptButton text={report.fix_prompt_master} label="Copy master prompt" />
          </div>
        )}
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
                <span className="font-mono text-accent">Fix</span> {a.recommendation}
              </p>
              <p className="mt-2 text-xs text-fg-subtle">
                <span className="font-mono">Verify</span> {a.how_to_verify}
              </p>
              {a.evidence.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 font-mono text-xs text-fg-subtle">
                  {a.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {a.fix_prompt && (
                <div className="mt-3 flex justify-end border-t border-border pt-3">
                  <CopyPromptButton text={a.fix_prompt} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </Section>

      {(() => {
        const queries = citationQueries(report);
        if (queries.length === 0) return null;
        const domain = report.meta.canonical_domain;
        const lang = kitLanguage(report);
        return (
          <Section title="Test it yourself in ChatGPT or Claude">
            <CitationSelfTest
              queries={queries}
              measurement={measurementPrompt(queries, lang)}
              evaluation={evaluationPrompt(domain, lang)}
              protocol={proProtocolMarkdown(report)}
              domain={domain}
            />
          </Section>
        );
      })()}

      <Section title="Methodology & limitations">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/50 p-5 text-sm text-fg-muted">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs">{report.meta.methodology_version}</span>
            <LevelChip level={report.overall_level} />
            <span className="font-mono text-xs text-fg-subtle">
              confidence {report.meta.confidence_score.toFixed(0)}/100 · {report.meta.confidence_band}
            </span>
          </div>
          {report.crawl && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.7rem] text-fg-subtle">
              <span>crawl {report.crawl.status}</span>
              <span>analyzed {report.crawl.pages_analyzed}</span>
              <span>fetched {report.crawl.pages_fetched}</span>
              {report.crawl.errors > 0 && <span>errors {report.crawl.errors}</span>}
              {report.crawl.robots_skipped > 0 && <span>robots-skipped {report.crawl.robots_skipped}</span>}
            </div>
          )}
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

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/50 p-5 text-sm text-fg-muted">
          <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            Grounded in published research
          </span>
          <p className="text-xs">{RESEARCH_NOTE}</p>
          <ul className="flex flex-col gap-1 text-xs">
            {RESEARCH_BASIS.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-fg"
                >
                  {s.title}
                </a>{" "}
                <span className="text-fg-subtle">
                  — {s.authors}, {s.venue} {s.year}
                </span>
              </li>
            ))}
          </ul>
          <a
            href="/methodology"
            className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2 hover:text-fg sm:min-h-0"
          >
            How scoring works, in full →
          </a>
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
