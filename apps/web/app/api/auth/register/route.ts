import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { registerUser } from "@/lib/auth/service";
import { assertSameOrigin } from "@/lib/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const result = await registerUser(body.email, body.password);

    // In non-production, surface the verification token so the flow is testable
    // without an email provider. Never expose it in production.
    const payload: Record<string, unknown> = { ok: true };
    if (process.env.NODE_ENV !== "production") {
      payload.verificationToken = result.verificationToken;
    }
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === "email_taken" ? 409 : err.code === "forbidden" ? 403 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    if (err instanceof Error && err.message.startsWith("password must be")) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
