import Stripe from "stripe";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { query } from "@/lib/db";
import { grantStripeEntitlement, hasEntitlement } from "@/lib/payments/entitlements";
import { createQuickScan } from "@/lib/scans/repository";
import { POST as webhookPost } from "@/app/api/stripe/webhook/route";
import { closeDb, resetDb } from "./helpers";

const WEBHOOK_SECRET = "whsec_test_secret";

beforeEach(resetDb);
afterAll(closeDb);

async function paymentRows(scanId: string) {
  return query<{
    provider: string;
    status: string;
    amount: number;
    currency: string;
    stripe_checkout_session_id: string | null;
    stripe_payment_intent_id: string | null;
  }>(
    `SELECT provider, status, amount, currency,
            stripe_checkout_session_id, stripe_payment_intent_id
       FROM payments WHERE scan_id = $1`,
    [scanId],
  );
}

describe("grantStripeEntitlement", () => {
  it("writes a paid stripe payments row and is idempotent", async () => {
    const { scanId } = await createQuickScan("grant.example");
    expect(await hasEntitlement(scanId)).toBe(false);

    const facts = {
      scanId,
      checkoutSessionId: "cs_test_1",
      paymentIntentId: "pi_test_1",
      customerId: "cus_test_1",
      amount: 24900,
      currency: "EUR",
    };
    expect(await grantStripeEntitlement(facts)).toBe(true);
    expect(await hasEntitlement(scanId)).toBe(true);

    // A second grant (e.g. a redelivered event) must not add a second row.
    expect(await grantStripeEntitlement({ ...facts, checkoutSessionId: "cs_test_2" })).toBe(true);

    const rows = await paymentRows(scanId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: "stripe",
      status: "paid",
      amount: 24900,
      currency: "eur", // normalized to lower-case
      stripe_checkout_session_id: "cs_test_1",
      stripe_payment_intent_id: "pi_test_1",
    });
  });

  it("returns false for an unknown scan id", async () => {
    const granted = await grantStripeEntitlement({
      scanId: "00000000-0000-0000-0000-000000000000",
      checkoutSessionId: "cs_missing",
      amount: 100,
      currency: "eur",
    });
    expect(granted).toBe(false);
  });
});

describe("Stripe webhook end-to-end", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  function signedRequest(event: object): Request {
    const payload = JSON.stringify(event);
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    return new Request("https://app.test/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": header, "content-type": "application/json" },
      body: payload,
    });
  }

  function completedEvent(scanId: string, overrides: Record<string, unknown> = {}) {
    return {
      id: `evt_${Math.random().toString(36).slice(2)}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_live_1",
          object: "checkout.session",
          client_reference_id: scanId,
          metadata: { scan_id: scanId },
          payment_intent: "pi_live_1",
          customer: "cus_live_1",
          amount_total: 24900,
          currency: "eur",
          ...overrides,
        },
      },
    };
  }

  it("grants entitlement on a validly-signed checkout.session.completed", async () => {
    const { scanId } = await createQuickScan("webhook.example");
    const event = completedEvent(scanId);

    const res = await webhookPost(signedRequest(event));
    expect(res.status).toBe(200);
    expect(await hasEntitlement(scanId)).toBe(true);

    const rows = await paymentRows(scanId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: "stripe", status: "paid" });

    const ledger = await query<{ status: string }>(
      `SELECT status FROM stripe_events WHERE stripe_event_id = $1`,
      [event.id],
    );
    expect(ledger[0]?.status).toBe("processed");
  });

  it("ignores a redelivered event id without double-granting", async () => {
    const { scanId } = await createQuickScan("dupe.example");
    const event = completedEvent(scanId);

    const first = await webhookPost(signedRequest(event));
    expect(first.status).toBe(200);
    // Same event id, freshly signed — the ledger must dedupe it.
    const second = await webhookPost(signedRequest(event));
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ duplicate: true });

    const rows = await paymentRows(scanId);
    expect(rows).toHaveLength(1);
  });

  it("falls back to metadata when client_reference_id is absent", async () => {
    const { scanId } = await createQuickScan("meta.example");
    const event = completedEvent(scanId, { client_reference_id: null });

    const res = await webhookPost(signedRequest(event));
    expect(res.status).toBe(200);
    expect(await hasEntitlement(scanId)).toBe(true);
  });
});
