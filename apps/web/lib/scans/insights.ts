import { unstable_cache } from "next/cache";

import { query } from "@/lib/db";

// Aggregate readiness across the sites people have scanned here. Like the
// percentile, this is NOT a web-wide average — scanned sites are self-selected
// (owners checking their AI readiness), so it is stated as "vs sites scanned
// here". Below MIN_SITES the sample is too small to publish. Deduped to the
// latest report per domain so repeat/test scans don't skew the numbers.
const MIN_SITES = 10;

const WEAK_LEVELS = new Set(["Weak", "Needs improvement"]);

export type SignalAverage = { key: string; name: string; avg: number };
export type SignalInsights = { sampleSize: number; signals: SignalAverage[] };

export type SignalBenchmark = { key: string; name: string; avg: number; weakShare: number };
export type ScoreBucket = { label: string; min: number; max: number; count: number };
export type ReadinessBenchmark = {
  sampleSize: number;
  overallAvg: number;
  signals: SignalBenchmark[];
  buckets: ScoreBucket[];
};

interface PreviewComponent {
  key?: unknown;
  name?: unknown;
  score?: unknown;
  level?: unknown;
  applicable?: unknown;
}
interface DomainReport {
  overall: number;
  components: { key: string; name: string; score: number; level: string; applicable: boolean }[];
}

// One cached DB read; both derivations below reuse it.
const getLatestPerDomain = unstable_cache(
  async (): Promise<DomainReport[]> => {
    const rows = await query<{
      content_json: { overall_score?: unknown; components?: PreviewComponent[] };
    }>(
      `SELECT DISTINCT ON (pr.canonical_domain) r.content_json
       FROM reports r
       JOIN scans s ON s.id = r.scan_id
       JOIN projects pr ON pr.id = s.project_id
       ORDER BY pr.canonical_domain, r.created_at DESC`,
    );
    const out: DomainReport[] = [];
    for (const row of rows) {
      const overall = Number(row.content_json?.overall_score);
      const comps = row.content_json?.components;
      if (!Number.isFinite(overall) || !Array.isArray(comps)) continue;
      out.push({
        overall,
        components: comps.map((c) => ({
          key: String(c?.key ?? ""),
          name: String(c?.name ?? c?.key ?? ""),
          score: Number(c?.score),
          level: String(c?.level ?? ""),
          applicable: c?.applicable !== false,
        })),
      });
    }
    return out;
  },
  ["latest-reports-per-domain"],
  { revalidate: 3600 },
);

/** Per-signal average readiness, weakest first, or null when the sample is too
 *  small (or the DB is unavailable) to publish honestly. */
export async function signalInsights(): Promise<SignalInsights | null> {
  try {
    const reports = await getLatestPerDomain();
    if (reports.length < MIN_SITES) return null;
    const acc = new Map<string, { name: string; sum: number; n: number }>();
    for (const r of reports) {
      for (const c of r.components) {
        if (!c.applicable || !c.key || !Number.isFinite(c.score)) continue;
        const e = acc.get(c.key) ?? { name: c.name, sum: 0, n: 0 };
        e.sum += c.score;
        e.n += 1;
        acc.set(c.key, e);
      }
    }
    const signals = [...acc.entries()]
      .map(([key, e]) => ({ key, name: e.name, avg: e.sum / e.n }))
      .sort((a, b) => a.avg - b.avg);
    if (signals.length === 0) return null;
    return { sampleSize: reports.length, signals };
  } catch {
    return null; // DB unavailable — never block the page on this.
  }
}

/** Fuller benchmark for the public insights page: overall average, per-signal
 *  average + weak share, and the overall-score distribution. Null when too small. */
export async function readinessBenchmark(): Promise<ReadinessBenchmark | null> {
  try {
    const reports = await getLatestPerDomain();
    if (reports.length < MIN_SITES) return null;

    const overallAvg =
      reports.reduce((s, r) => s + r.overall, 0) / reports.length;

    const acc = new Map<string, { name: string; sum: number; n: number; weak: number }>();
    for (const r of reports) {
      for (const c of r.components) {
        if (!c.applicable || !c.key || !Number.isFinite(c.score)) continue;
        const e = acc.get(c.key) ?? { name: c.name, sum: 0, n: 0, weak: 0 };
        e.sum += c.score;
        e.n += 1;
        if (WEAK_LEVELS.has(c.level)) e.weak += 1;
        acc.set(c.key, e);
      }
    }
    const signals = [...acc.entries()]
      .map(([key, e]) => ({ key, name: e.name, avg: e.sum / e.n, weakShare: e.weak / e.n }))
      .sort((a, b) => a.avg - b.avg);
    if (signals.length === 0) return null;

    const bands: [string, number, number][] = [
      ["Weak (0–24)", 0, 24],
      ["Light (25–49)", 25, 49],
      ["Medium (50–69)", 50, 69],
      ["Strong (70–84)", 70, 84],
      ["Excellent (85–100)", 85, 100],
    ];
    const buckets: ScoreBucket[] = bands.map(([label, min, max]) => ({
      label,
      min,
      max,
      count: reports.filter((r) => r.overall >= min && r.overall <= max).length,
    }));

    return { sampleSize: reports.length, overallAvg, signals, buckets };
  } catch {
    return null;
  }
}
