import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { login, logout, registerUser, verifyEmail } from "@/lib/auth/service";
import { getSession } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";
import { MAX_FAILED_PER_EMAIL } from "@/lib/auth/rateLimit";
import { query } from "@/lib/db";
import { closeDb, resetDb } from "./helpers";

const EMAIL = "user@example.com";
const PASSWORD = "correct-horse-battery";

beforeEach(resetDb);
afterAll(closeDb);

describe("registration + login lifecycle", () => {
  it("registers, logs in (unverified allowed), and revokes on logout", async () => {
    const reg = await registerUser(EMAIL, PASSWORD);
    expect(reg.userId).toBeTruthy();
    expect(reg.organizationId).toBeTruthy();

    const result = await login(EMAIL, PASSWORD);
    expect(result.emailVerified).toBe(false);
    expect(result.organizationId).toBe(reg.organizationId);

    // Session resolves, then is gone after logout.
    expect(await getSession(result.sessionToken)).not.toBeNull();
    await logout(result.sessionToken);
    expect(await getSession(result.sessionToken)).toBeNull();
  });

  it("rejects duplicate email", async () => {
    await registerUser(EMAIL, PASSWORD);
    await expect(registerUser(EMAIL, PASSWORD)).rejects.toMatchObject({ code: "email_taken" });
  });

  it("verifies email → active + verified", async () => {
    const reg = await registerUser(EMAIL, PASSWORD);
    await verifyEmail(reg.verificationToken);
    const rows = await query<{ status: string; email_verified_at: Date | null }>(
      `SELECT status, email_verified_at FROM users WHERE id = $1`,
      [reg.userId],
    );
    expect(rows[0]!.status).toBe("active");
    expect(rows[0]!.email_verified_at).not.toBeNull();

    const result = await login(EMAIL, PASSWORD);
    expect(result.emailVerified).toBe(true);
  });

  it("rejects an invalid or reused verification token", async () => {
    const reg = await registerUser(EMAIL, PASSWORD);
    await expect(verifyEmail("nonsense")).rejects.toBeInstanceOf(AuthError);
    await verifyEmail(reg.verificationToken);
    // Single-use: second consume fails.
    await expect(verifyEmail(reg.verificationToken)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });
});

describe("login failures + rate limiting", () => {
  it("wrong password fails, then rate-limits after the threshold", async () => {
    await registerUser(EMAIL, PASSWORD);
    for (let i = 0; i < MAX_FAILED_PER_EMAIL; i++) {
      await expect(login(EMAIL, "wrong-password")).rejects.toMatchObject({
        code: "invalid_credentials",
      });
    }
    // Now blocked even with the correct password.
    await expect(login(EMAIL, PASSWORD)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("unknown email returns invalid_credentials (no user enumeration)", async () => {
    await expect(login("nobody@example.com", PASSWORD)).rejects.toMatchObject({
      code: "invalid_credentials",
    });
  });
});
