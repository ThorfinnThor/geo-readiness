# ADR 0003 — Worker hosting: Railway (portable container)

- **Status:** Accepted
- **Date:** 2026-08-20
- **Deciders:** Operator (ThorfinnThor), Opus 4.8 (implementer)

## Context

ADR-0001 puts the Next.js web + thin API on Vercel and the deterministic Python
scan engine on a **separate always-on worker host**, but left the specific host
"to a later ADR." The worker cannot run on Vercel: it drains a Postgres job
queue and runs minutes-long crawl+score jobs — long-running work that does not
fit Vercel's serverless execution model, and it is Python, not JS.

The web API (`createQuickScan`) enqueues a `jobs` row in Supabase Postgres. Until
a worker drains that queue, submitted scans never complete.

## Decision

Run the worker as a **portable Docker container** (`apps/worker/Dockerfile`) and
host it on **Railway** as an always-on service. The container runs
`scripts/run_worker.py` — the resilient loop (E16) with lease recovery and
graceful shutdown — after applying Alembic migrations on start.

The image is deliberately host-agnostic (plain Dockerfile, no Railway-specific
config), so Render (Background Worker) or Fly.io are drop-in alternatives if
Railway is ever unsuitable.

## Consequences

- Positive: simplest home for a long-running Python daemon; managed deploys +
  cron; easy env/secret wiring; one image runs anywhere.
- Positive: migrations run on worker start (idempotent), so there is a single
  well-defined place that owns the schema — no separate migration job needed.
- Negative / trade-offs: a second platform to operate and pay for beyond Vercel;
  Supabase connection limits must be respected (use the pooled connection string
  for the worker; keep a small pool).
- Follow-ups: JS rendering (Playwright) is NOT in the image yet — the crawler is
  HTML-only today; add a browser layer only when render support lands. Scale-out
  (multiple replicas) is already safe — leasing uses `FOR UPDATE SKIP LOCKED` and
  recovery uses lease expiry — but is untested under real concurrency.

## Alternatives considered

- **Render Background Worker** — equally good; chosen against only to pick one.
  The container runs there unchanged.
- **Fly.io** — more control (VM-like), more setup; overkill for a single queue
  drainer at this stage.
- **Vercel Cron → Python serverless** — rejected: Vercel can't run the Python
  engine, and cron-sliced execution fits neither minutes-long jobs nor the
  lease/queue model.
