// Best-effort per-IP sliding-window limiters. In-memory and per-instance — a
// fully robust cross-instance limit needs a shared store — but they blunt
// rapid-fire abuse from a single client. For scans, the DB-side domain cooldown
// in createQuickScan is the primary cost control; for promo redemption this is
// the only brute-force protection, so it is intentionally strict.

function slidingLimiter(maxPerWindow: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return function allow(key: string): boolean {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= maxPerWindow) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return true;
  };
}

/** Anonymous scan submissions: 8 per 10 minutes per IP. */
export const checkScanRateLimit = slidingLimiter(8, 10 * 60 * 1000);

/** Public AI-crawler checks: 20 per 10 minutes per IP. Looser than a scan
 *  because the work is one small GET, tight enough that the endpoint is not
 *  usable as a general-purpose fetch proxy. */
export const checkCrawlerCheckRateLimit = slidingLimiter(20, 10 * 60 * 1000);

/** Promo-code redemption attempts: 10 per 10 minutes per IP (brute-force guard). */
export const checkPromoRateLimit = slidingLimiter(10, 10 * 60 * 1000);
