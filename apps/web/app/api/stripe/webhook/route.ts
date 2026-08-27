import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { query } from "@/lib/db";
import { grantStripeEntitlement } from "@/lib/payments/entitlements";
import { getStripe } from "@/lib/payments/stripe";

export const runtime = "nodejs";

// POST /api/stripe/webhook — Stripe delivers payment events here.
//
// This endpoint is NOT same-origin protected: it is called by Stripe, not the
// browser. Its authentication IS the signature check below, so the raw request
// body must be verified before anything reads it. On checkout.session.completed
// we grant the same entitlement the promo path grants. Redeliveries are safe:
// the stripe_events ledger dedupes by event id, and the payments insert is
// idempotent on the unique checkout-session id.
export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Read the EXACT raw bytes Stripe signed (a Buffer avoids any text-decode edge
  // case that would break signature verification).
  const raw = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    // Signature check failed. Surface the exact reason (safe to expose — the
    // message never contains secrets) so the cause is visible in Stripe's
    // delivery view and the server logs, instead of a bare "invalid_signature".
    const detail = err instanceof Error ? err.message : String(err);
    console.error("stripe webhook signature verification failed:", detail);
    return NextResponse.json({ error: "invalid_signature", detail }, { status: 400 });
  }

  // Idempotency ledger: first sighting of this event id wins; a redelivery finds
  // the row already present (no RETURNING rows) and is acknowledged without
  // reprocessing.
  const claimed = await query<{ id: string }>(
    `INSERT INTO stripe_events (stripe_event_id, event_type, status)
     VALUES ($1, $2, 'received')
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [event.id, event.type],
  );
  if (claimed.length === 0) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  let status = "ignored";
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const scanId = session.client_reference_id ?? session.metadata?.scan_id ?? null;
    if (scanId) {
      const granted = await grantStripeEntitlement({
        scanId,
        checkoutSessionId: session.id,
        paymentIntentId: asId(session.payment_intent),
        customerId: asId(session.customer),
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "eur",
      });
      status = granted ? "processed" : "unknown_scan";
    } else {
      status = "missing_scan_id";
    }
  }

  await query(
    `UPDATE stripe_events SET processed_at = now(), status = $2 WHERE stripe_event_id = $1`,
    [event.id, status],
  );

  return NextResponse.json({ received: true }, { status: 200 });
}

/** A Stripe field that may be an id string or an expanded object → its id. */
function asId(value: string | { id: string } | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.id;
}
