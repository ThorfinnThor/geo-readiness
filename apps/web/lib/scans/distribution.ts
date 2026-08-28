import { unstable_cache } from "next/cache";

import { query } from "@/lib/db";

// Where a new site sits among the sites people have scanned here. This is NOT a
// web-wide average — the sites scanned here are self-selected (owners checking
// their AI readiness), so the percentile is explicitly "vs sites scanned here".
// Below MIN_SITES the sample is too small to be meaningful and we show nothing.
const MIN_SITES = 30;

/** Latest overall score per domain, so repeat/test scans don't skew the curve.
 *  Cached for an hour: at most one DB read per hour regardless of traffic. */
const getScores = unstable_cache(
  async (): Promise<number[]> => {
    const rows = await query<{ score: number }>(
      `SELECT (content_json->>'overall_score')::float AS score
       FROM (
         SELECT DISTINCT ON (pr.canonical_domain) r.content_json
         FROM reports r
         JOIN scans s ON s.id = r.scan_id
         JOIN projects pr ON pr.id = s.project_id
         ORDER BY pr.canonical_domain, r.created_at DESC
       ) latest`,
    );
    return rows
      .map((r) => Number(r.score))
      .filter((s) => Number.isFinite(s))
      .sort((a, b) => a - b);
  },
  ["scan-score-distribution"],
  { revalidate: 3600 },
);

export type Percentile = { percentile: number; sampleSize: number };

/** The share of scanned sites this score beats, or null when the sample is too
 *  small (or the DB is unavailable) to state a percentile honestly. */
export async function scorePercentile(score: number): Promise<Percentile | null> {
  let scores: number[];
  try {
    scores = await getScores();
  } catch {
    return null; // DB unavailable — never block the report on this.
  }
  if (scores.length < MIN_SITES) return null;
  const below = scores.filter((s) => s < score).length;
  return { percentile: Math.round((100 * below) / scores.length), sampleSize: scores.length };
}
