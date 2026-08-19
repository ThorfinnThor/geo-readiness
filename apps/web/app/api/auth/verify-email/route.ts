import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { verifyEmail } from "@/lib/auth/service";
import { assertSameOrigin } from "@/lib/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token !== "string") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    await verifyEmail(body.token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === "invalid_token" ? 400 : 403;
      return NextResponse.json({ error: err.code }, { status });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
