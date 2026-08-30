import { unstable_cache } from "next/cache";

import { query } from "@/lib/db";

// Aggregate signal readiness across the sites people have scanned here. Like the
// percentile, this is NOT a web-wide average — scanned sites are self-selected
// (owners checking their AI readiness), so it is stated as "vs sites scanned
// here". Below MIN_SITES the sample is too small to publish. Deduped to the
// latest report per domain so repeat/test scans don't skew the averages.
const MIN_SITES = 10;

export type SignalAverage = { key: string; name: string; avg: number };
export type SignalInsights = { sampleSize: number; signals: SignalAverage[] };

interface PreviewComponent {
  key?: unknown;
  name?: unknown;
  score?: unknown;
  applicable?: unknown;
}

const getInsights = unstable_cache(
  async (): Promise<SignalInsights> => {
    const rows = await query<{ content_json: { components?: PreviewComponent[] } }>(
      `SELECT DISTINCT ON (pr.canonical_domain) r.content_json
       FROM reports r
       JOIN scans s ON s.id = r.scan_id
       JOIN projects pr ON pr.id = s.project_id
       ORDER BY pr.canonical_domain, r.created_at DESC`,
    );

    const acc = new Map<string, { name: string; sum: number; n: number }>();
    for (const row of rows) {
      const comps = row.content_json?.components;
      if (!Array.isArray(comps)) continue;
      for (const c of comps) {
        if (c?.applicable === false) continue; // N/A signals don't count
        const score = Number(c?.score);
        if (!Number.isFinite(score)) continue;
        const key = String(c?.key ?? "");
        if (!key) continue;
        const e = acc.get(key) ?? { name: String(c?.name ?? key), sum: 0, n: 0 };
        e.sum += score;
        e.n += 1;
        acc.set(key, e);
      }
    }

    const signals = [...acc.entries()]
      .map(([key, e]) => ({ key, name: e.name, avg: e.sum / e.n }))
      .sort((a, b) => a.avg - b.avg); // weakest first

    return { sampleSize: rows.length, signals };
  },
  ["signal-averages"],
  { revalidate: 3600 },
);

/** Per-signal average readiness across scanned sites, or null when the sample is
 *  too small (or the DB is unavailable) to publish honestly. */
export async function signalInsights(): Promise<SignalInsights | null> {
  try {
    const data = await getInsights();
    if (data.sampleSize < MIN_SITES || data.signals.length === 0) return null;
    return data;
  } catch {
    return null; // DB unavailable — never block the page on this.
  }
}
