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

Two-tier, chosen by cost/latency:

- **Staging — GitHub Actions** (`.github/workflows/process-scans.yml`). Free on
  the public repo. The web app fires a `repository_dispatch` when a scan is
  enqueued; the workflow runs `scripts/process_jobs.py` (recover stranded jobs →
  drain → exit) after `alembic upgrade head`. A 15-min backstop cron covers any
  missed dispatch. Accepts ~1–2 min per-scan latency (fresh runner each time) in
  exchange for zero always-on cost.
- **Production — always-on container** (`apps/worker/Dockerfile`), running the
  resilient loop `scripts/run_worker.py` (E16: lease recovery + graceful
  shutdown), hosted on **Railway** (Render/Fly are drop-in — the image is
  host-agnostic). <1s pickup; the right tool once latency or reliability matters.

Both entrypoints and the container already exist, so moving from Actions to an
always-on host is a config change, not a rewrite.

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
