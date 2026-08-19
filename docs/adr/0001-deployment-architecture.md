# ADR 0001 — Deployment architecture: Vercel + Supabase + Python worker

- **Status:** Accepted
- **Date:** 2026-08-19
- **Deciders:** Operator (ThorfinnThor), Opus 4.8 (implementer)

## Context

The implementation plan (v4.1) §4/§5 assumes a self-hosted stack: Next.js web +
FastAPI + PostgreSQL + a Postgres job queue + a worker, wired together with
docker-compose. The operator has directed a different hosting target:

- **Vercel** as the primary host.
- **Static + JSON** wherever content/config allows.
- **Supabase** as the master database, but only where a database is genuinely
  required.

The core product is a live scanner: on submitting a domain it must crawl 12–50
arbitrary pages, run SSRF/DNS-rebinding checks against live IPs, optionally
render JS with Playwright, and process a minutes-long job via a queue+worker.
That work is inherently dynamic and long-running; it cannot be static JSON and
does not fit Vercel serverless execution/runtime limits.

## Decision

- **Vercel — Next.js**: static marketing/methodology/legal pages, report
  rendering, thin TypeScript API route handlers, and the Stripe webhook
  endpoint.
- **Supabase Postgres — master DB**: users/orgs, projects/scans, pages/evidence,
  profiles, clusters, coverage, readiness snapshots, actions, payments/
  entitlements, Stripe event idempotency, and the job queue (plan §7/§31). A
  database is genuinely required here; static JSON cannot hold per-user mutable
  scan/payment state safely.
- **Separate always-on worker host** (Railway/Fly/Render — chosen in a later
  ADR): runs the **Python** scan/scoring engine per the plan. The Vercel API
  enqueues jobs; the worker leases and processes them.
- **Static JSON** retained for versioned methodology config (`configs/**`),
  cluster templates, and report presentation.

The plan's *substance* is preserved: deterministic Python engine, the Postgres
schema, the Postgres-based job queue (now on Supabase), and zero external
AI-provider calls. Only the *hosting/runtime* changes from the plan text.

## Consequences

- Positive: Vercel-native web/API and static content; managed Postgres; the
  plan's Python methodology and schema carry over unchanged; the SSRF core (E03,
  Sol-gated) still lives in the Python engine.
- Negative / trade-offs: introduces one non-Vercel service (the worker host);
  two languages (TS web/API + Python engine); the docker-compose dev story is
  replaced by Supabase + a locally-run worker (local Postgres via
  docker-compose is kept only for dev/tests).
- Follow-ups: choose the worker host (new ADR); define the web↔worker enqueue
  contract; confirm Playwright runs on the chosen worker host.

## Alternatives considered

- **All-on-Vercel (chunked functions + Vercel Cron)** — fights serverless time
  limits; Playwright is heavy/fragile on serverless. Rejected for V1 robustness.
- **Shrink V1 scope (no Playwright, ~12 HTML-only pages, no worker)** — truly
  Vercel-native but a materially smaller product than the plan defines.
  Rejected; may revisit for a "lite" tier.
