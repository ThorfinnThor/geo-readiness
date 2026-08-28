import { scorePercentile } from "@/lib/scans/distribution";

// "Higher than X% of sites scanned here." Renders nothing when the sample is too
// small or the DB is unavailable, so it is purely additive. The label is honest:
// it compares against sites scanned here, not the whole web.
export async function ScorePercentile({ score }: { score: number }) {
  const result = await scorePercentile(score);
  if (!result) return null;

  // The sample size is intentionally not shown while it is still small — it would
  // clash with the "websites analyzed" counter and read as a contradiction. The
  // percentile itself is computed on the real, per-domain-deduped scores. Once
  // there is enough data we surface the count again and align every number.
  return (
    <p className="text-xs text-fg-subtle">
      Higher than <span className="font-semibold text-fg-muted">{result.percentile}%</span> of sites
      scanned here. This compares against sites scanned with this tool, not the whole web.
    </p>
  );
}
