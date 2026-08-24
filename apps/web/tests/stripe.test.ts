import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCheckoutSession, stripeConfigured } from "@/lib/payments/checkout";
import { POST as webhookPost } from "@/app/api/stripe/webhook/route";

const ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_GEO_READINESS_FULL",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("Stripe checkout seam", () => {
  it("reports not-configured when env is absent", async () => {
    expect(stripeConfigured()).toBe(false);
    const result = await createCheckoutSession("scan-id", "https://example.test");
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("needs both the secret key and the price id", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(stripeConfigured()).toBe(false); // price still missing
    process.env.STRIPE_PRICE_GEO_READINESS_FULL = "price_x";
    expect(stripeConfigured()).toBe(true);
  });
});

describe("Stripe webhook signature guard", () => {
  function webhookReq(body: string, headers: Record<string, string> = {}) {
    return new Request("https://app.test/api/stripe/webhook", {
      method: "POST",
      headers,
      body,
    });
  }

  it("503s when the webhook secret is not configured", async () => {
    const res = await webhookPost(webhookReq("{}"));
    expect(res.status).toBe(503);
  });

  it("400s when the stripe-signature header is missing", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await webhookPost(webhookReq("{}"));
    expect(res.status).toBe(400);
  });

  it("400s on an invalid signature — never touching the database", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const res = await webhookPost(
      webhookReq('{"id":"evt_1","type":"checkout.session.completed"}', {
        "stripe-signature": "t=1,v1=deadbeef",
      }),
    );
    expect(res.status).toBe(400);
  });
});
