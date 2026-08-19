import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { login } from "@/lib/auth/service";
import { assertSameOrigin, clientIpHash, setSessionCookie } from "@/lib/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const result = await login(body.email, body.password, {
      userAgent: req.headers.get("user-agent"),
      ipHash: clientIpHash(req),
    });

    const res = NextResponse.json({
      ok: true,
      organizationId: result.organizationId,
      emailVerified: result.emailVerified,
    });
    setSessionCookie(res, result.sessionToken);
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === "rate_limited" ? 429 : err.code === "forbidden" ? 403 : 401;
      return NextResponse.json({ error: err.code }, { status });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
