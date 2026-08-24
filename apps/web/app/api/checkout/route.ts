import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/auth/http";
import { AuthError } from "@/lib/auth/errors";
import { createCheckoutSession } from "@/lib/payments/checkout";
import { hasEntitlement } from "@/lib/payments/entitlements";
import { isUuid } from "@/lib/scans/repository";

export const runtime = "nodejs";

// POST /api/checkout — start a Stripe Checkout for a scan's full audit.
// Returns { url } to redirect to, { alreadyPaid: true } if the scan is already
// unlocked, or 503 { error: "not_configured" } when Stripe isn't wired (the UI
// then falls back to the promo path).
export async function POST(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);

    const body = (await req.json()) as { scanId?: unknown };
    const scanId = typeof body.scanId === "string" ? body.scanId : "";
    if (!isUuid(scanId)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Don't create a charge for a scan that's already unlocked.
    if (await hasEntitlement(scanId)) {
      return NextResponse.json({ alreadyPaid: true }, { status: 200 });
    }

    const host = req.headers.get("host");
    const origin = req.headers.get("origin") ?? (host ? `https://${host}` : "");
    const result = await createCheckoutSession(scanId, origin);
    if (!result.ok) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ url: result.url }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
