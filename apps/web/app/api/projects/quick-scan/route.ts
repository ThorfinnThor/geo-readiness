import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/auth/http";
import { AuthError } from "@/lib/auth/errors";
import { InvalidDomainError, normalizeDomain } from "@/lib/scans/domain";
import { createQuickScan } from "@/lib/scans/repository";

export const runtime = "nodejs";

// POST /api/projects/quick-scan — anonymous lead-magnet scan (§2.1).
// Abuse controls (rate limit / domain cooldown) are hardened in E15.
export async function POST(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);
    const body = (await req.json()) as { domain?: unknown };
    if (typeof body.domain !== "string") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const domain = normalizeDomain(body.domain);
    const { scanId } = await createQuickScan(domain);
    return NextResponse.json({ scanId, domain }, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidDomainError) {
      return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
