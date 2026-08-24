import { NextResponse } from "next/server";

import { assertSameOrigin, clientIpHash } from "@/lib/auth/http";
import { AuthError } from "@/lib/auth/errors";
import { checkScanRateLimit } from "@/lib/scans/abuse";
import { InvalidDomainError, normalizeDomain } from "@/lib/scans/domain";
import { createQuickScan } from "@/lib/scans/repository";
import { triggerWorker } from "@/lib/scans/dispatch";

export const runtime = "nodejs";

// POST /api/projects/quick-scan — anonymous lead-magnet scan (§2.1).
// Abuse controls: per-IP burst limit (best-effort) + per-domain cooldown/dedup
// in createQuickScan (the primary cost control).
export async function POST(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);

    if (!checkScanRateLimit(clientIpHash(req) ?? "unknown")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await req.json()) as { domain?: unknown };
    if (typeof body.domain !== "string") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const domain = normalizeDomain(body.domain);
    const { scanId, reused } = await createQuickScan(domain);
    // Only wake the worker for a genuinely new scan (a reused one is already done).
    if (!reused) await triggerWorker();
    return NextResponse.json({ scanId, domain, reused }, { status: 201 });
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
