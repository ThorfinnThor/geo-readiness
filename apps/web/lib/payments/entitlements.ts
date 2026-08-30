// Full-report entitlement. A scan is entitled once a `payments` row exists for
// it with status 'paid'. Two paths write that row identically:
//   - promo unlock (now) — provider 'promo', amount 0
//   - Stripe webhook (later) — provider 'stripe' (see lib/payments/checkout.ts)
// so the gate below is unchanged when Stripe is connected.
import { timingSafeEqual } from "node:crypto";

import { query } from "@/lib/db";

export const FULL_AUDIT_PRODUCT = "geo_readiness_full";

// Promo redemption cap. The promo code (env PROMO_CODE) is a single shared code;
// this bounds how many times it can unlock a full report. The count is scoped to
// redemptions on or after PROMO_CAP_SINCE, so switching to a fresh code (e.g.
// PROMO10) starts a clean budget and older promo unlocks never eat into it.
const PROMO_CAP_SINCE = "2026-08-30T10:50:30Z";
const DEFAULT_PROMO_MAX_REDEMPTIONS = 11;

function promoMaxRedemptions(): number {
  const raw = process.env.PROMO_MAX_REDEMPTIONS;
  if (raw == null || raw.trim() === "") return DEFAULT_PROMO_MAX_REDEMPTIONS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_PROMO_MAX_REDEMPTIONS;
}

/** True once promo redemptions since PROMO_CAP_SINCE have hit the configured cap. */
async function promoLimitReached(): Promise<boolean> {
  const rows = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM payments
      WHERE provider = 'promo' AND status = 'paid' AND paid_at >= $1`,
    [PROMO_CAP_SINCE],
  );
  return (rows[0]?.n ?? 0) >= promoMaxRedemptions();
}

/** Outcome of a promo redemption attempt against a scan. */
export type PromoGrant = "granted" | "already_entitled" | "not_found" | "limit_reached";

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
 * Grant the full-report entitlement for a scan via promo code. Idempotent: a
 * scan that is already entitled returns "already_entitled" without consuming a
 * redemption. Enforces the promo cap (promoLimitReached) before granting, so a
 * fresh grant past the limit returns "limit_reached". Resolves the scan's
 * org/project (both required on the payments row) from the scan itself.
 */
export async function grantPromoEntitlement(scanId: string): Promise<PromoGrant> {
  if (await hasEntitlement(scanId)) return "already_entitled";

  const owner = await resolveScanOwner(scanId);
  if (owner === null) return "not_found";

  if (await promoLimitReached()) return "limit_reached";

  await query(
    `INSERT INTO payments
       (organization_id, project_id, scan_id, provider, product_code,
        amount, currency, status, paid_at)
     VALUES ($1, $2, $3, 'promo', $4, 0, 'eur', 'paid', now())`,
    [owner.organization_id, owner.project_id, scanId, FULL_AUDIT_PRODUCT],
  );
  return "granted";
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
