import { scorePercentile } from "@/lib/scans/distribution";

// "Higher than X% of sites scanned here." Renders nothing when the sample is too
// small or the DB is unavailable, so it is purely additive. The label is honest:
// it compares against sites scanned here, not the whole web.
export async function ScorePercentile({ score }: { score: number }) {
  const result = await scorePercentile(score);
  if (!result) return null;

  return (
    <p className="text-xs text-fg-subtle">
      Higher than <span className="font-semibold text-fg-muted">{result.percentile}%</span> of the{" "}
      {result.sampleSize.toLocaleString("en-US")} sites scanned here. This compares against sites
      scanned with this tool, not the whole web.
    </p>
  );
}
