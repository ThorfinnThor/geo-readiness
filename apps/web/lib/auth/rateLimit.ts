// DB-backed login rate limiting. Counts recent failed attempts by email and by
// hashed IP within a rolling window. Hardened further in E15.
import { query } from "@/lib/db";

export const LOGIN_WINDOW_MINUTES = 15;
export const MAX_FAILED_PER_EMAIL = 5;
export const MAX_FAILED_PER_IP = 20;

export async function recordLoginAttempt(
  email: string,
  ipHash: string | null,
  successful: boolean,
): Promise<void> {
  await query(
    `INSERT INTO login_attempts (email, ip_hash, successful) VALUES ($1, $2, $3)`,
    [email.toLowerCase(), ipHash, successful],
  );
}

/** True if either the email or the IP has exceeded its failure budget. */
export async function isLoginRateLimited(
  email: string,
  ipHash: string | null,
): Promise<boolean> {
  const rows = await query<{ email_fails: string; ip_fails: string }>(
    `SELECT
       count(*) FILTER (WHERE email = $1) AS email_fails,
       count(*) FILTER (WHERE ip_hash IS NOT NULL AND ip_hash = $2) AS ip_fails
     FROM login_attempts
     WHERE successful = false
       AND created_at > now() - ($3 || ' minutes')::interval`,
    [email.toLowerCase(), ipHash, String(LOGIN_WINDOW_MINUTES)],
  );
  const row = rows[0];
  if (!row) return false;
  return (
    Number(row.email_fails) >= MAX_FAILED_PER_EMAIL ||
    Number(row.ip_fails) >= MAX_FAILED_PER_IP
  );
}
