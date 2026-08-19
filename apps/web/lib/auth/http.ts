// HTTP glue for auth route handlers: cookie builders, client-IP hashing, and
// the same-origin CSRF guard. Kept separate from the service so the security
// logic stays framework-agnostic and unit-testable.
import type { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { hashIp } from "@/lib/auth/tokens";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/auth/session";
import { CSRF_COOKIE, isSameOrigin } from "@/lib/auth/csrf";

const isProd = process.env.NODE_ENV === "production";

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setCsrfCookie(res: NextResponse, token: string): void {
  // Readable by JS (double-submit): not HttpOnly, but SameSite=Lax + random.
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  });
}

/** Hash of the client IP derived from proxy headers (we never store raw IPs). */
export function clientIpHash(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : null;
  return hashIp(ip);
}

/**
 * Reject cross-site mutating requests. Origin/Referer host must equal the
 * request's own Host. Throws AuthError('forbidden') otherwise.
 */
export function assertSameOrigin(req: Request): void {
  const host = req.headers.get("host");
  if (!host) throw new AuthError("forbidden");
  const ok = isSameOrigin(
    req.headers.get("origin"),
    req.headers.get("referer"),
    [host],
  );
  if (!ok) throw new AuthError("forbidden");
}
