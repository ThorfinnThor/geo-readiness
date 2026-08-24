// Lazily-constructed Stripe client. Kept out of checkout.ts/webhook so both the
// checkout seam and the webhook share one instance, and so importing either in a
// context without STRIPE_SECRET_KEY (e.g. the promo-only path) never throws until
// a Stripe call is actually made.
import Stripe from "stripe";

let client: Stripe | null = null;

/** The shared Stripe client. Throws if STRIPE_SECRET_KEY is not configured. */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // No explicit apiVersion: pin to the account's default so a dashboard upgrade
  // doesn't require a code change. The SDK types tolerate omitting it.
  client = new Stripe(key);
  return client;
}
