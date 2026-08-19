// Shared readiness presentation helpers.
// The scoring ENGINE is deterministic Python (apps/worker); this module only
// maps an already-computed 0..100 score to a display level (§23) and holds the
// mandatory product disclaimer (§41). No scoring logic lives here.

export type ReadinessLevel =
  | "Excellent"
  | "Strong"
  | "Good"
  | "Needs improvement"
  | "Weak";

/**
 * Map an overall readiness score (0..100) to its level band (§23).
 * Throws on out-of-range input so display bugs surface instead of silently
 * mislabeling a score.
 */
export function scoreLevel(score: number): ReadinessLevel {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError(`readiness score out of range: ${score}`);
  }
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 50) return "Needs improvement";
  return "Weak";
}

// Persistent, non-negotiable disclaimer (Golden Rules §0, §41): V1 measures
// readiness, never actual AI-platform visibility or rankings.
export const READINESS_DISCLAIMER =
  "Measures website readiness and sourceability. Does not measure actual rankings or visibility in ChatGPT or other AI platforms.";
