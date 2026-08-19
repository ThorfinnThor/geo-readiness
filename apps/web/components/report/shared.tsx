// Presentational primitives shared by the preview and full report.
import type { ReportComponent } from "@/lib/report/types";

export function levelClasses(level: string): string {
  switch (level) {
    case "Excellent":
    case "Strong":
      return "text-emerald-600 dark:text-emerald-400";
    case "Good":
      return "text-sky-600 dark:text-sky-400";
    case "Needs improvement":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-rose-600 dark:text-rose-400";
  }
}

export function severityClasses(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-rose-600 text-white";
    case "high":
      return "bg-amber-500 text-white";
    case "medium":
      return "bg-sky-500 text-white";
    default:
      return "bg-neutral-400 text-white";
  }
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      role="meter"
      aria-valuenow={Math.round(score)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-current"
        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
      />
    </div>
  );
}

export function ComponentCard({ component }: { component: ReportComponent }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{component.name}</span>
        <span className={`text-lg font-semibold ${levelClasses(component.level)}`}>
          {component.score.toFixed(0)}
        </span>
      </div>
      <div className={levelClasses(component.level)}>
        <ScoreBar score={component.score} />
      </div>
      <span className="text-xs text-neutral-500">{component.level}</span>
    </div>
  );
}

export function OverallHeader({
  domain,
  score,
  level,
  confidenceBand,
  pages,
  clusters,
}: {
  domain: string;
  score: number;
  level: string;
  confidenceBand: string;
  pages: number;
  clusters: number;
}) {
  return (
    <header className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">{domain}</p>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-6xl font-bold tabular-nums ${levelClasses(level)}`}>
            {score.toFixed(0)}
          </span>
          <span className="text-lg text-neutral-500">/100</span>
        </div>
        <span className={`text-xl font-semibold ${levelClasses(level)}`}>{level}</span>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-500">
        <div className="flex gap-1">
          <dt>Confidence</dt>
          <dd className="font-medium text-neutral-700 dark:text-neutral-300">{confidenceBand}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Pages analyzed</dt>
          <dd className="font-medium text-neutral-700 dark:text-neutral-300">{pages}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Clusters evaluated</dt>
          <dd className="font-medium text-neutral-700 dark:text-neutral-300">{clusters}</dd>
        </div>
      </dl>
    </header>
  );
}
