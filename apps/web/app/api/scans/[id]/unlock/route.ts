import { NextResponse } from "next/server";

import { assertSameOrigin, clientIpHash } from "@/lib/auth/http";
import { AuthError } from "@/lib/auth/errors";
import { grantPromoEntitlement, isValidPromoCode } from "@/lib/payments/entitlements";
import { checkPromoRateLimit } from "@/lib/scans/abuse";
import { isUuid } from "@/lib/scans/repository";

export const runtime = "nodejs";

// POST /api/scans/[id]/unlock — redeem a promo code to unlock the full report.
// Stripe's webhook will grant the same entitlement later; this is the free path
// used before payments are connected.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    assertSameOrigin(req);

    // Throttle redemption attempts so the single promo code cannot be brute-forced.
    if (!checkPromoRateLimit(clientIpHash(req) ?? "unknown")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = (await req.json()) as { code?: unknown };
    if (typeof body.code !== "string" || !isValidPromoCode(body.code.trim())) {
      return NextResponse.json({ error: "invalid_code" }, { status: 403 });
    }

    const result = await grantPromoEntitlement(id);
    if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (result === "limit_reached") {
      return NextResponse.json({ error: "limit_reached" }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
