// Stripe checkout seam. The entitlement model (lib/payments/entitlements.ts) and
// the paywall UI work via promo codes with or without Stripe; when Stripe is
// configured, createCheckoutSession opens a hosted Checkout page whose completion
// webhook writes the SAME 'paid' payments row grantPromoEntitlement writes, so the
// gate (hasEntitlement) is unchanged.
//
// To go live: set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET /
// STRIPE_PRICE_GEO_READINESS_FULL in Vercel, create the Product/Price in Stripe,
// and register the /api/stripe/webhook endpoint in the Stripe dashboard.
import { grantStripeEntitlement } from "./entitlements";
import { getStripe } from "./stripe";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_configured" };

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.id;
}

/**
 * Verify a completed Checkout Session directly with Stripe and grant the
 * entitlement synchronously. Called on the payment-success return so unlocking
 * does not race the webhook. Idempotent (grantStripeEntitlement de-dupes), so a
 * later webhook for the same session is harmless. Returns true if paid + granted.
 */
export async function confirmCheckoutSession(scanId: string, sessionId: string): Promise<boolean> {
  if (!stripeConfigured()) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return false;
    const sid = session.client_reference_id ?? session.metadata?.scan_id ?? null;
    if (sid !== scanId) return false; // session must belong to this scan
    return await grantStripeEntitlement({
      scanId,
      checkoutSessionId: session.id,
      paymentIntentId: idOf(session.payment_intent),
      customerId: idOf(session.customer),
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "eur",
    });
  } catch {
    return false;
  }
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_GEO_READINESS_FULL);
}

/**
 * Create a hosted Checkout Session for a scan's full audit. `origin` is the
 * caller's own origin (validated same-origin upstream), used for the return URLs.
 * Until Stripe is wired this returns { ok: false, reason: "not_configured" } and
 * callers fall back to the promo-code path.
 *
 * No payments row is written here: the row is created only on
 * `checkout.session.completed` (see app/api/stripe/webhook), keyed by the unique
 * checkout session id, so an abandoned checkout leaves nothing behind.
 */
export async function createCheckoutSession(
  scanId: string,
  origin: string,
): Promise<CheckoutResult> {
  const price = process.env.STRIPE_PRICE_GEO_READINESS_FULL;
  if (!price) return { ok: false, reason: "not_configured" };

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    // Both carry the scan id: client_reference_id is the first-class field and
    // metadata is the resilient fallback the webhook also reads.
    client_reference_id: scanId,
    metadata: { scan_id: scanId },
    // session_id lets the success page verify the payment with Stripe directly and
    // unlock immediately, without waiting for the webhook.
    success_url: `${origin}/report/${scanId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/scan/${scanId}`,
  });

  if (!session.url) return { ok: false, reason: "not_configured" };
  return { ok: true, url: session.url };
}
