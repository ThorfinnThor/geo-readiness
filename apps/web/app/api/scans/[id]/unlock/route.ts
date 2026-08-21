import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/auth/http";
import { AuthError } from "@/lib/auth/errors";
import { grantPromoEntitlement, isValidPromoCode } from "@/lib/payments/entitlements";
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
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = (await req.json()) as { code?: unknown };
    if (typeof body.code !== "string" || !isValidPromoCode(body.code.trim())) {
      return NextResponse.json({ error: "invalid_code" }, { status: 403 });
    }

    const granted = await grantPromoEntitlement(id);
    if (!granted) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
