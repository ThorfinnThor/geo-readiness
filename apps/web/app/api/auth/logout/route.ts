import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { logout } from "@/lib/auth/service";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { assertSameOrigin, clearSessionCookie } from "@/lib/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(req);
    const store = await cookies();
    await logout(store.get(SESSION_COOKIE)?.value);
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
