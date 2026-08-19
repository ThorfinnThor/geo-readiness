// Resolve the current user/session from the request cookies (server side).
import { cookies } from "next/headers";

import { getSession, SESSION_COOKIE, type SessionContext } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";

export async function getCurrentSession(): Promise<SessionContext | null> {
  const store = await cookies();
  return getSession(store.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<SessionContext> {
  const ctx = await getCurrentSession();
  if (!ctx) throw new AuthError("forbidden");
  return ctx;
}
