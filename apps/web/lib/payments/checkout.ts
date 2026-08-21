// Stripe checkout seam. Intentionally a stub until Stripe is connected — the
// entitlement model (lib/payments/entitlements.ts) and the paywall UI already
// work via promo codes, so wiring Stripe later is a fill-in-the-blanks job:
//
//   1. `pnpm add stripe`, set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET /
//      STRIPE_PRICE_GEO_READINESS_FULL in Vercel.
//   2. In createCheckoutSession: create a Stripe Checkout Session for the scan
//      (client_reference_id = scanId, success_url → /report/{scanId}).
//   3. In app/api/stripe/webhook: verify the signature, and on
//      checkout.session.completed insert the SAME 'paid' payments row that
//      grantPromoEntitlement writes (provider 'stripe'). The gate is unchanged.

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_configured" };

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_GEO_READINESS_FULL);
}

/**
 * Create a checkout session for a scan's full audit. Until Stripe is wired this
 * returns { ok: false, reason: "not_configured" } and callers fall back to the
 * promo-code path.
 */
export async function createCheckoutSession(_scanId: string): Promise<CheckoutResult> {
  if (!stripeConfigured()) return { ok: false, reason: "not_configured" };
  // TODO(stripe): create and return a real Checkout Session URL. See notes above.
  return { ok: false, reason: "not_configured" };
}
