# GEO — AI Search Readiness Audit

Measures how ready a website is to be understood and used as a source by AI
search and answer systems. **V1 does not measure actual rankings or visibility**
in ChatGPT or any other AI platform — it is a deterministic, evidence-based
website readiness audit with **zero external AI-provider calls**.

- Product spec: v4.1 implementation plan (Opus 4.8 primary / Sol gates).
- Deployment: Vercel + Supabase + Python worker — see
  [docs/adr/0001-deployment-architecture.md](docs/adr/0001-deployment-architecture.md).

## Layout

| Path          | What                                                       |
| ------------- | ---------------------------------------------------------- |
| `apps/web`    | Next.js (TypeScript) — web UI, thin API, Stripe webhook    |
| `apps/worker` | Python 3.12+ — deterministic scan & scoring engine         |
| `configs/`    | Versioned methodology / prompt templates / crawl / pricing |
| `docs/`       | Architecture, methodology, security, payments, ADRs        |
| `fixtures/`   | Frozen test fixtures                                       |

## Prerequisites

- Node ≥ 24, pnpm ≥ 11
- Python ≥ 3.12, [uv](https://docs.astral.sh/uv/)
- Docker (local Postgres for dev/tests)

## Getting started

```bash
make setup      # install web + worker deps
make db-up      # start local Postgres (docker compose)
cp .env.example .env
make web-dev    # run the Next.js app at http://localhost:3000
```

## Common tasks

```bash
make test       # web (vitest) + worker (pytest)
make lint       # eslint + ruff
make typecheck  # tsc --noEmit
make ci         # everything CI runs
```

## Guardrails

No external AI-search providers or hidden LLM calls in the core scan. Website
content is untrusted data. Every audit statement traces to stored evidence.
Reproducible per `configs/methodology/manifest.json`. The Stripe **webhook** —
not the success redirect — unlocks the paid report.
