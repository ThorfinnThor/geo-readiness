import { unstable_cache } from "next/cache";

import { query } from "@/lib/db";

// Total scans ever run (all scans, paid or not — every scan writes a row). Cached
// for 60s, so it's at most one DB query per minute regardless of traffic: no
// rebuilds, negligible cost. Grows into a trust signal over time.
const getScanCount = unstable_cache(
  async (): Promise<number> => {
    const rows = await query<{ n: number }>("SELECT count(*)::int AS n FROM scans");
    return rows[0]?.n ?? 0;
  },
  ["homepage-scan-count"],
  { revalidate: 60 },
);

export async function ScanCounter() {
  let count = 0;
  try {
    count = await getScanCount();
  } catch {
    return null; // DB unavailable (e.g. building without a database) — hide gracefully.
  }
  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-2.5" aria-label={`${count} websites analyzed`}>
      <span className="relative flex h-2 w-2" aria-hidden>
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: "var(--excellent)" }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: "var(--excellent)" }}
        />
      </span>
      <span className="text-lg font-semibold tabular-nums text-fg">
        {count.toLocaleString("en-US")}
      </span>
      <span className="text-sm text-fg-muted">websites analyzed</span>
    </div>
  );
}
