// Best-effort per-IP burst limiter for the anonymous scan endpoint. In-memory
// and per-instance — a fully robust cross-instance limit needs a shared store —
// but it blunts rapid-fire abuse from a single client. The DB-side domain
// cooldown in createQuickScan is the primary cost control (it prevents the
// expensive worker run from repeating for the same domain).

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 8;

const hits = new Map<string, number[]>();

/** Returns true if the request is allowed, false if the key is rate-limited. */
export function checkScanRateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return true;
}
