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

/** Resolve the org/project that own a scan (both required on a payments row). */
async function resolveScanOwner(
  scanId: string,
): Promise<{ organization_id: string; project_id: string } | null> {
  const owner = await query<{ organization_id: string; project_id: string }>(
    `SELECT pr.organization_id, pr.id AS project_id
       FROM scans s JOIN projects pr ON pr.id = s.project_id
      WHERE s.id = $1`,
    [scanId],
  );
  return owner[0] ?? null;
}

/**
 * Grant the full-report entitlement for a scan via promo code. Idempotent:
 * a second call is a no-op. Resolves the scan's org/project (both required on
 * the payments row) from the scan itself.
 */
export async function grantPromoEntitlement(scanId: string): Promise<boolean> {
  if (await hasEntitlement(scanId)) return true;

  const owner = await resolveScanOwner(scanId);
  if (owner === null) return false;

  await query(
    `INSERT INTO payments
       (organization_id, project_id, scan_id, provider, product_code,
        amount, currency, status, paid_at)
     VALUES ($1, $2, $3, 'promo', $4, 0, 'eur', 'paid', now())`,
    [owner.organization_id, owner.project_id, scanId, FULL_AUDIT_PRODUCT],
  );
  return true;
}

export interface StripePaymentFacts {
  scanId: string;
  checkoutSessionId: string;
  paymentIntentId?: string | null;
  customerId?: string | null;
  amount: number; // minor units (e.g. cents)
  currency: string; // ISO 4217, lower-case
}

/**
 * Grant the full-report entitlement from a completed Stripe checkout. Writes the
 * same 'paid' payments row grantPromoEntitlement writes, but with provider
 * 'stripe' and the Stripe references. Idempotent two ways: it no-ops if the scan
 * is already entitled, and the INSERT is ON CONFLICT DO NOTHING against the unique
 * stripe_checkout_session_id, so a redelivered webhook can never double-insert.
 * Returns false only when the scan can't be resolved (bad/foreign scan id).
 */
export async function grantStripeEntitlement(facts: StripePaymentFacts): Promise<boolean> {
  if (await hasEntitlement(facts.scanId)) return true;

  const owner = await resolveScanOwner(facts.scanId);
  if (owner === null) return false;

  await query(
    `INSERT INTO payments
       (organization_id, project_id, scan_id, provider, product_code,
        amount, currency, status, paid_at,
        stripe_checkout_session_id, stripe_payment_intent_id, stripe_customer_id)
     VALUES ($1, $2, $3, 'stripe', $4, $5, $6, 'paid', now(), $7, $8, $9)
     ON CONFLICT (stripe_checkout_session_id) DO NOTHING`,
    [
      owner.organization_id,
      owner.project_id,
      facts.scanId,
      FULL_AUDIT_PRODUCT,
      facts.amount,
      facts.currency.toLowerCase(),
      facts.checkoutSessionId,
      facts.paymentIntentId ?? null,
      facts.customerId ?? null,
    ],
  );
  return true;
}
