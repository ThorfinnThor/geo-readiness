// Full-report entitlement. A scan is entitled once a `payments` row exists for
// it with status 'paid'. Two paths write that row identically:
//   - promo unlock (now) — provider 'promo', amount 0
//   - Stripe webhook (later) — provider 'stripe' (see lib/payments/checkout.ts)
// so the gate below is unchanged when Stripe is connected.
import { timingSafeEqual } from "node:crypto";

import { query } from "@/lib/db";

export const FULL_AUDIT_PRODUCT = "geo_readiness_full";

// Two promo codes are supported side by side:
//   - PROMO_CODE          — the standing code, unlimited redemptions
//   - PROMO_CODE_LIMITED  — a capped code (PROMO_LIMITED_MAX, default 11)
// Limited redemptions are stamped with a distinct product_code so they can be
// counted on their own for the cap. Entitlement (hasEntitlement) ignores
// product_code, so a scan unlocked with either code behaves like any paid one,
// and neither code affects the other's budget.
const LIMITED_PROMO_PRODUCT = "geo_readiness_full_promo";
const DEFAULT_LIMITED_PROMO_MAX = 11;

function limitedPromoMax(): number {
  const raw = process.env.PROMO_LIMITED_MAX;
  if (raw == null || raw.trim() === "") return DEFAULT_LIMITED_PROMO_MAX;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LIMITED_PROMO_MAX;
}

/** Which configured promo code a submitted code matches. */
export type PromoKind = "unlimited" | "limited";

/** Outcome of a promo redemption attempt against a scan. */
export type PromoGrant = "granted" | "already_entitled" | "not_found" | "limit_reached";

/**
 * Constant-time compare of a submitted code against an expected value. Both
 * sides are trimmed so a stray space or newline in the configured env value
 * (a common copy-paste artefact) does not silently reject a correct code.
 */
function codeMatches(code: string, expected: string | undefined): boolean {
  const want = expected?.trim();
  const got = code.trim();
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Classify a submitted promo code. Both codes are always compared so neither can
 * short-circuit the other's timing. Returns null when the code matches nothing.
 */
export function classifyPromoCode(code: string): PromoKind | null {
  const unlimited = codeMatches(code, process.env.PROMO_CODE);
  const limited = codeMatches(code, process.env.PROMO_CODE_LIMITED);
  if (unlimited) return "unlimited";
  if (limited) return "limited";
  return null;
}

/** True once redemptions of the limited promo code have reached its cap. */
async function limitedPromoLimitReached(): Promise<boolean> {
  const rows = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM payments
      WHERE provider = 'promo' AND status = 'paid' AND product_code = $1`,
    [LIMITED_PROMO_PRODUCT],
  );
  return (rows[0]?.n ?? 0) >= limitedPromoMax();
}

/** True if the scan's full report has been unlocked (paid or promo). */
export async function hasEntitlement(scanId: string): Promise<boolean> {
  const rows = await query<{ one: number }>(
    `SELECT 1 AS one FROM payments WHERE scan_id = $1 AND status = 'paid' LIMIT 1`,
    [scanId],
  );
  return rows.length > 0;
}

/** True if a submitted code matches any configured promo code. */
export function isValidPromoCode(code: string): boolean {
  return classifyPromoCode(code) !== null;
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
 * redemption. For the limited code, enforces its cap before granting (returns
 * "limit_reached" once hit) and stamps LIMITED_PROMO_PRODUCT so those
 * redemptions are counted on their own; the unlimited code is never capped.
 * Resolves the scan's org/project (both required on the payments row).
 */
export async function grantPromoEntitlement(
  scanId: string,
  kind: PromoKind,
): Promise<PromoGrant> {
  if (await hasEntitlement(scanId)) return "already_entitled";

  const owner = await resolveScanOwner(scanId);
  if (owner === null) return "not_found";

  if (kind === "limited" && (await limitedPromoLimitReached())) return "limit_reached";

  const productCode = kind === "limited" ? LIMITED_PROMO_PRODUCT : FULL_AUDIT_PRODUCT;

  await query(
    `INSERT INTO payments
       (organization_id, project_id, scan_id, provider, product_code,
        amount, currency, status, paid_at)
     VALUES ($1, $2, $3, 'promo', $4, 0, 'eur', 'paid', now())`,
    [owner.organization_id, owner.project_id, scanId, productCode],
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
