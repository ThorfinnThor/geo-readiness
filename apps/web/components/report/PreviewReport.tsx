// E12 — Free Preview. Shows the free-product data only: overall score, all
// component scores, and which categories need improvement. The prioritized fixes
// are represented by content-free locked placeholders — the real issue text is
// never sent to an unpaid browser (see lib/report/preview.toPreviewDoc).
import { ComponentCard, LevelChip, OverallHeader, severityColor } from "@/components/report/shared";
import { PaywallCTA } from "@/components/report/PaywallCTA";
import { ScanComparison } from "@/components/report/ScanComparison";
import { ShareButton } from "@/components/report/ShareButton";
import { TopBar } from "@/components/TopBar";
import type { PreviewDoc } from "@/lib/report/preview";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">{children}</h2>
  );
}

// A locked placeholder for one fix: the severity chip is real (it is not
// premium), the rest is a redacted skeleton — no title, problem or fix text.
function LockedCard({ severity }: { severity: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "color-mix(in srgb, var(--weak) 28%, var(--border))" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
          style={{ color: severityColor(severity), backgroundColor: "color-mix(in srgb, currentColor 14%, transparent)" }}
        >
          {severity}
        </span>
        <span className="h-3 w-40 rounded bg-fg-subtle/25" />
      </div>
      <div className="mt-3 h-2.5 w-full rounded bg-fg-subtle/15" />
      <div className="mt-2 h-2.5 w-3/4 rounded bg-fg-subtle/15" />
    </div>
  );
}

export function PreviewReport({ preview, reportId }: { preview: PreviewDoc; reportId: string }) {
  const gaps = preview.components
    .filter((c) => c.level === "Weak" || c.level === "Needs improvement")
    .sort((a, b) => a.score - b.score);
  const focus =
    gaps.length > 0
      ? gaps
      : preview.components
          .filter((c) => c.level !== "N/A")
          .sort((a, b) => a.score - b.score)
          .slice(0, 3);
  const issueCount = preview.issueCount;
  const measured = preview.meta.as_of ? preview.meta.as_of.slice(0, 10) : null;

  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-10 sm:py-14">
        <OverallHeader
          domain={preview.meta.canonical_domain}
          score={preview.overall_score}
          level={preview.overall_level}
          confidenceBand={preview.meta.confidence_band}
          pages={preview.meta.pages_analyzed}
          clusters={preview.meta.clusters_evaluated}
        />

        <div className="-mt-6 flex flex-wrap items-center justify-between gap-3">
          {measured ? (
            <p className="font-mono text-xs text-fg-subtle">
              Measured {measured}. To limit crawl load, a repeat scan of the same domain may reuse
              this result for up to 10 minutes.
            </p>
          ) : (
            <span />
          )}
          <ShareButton score={preview.overall_score} domain={preview.meta.canonical_domain} />
        </div>

        <ScanComparison
          domain={preview.meta.canonical_domain}
          scanId={reportId}
          overall={preview.overall_score}
          components={preview.components.map((c) => ({ key: c.key, name: c.name, score: c.score }))}
        />

        <section className="flex flex-col gap-3" aria-label="Component scores">
          <SectionLabel>Component scores</SectionLabel>
          {/* Flex-fill so the 7 cards form two full rows (4 + 3) with no orphan. */}
          <div className="flex flex-wrap gap-3">
            {preview.components.map((c) => (
              <div key={c.key} className="grow basis-[47%] lg:basis-[22%]">
                <ComponentCard component={c} />
              </div>
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

        {/* Locked: how many fixes and how severe, but not what they are. */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <SectionLabel>Prioritized fixes</SectionLabel>
            <span className="font-mono text-xs" style={{ color: "var(--weak)" }}>
              {issueCount} issues found
            </span>
          </div>
          <div className="relative">
            <div className="pointer-events-none max-h-[420px] select-none space-y-3 overflow-hidden">
              {preview.issueSeverities.map((severity, i) => (
                <LockedCard key={i} severity={severity} />
              ))}
            </div>
            <div
              className="absolute inset-0 flex items-end justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 12%, color-mix(in srgb, var(--bg) 82%, transparent) 70%, var(--bg) 100%)",
              }}
            >
              <PaywallCTA reportId={reportId} issueCount={issueCount} />
            </div>
          </div>
        </section>

        <p className="border-t border-border pt-6 text-xs text-fg-subtle">{preview.disclaimer}</p>
      </main>
    </>
  );
}
