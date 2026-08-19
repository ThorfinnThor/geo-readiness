# ADR 0002 — Authentication mechanism: custom DB-backed sessions in Next.js

- **Status:** Accepted (pending SOL_HIGH security review per §48)
- **Date:** 2026-08-19
- **Deciders:** Opus 4.8 (implementer); operator to confirm at Sol review

## Context

§29 requires, for V1: anonymous quick scans (with abuse controls), account
ownership for paid reports, HttpOnly secure sessions, SameSite, CSRF, verified
email for paid accounts, standard password hashing, session revocation, login
rate limits, and audit events. The exact mechanism is explicitly deferred to
an ADR in E02. §5 notes "prefer minimal vendors if desired."

Constraints specific to this build:

- The browser talks to the **Next.js app on Vercel**, which owns cookies and
  the session lifecycle. Auth therefore lives in the web layer, not the Python
  worker (which is a headless engine).
- The database schema is **owned by the Python worker's Alembic migrations**
  (ADR 0001). Auth tables are defined there; the web app queries them.
- This is an autonomous build with **no access to external service
  credentials**. A managed auth provider (e.g. Supabase Auth) cannot be
  provisioned or tested here without a real project + keys, and would introduce
  a second identity source alongside our Alembic-owned `users` table.

## Decision

Custom, database-backed authentication implemented in the Next.js app:

- **Password hashing:** Argon2id via `@node-rs/argon2` (native, prebuilt
  binaries; runs on Vercel's Node runtime and locally).
- **Sessions:** opaque 256-bit random token in an HttpOnly, Secure,
  SameSite=Lax cookie. Only `sha256(token)` is stored (`sessions.token_hash`).
  Sessions carry `expires_at`, `revoked_at`, `last_used_at`; revocation is a
  row update. Idle + absolute lifetime enforced server-side.
- **CSRF:** SameSite=Lax cookie + strict `Origin`/`Host` check on all mutating
  requests, plus a double-submit CSRF token for defense in depth.
- **Email verification:** single-use hashed tokens (`email_verification_tokens`);
  required before an account may unlock a paid report. Actual email delivery is
  a later integration; in dev the token is surfaced via a dev-only channel.
- **Login rate limiting:** DB-backed attempt ledger (`login_attempts`) keyed by
  email and hashed IP; thresholds enforced server-side. Hardened further in E15.
- **Tenancy:** `organization_members(organization_id, user_id, role)` drives an
  org context resolved from the session. A repository layer scopes every
  tenant-owned query by `organization_id`; resources are UUID-addressed and a
  cross-tenant lookup returns not-found, never another org's row.

## Consequences

- Positive: single Alembic-owned identity source; no external-credential
  dependency for V1; fully locally testable (Postgres-backed); minimal attack
  surface we can hand to the Sol review in full.
- Negative / trade-offs: we own security-critical code (hashing, sessions,
  CSRF, rate limiting) rather than delegating it; the web app reads auth tables
  in TypeScript while the schema is defined in Python (accepted coupling).
- Gate: **SOL_HIGH review required** before E02 is considered done (§48).

## Alternatives considered

- **Supabase Auth (managed)** — offloads most security primitives, but needs a
  real Supabase project + keys (unavailable in this autonomous build), adds a
  second identity source, and couples V1 to a vendor. Revisit if the operator
  prefers managed auth.
- **Auth in the Python worker (FastAPI)** — keeps DB access single-language, but
  the browser session/cookies belong at the Vercel edge; proxying auth through
  Next.js to Python complicates the cookie model for no clear V1 benefit.
