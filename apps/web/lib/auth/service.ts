// Auth orchestration: registration, email verification, login, logout.
// Security-critical (E02, SOL_HIGH review required).
import type { PoolClient } from "pg";

import { query, withTransaction } from "@/lib/db";
import { AuthError } from "@/lib/auth/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { createSession, revokeSession } from "@/lib/auth/session";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/auth/rateLimit";

export const EMAIL_VERIFICATION_TTL_HOURS = 24;

// A real Argon2id hash (computed once, cached) used to spend comparable time on
// unknown-email logins so response timing does not reveal account existence.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("timing-equalizer-not-a-secret");
  }
  return dummyHashPromise;
}

export interface RegisterResult {
  userId: string;
  organizationId: string;
  verificationToken: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(rawEmail: string, password: string): Promise<RegisterResult> {
  const email = normalizeEmail(rawEmail);
  const passwordHash = await hashPassword(password);
  const verificationToken = generateToken();
  const verificationHash = hashToken(verificationToken);

  return withTransaction(async (client: PoolClient) => {
    let userId: string;
    try {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (email, status) VALUES ($1, 'pending') RETURNING id`,
        [email],
      );
      userId = inserted.rows[0]!.id;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        throw new AuthError("email_taken");
      }
      throw err;
    }

    await client.query(
      `INSERT INTO user_credentials (user_id, password_hash) VALUES ($1, $2)`,
      [userId, passwordHash],
    );

    const org = await client.query<{ id: string }>(
      `INSERT INTO organizations (name, owner_user_id) VALUES ($1, $2) RETURNING id`,
      [`${email}'s organization`, userId],
    );
    const organizationId = org.rows[0]!.id;

    await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [organizationId, userId],
    );

    const expires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 3_600_000);
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, verificationHash, expires],
    );

    return { userId, organizationId, verificationToken };
  });
}

/** Consume a verification token and mark the user's email verified + active. */
export async function verifyEmail(token: string): Promise<{ userId: string }> {
  const tokenHash = hashToken(token);
  return withTransaction(async (client: PoolClient) => {
    const rows = await client.query<{ id: string; user_id: string }>(
      `UPDATE email_verification_tokens
         SET consumed_at = now()
       WHERE token_hash = $1
         AND consumed_at IS NULL
         AND expires_at > now()
       RETURNING id, user_id`,
      [tokenHash],
    );
    const row = rows.rows[0];
    if (!row) throw new AuthError("invalid_token");
    await client.query(
      `UPDATE users SET email_verified_at = now(), status = 'active' WHERE id = $1`,
      [row.user_id],
    );
    return { userId: row.user_id };
  });
}

export interface LoginContext {
  userAgent?: string | null;
  ipHash?: string | null;
}

export interface LoginResult {
  userId: string;
  organizationId: string | null;
  emailVerified: boolean;
  sessionToken: string;
}

export async function login(
  rawEmail: string,
  password: string,
  ctx: LoginContext = {},
): Promise<LoginResult> {
  const email = normalizeEmail(rawEmail);

  if (await isLoginRateLimited(email, ctx.ipHash ?? null)) {
    throw new AuthError("rate_limited");
  }

  const rows = await query<{
    user_id: string;
    password_hash: string;
    email_verified_at: Date | null;
    organization_id: string | null;
  }>(
    `SELECT u.id AS user_id,
            c.password_hash,
            u.email_verified_at,
            m.organization_id
     FROM users u
     JOIN user_credentials c ON c.user_id = u.id
     LEFT JOIN organization_members m ON m.user_id = u.id AND m.role = 'owner'
     WHERE u.email = $1`,
    [email],
  );
  const row = rows[0];

  // Always run a verify to keep timing uniform for unknown emails.
  let ok = false;
  if (row) {
    ok = await verifyPassword(row.password_hash, password);
  } else {
    await verifyPassword(await getDummyHash(), password);
  }

  if (!row || !ok) {
    await recordLoginAttempt(email, ctx.ipHash ?? null, false);
    throw new AuthError("invalid_credentials");
  }

  await recordLoginAttempt(email, ctx.ipHash ?? null, true);
  const sessionToken = await createSession({
    userId: row.user_id,
    userAgent: ctx.userAgent ?? null,
    ipHash: ctx.ipHash ?? null,
  });

  return {
    userId: row.user_id,
    organizationId: row.organization_id,
    emailVerified: row.email_verified_at !== null,
    sessionToken,
  };
}

export async function logout(token: string | undefined): Promise<void> {
  await revokeSession(token);
}
