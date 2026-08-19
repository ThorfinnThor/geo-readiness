// Server-side sessions. The cookie holds an opaque token; the DB stores only
// its sha256 hash. Lookups enforce expiry and revocation.
import { query } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/auth/tokens";

export const SESSION_COOKIE = "geo_session";
// Absolute session lifetime.
export const SESSION_TTL_DAYS = 30;

export interface SessionContext {
  sessionId: string;
  userId: string;
}

export interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  ipHash?: string | null;
}

/** Create a session; returns the raw token to put in the cookie (shown once). */
export async function createSession(input: CreateSessionInput): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.userId, tokenHash, expires, input.userAgent ?? null, input.ipHash ?? null],
  );
  return token;
}

/** Resolve a session token to its context, or null if invalid/expired/revoked. */
export async function getSession(token: string | undefined): Promise<SessionContext | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = await query<{ id: string; user_id: string }>(
    `UPDATE sessions
       SET last_used_at = now()
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()
     RETURNING id, user_id`,
    [tokenHash],
  );
  const row = rows[0];
  return row ? { sessionId: row.id, userId: row.user_id } : null;
}

/** Revoke the session for a given token (idempotent). */
export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await query(
    `UPDATE sessions SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)],
  );
}

/** Revoke every active session for a user (e.g. password change, "log out all"). */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await query(
    `UPDATE sessions SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}
