// Presentational primitives for the report dashboard.
import Link from "next/link";

import { COMPONENT_GUIDE } from "@/lib/content/registry";
import type { ReportComponent, ReportStage } from "@/lib/report/types";

/** Status color per level band (§23). Returned as a CSS var so `currentColor`
 *  can drive SVG strokes and bar fills. */
export function levelColor(level: string): string {
  switch (level) {
    case "Excellent":
    case "Strong":
      return "var(--excellent)";
    case "Good":
      return "var(--good)";
    case "Needs improvement":
      return "var(--warn)";
    default:
      return "var(--weak)";
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
    case "high":
      return "var(--weak)";
    case "medium":
      return "var(--good)";
    default:
      return "var(--fg-subtle)";
  }
}

/** Radial gauge for the headline score — a hero number, not a chart. */
export function RadialScore({
  score,
  level,
  size = 168,
}: {
  score: number;
  level: string;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size, color: levelColor(level) }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb, currentColor 45%, transparent))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-semibold tabular-nums leading-none text-fg">
          {score.toFixed(0)}
        </span>
        <span className="mt-1 text-[0.7rem] uppercase tracking-widest text-fg-subtle">/ 100</span>
      </div>
    </div>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
      role="meter"
      aria-valuenow={Math.round(score)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function LevelChip({ level }: { level: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium"
      style={{
        color: levelColor(level),
        backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}

export function ComponentCard({ component }: { component: ReportComponent }) {
  const guide = COMPONENT_GUIDE[component.key];
  if (component.applicable === false || component.level === "N/A") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4 text-fg-subtle">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {component.name}
          </span>
          <span className="whitespace-nowrap font-mono text-xl font-semibold tabular-nums text-fg-subtle">
            N/A
          </span>
        </div>
        <span className="text-xs">Not applicable to this site</span>
      </div>
    );
  }
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:border-border-strong"
      style={{ color: levelColor(component.level) }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {component.name}
        </span>
        <span className="font-mono text-xl font-semibold tabular-nums text-fg">
          {component.score.toFixed(0)}
        </span>
      </div>
      <ScoreBar score={component.score} />
      <LevelChip level={component.level} />
      {guide && (
        <Link
          href={guide}
          className="mt-0.5 text-[0.7rem] text-fg-subtle underline underline-offset-2 hover:text-fg-muted"
        >
          How to improve this
        </Link>
      )}
    </div>
  );
}

/** One stage of the retrieval → citation → answer pipeline (§90). Only rendered
 *  for V2 reports; V1 emits no stages. */
export function StageCard({ stage }: { stage: ReportStage }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 p-5"
      style={{ color: levelColor(stage.level) }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-fg">{stage.name}</span>
        <span className="font-mono text-2xl font-semibold tabular-nums text-fg">
          {stage.score.toFixed(0)}
        </span>
      </div>
      <ScoreBar score={stage.score} />
      <div className="flex items-center gap-2">
        <LevelChip level={stage.level} />
      </div>
      <p className="text-xs leading-relaxed text-fg-muted">{stage.explanation}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.7rem] uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="font-mono text-sm font-medium text-fg">{value}</dd>
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
    <header className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface/50 p-6 sm:flex-row sm:items-center sm:gap-8">
      <RadialScore score={score} level={level} />
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm text-fg-muted">{domain}</span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">AI Search Readiness</h1>
            <span style={{ color: levelColor(level) }} className="text-lg font-semibold">
              {level}
            </span>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 border-t border-border pt-4">
          <Stat label="Confidence" value={confidenceBand} />
          <Stat label="Pages" value={pages} />
          <Stat label="Clusters" value={clusters} />
        </dl>
      </div>
    </header>
  );
}
