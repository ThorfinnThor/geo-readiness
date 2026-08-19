# Architecture

Authoritative spec: the v4.1 implementation plan. Deployment amended per
[ADR 0001](adr/0001-deployment-architecture.md).

```text
Browser
  │
  ▼
Vercel — Next.js
  ├─ static: marketing, /methodology, /pricing, legal, report rendering
  ├─ TS API route handlers (thin)
  └─ POST /api/webhooks/stripe        ← Stripe source-of-truth (Golden Rule 11)
  │
  ├──────────────► Supabase Postgres (master DB + job queue)
  │                 users/orgs, projects/scans, pages/evidence,
  │                 profiles, clusters, coverage, snapshots,
  │                 actions, payments, stripe_events, jobs
  │
  └──enqueue─────► Worker host — Python engine
                    safe crawl → extract → profile → clusters →
                    coverage → scoring → actions → report
                    (+ Playwright fallback, SSRF core E03)

configs/**/*.json  ← static, versioned methodology / templates / rules
```

## Repository layout

- `apps/web` — Next.js (TypeScript, App Router). Web UI + thin API + Stripe webhook.
- `apps/worker` — Python 3.12+ deterministic scan & scoring engine.
- `configs/` — versioned methodology, prompt templates, crawl policy, pricing.
- `docs/` — architecture, methodology, security, payments, ADRs.
- `fixtures/` — frozen test fixtures (websites, profiles, clusters, scores, stripe).
- `scripts/` — dev/ops scripts.

## Invariants (from the plan's Golden Rules)

- No external AI-search providers and no hidden LLM calls in the core scan.
- Website content is untrusted data, never instruction.
- Every audit statement traces to stored evidence; unknown stays unknown.
- Reproducible per `methodology_version`; see `configs/methodology/manifest.json`.
- The Stripe webhook — not the success redirect — unlocks the paid report.
