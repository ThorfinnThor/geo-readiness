// Full-report entitlement. A scan is entitled once a `payments` row exists for
// it with status 'paid'. Two paths write that row identically:
//   - promo unlock (now) — provider 'promo', amount 0
//   - Stripe webhook (later) — provider 'stripe' (see lib/payments/checkout.ts)
// so the gate below is unchanged when Stripe is connected.
import { timingSafeEqual } from "node:crypto";

import { query } from "@/lib/db";

export const FULL_AUDIT_PRODUCT = "geo_readiness_full";

/** True if the scan's full report has been unlocked (paid or promo). */
export async function hasEntitlement(scanId: string): Promise<boolean> {
  const rows = await query<{ one: number }>(
    `SELECT 1 AS one FROM payments WHERE scan_id = $1 AND status = 'paid' LIMIT 1`,
    [scanId],
  );
  return rows.length > 0;
}

/** Constant-time compare of a submitted promo code against PROMO_CODE. */
export function isValidPromoCode(code: string): boolean {
  const expected = process.env.PROMO_CODE;
  if (!expected || !code) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Grant the full-report entitlement for a scan via promo code. Idempotent:
 * a second call is a no-op. Resolves the scan's org/project (both required on
 * the payments row) from the scan itself.
 */
export async function grantPromoEntitlement(scanId: string): Promise<boolean> {
  if (await hasEntitlement(scanId)) return true;

  const owner = await query<{ organization_id: string; project_id: string }>(
    `SELECT pr.organization_id, pr.id AS project_id
       FROM scans s JOIN projects pr ON pr.id = s.project_id
      WHERE s.id = $1`,
    [scanId],
  );
  if (owner.length === 0) return false;
  const { organization_id, project_id } = owner[0]!;

  await query(
    `INSERT INTO payments
       (organization_id, project_id, scan_id, provider, product_code,
        amount, currency, status, paid_at)
     VALUES ($1, $2, $3, 'promo', $4, 0, 'eur', 'paid', now())`,
    [organization_id, project_id, scanId, FULL_AUDIT_PRODUCT],
  );
  return true;
}
