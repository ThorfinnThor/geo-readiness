# Deployment runbook — free-scan staging

Target: a live end-to-end **free scan** (submit a domain → worker processes it →
report renders). No payments, email, or public abuse exposure yet — see
[Not in staging](#not-in-staging).

Topology (per [ADR-0001](adr/0001-deployment-architecture.md) +
[ADR-0003](adr/0003-worker-hosting.md)):

```
 Browser ──> Vercel (Next.js web + API) ──enqueue job──> Supabase Postgres
                                                              │  (jobs queue)
                          Railway (Python worker loop) ◀──────┘  leases + drains
                                        │
                                        └─ writes snapshot/report back to Postgres
```

## 1. Supabase (database)

1. Create a Supabase project (pick a region near your users; set a strong DB
   password — you'll paste it into the connection strings).
2. Click **Connect** (top bar) → **Connection string**. Supabase shows three
   options; you need two of them (both go through the IPv4 "Supavisor" pooler —
   host looks like `aws-0-<region>.pooler.supabase.com`, user `postgres.<ref>`):
   - **Transaction pooler**, port **6543** → for **Vercel** (serverless: many
     short connections).
   - **Session pooler**, port **5432** → for the **Railway worker** (long-lived
     and runs migrations; session mode supports the full DDL Alembic needs).
   - *(Ignore "Direct connection" — it's IPv6-only and Railway can't reach it.)*
3. No manual SQL needed — the worker runs `alembic upgrade head` on start and
   owns the schema.

## 2. Worker on Railway

First time with Railway — step by step:

1. Sign up at **railway.com** with your GitHub account.
2. **New Project → Deploy from GitHub repo** → authorize Railway → pick
   `ThorfinnThor/geo-readiness`. (Skip adding a Railway database — we use Supabase.)
3. Open the created service → **Settings → Build**:
   - **Builder**: Dockerfile.
   - **Dockerfile Path**: `apps/worker/Dockerfile`.
   - Leave **Root Directory** empty — the build context must be the repo root
     (the image copies both `apps/worker/` and the root `configs/`).
4. **Settings → Networking**: do nothing. This is a background worker, not a web
   service — it needs no public domain or port.
5. **Variables** tab → add:
   | Var | Value |
   |---|---|
   | `DATABASE_URL_ASYNC` | `postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` (**session pooler**, 5432) |
   | `METHODOLOGY_VERSION` | `geo-readiness-v2` |
   | `LOG_LEVEL` | `info` |
   | `WORKER_ID` | optional; defaults to the hostname |

   Note the `postgresql+asyncpg://` scheme (not `postgresql://`) and that the
   username is `postgres.<ref>`, exactly as Supabase's session-pooler string shows.
6. **Deploy**. Watch **Deploy Logs** for `alembic upgrade head` running, then
   `worker loop starting`. That means it's live and draining the queue.
7. One replica is enough for staging. Multiple are safe (leasing uses
   `FOR UPDATE SKIP LOCKED`) but untested under real concurrency.

## 3. Web on Vercel

- New Vercel project from the repo. **Root Directory = `apps/web`** (Vercel
  detects Next.js + the pnpm workspace from the root `pnpm-lock.yaml`).
- Environment variables:
  | Var | Value |
  |---|---|
  | `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres` (**transaction pooler**, 6543) |
  | `NEXT_PUBLIC_APP_URL` | the deployed URL (e.g. `https://geo.vercel.app`) |
  | `APP_ENV` | `staging` |
- Deploy. Report/account routes are already `noindex` via `next.config.ts`.

> The web and worker talk **only through the Postgres queue** — there is no
> web→worker HTTP call in this design, so `WORKER_BASE_URL` / `WORKER_INTERNAL_TOKEN`
> in `.env.example` are unused for now.

## 4. Smoke test

1. Open the deployed site, submit a domain on the homepage.
2. `POST /api/projects/quick-scan` returns `{ scanId }`; the scan page polls.
3. Within a few seconds the Railway worker leases the job, runs the pipeline, and
   writes the report; the page flips from pending to the rendered V2 report.
4. If it stays pending: check Railway logs (worker leased the job?), confirm
   `DATABASE_URL(_ASYNC)` point at the **same** Supabase project, and that
   migrations ran (`alembic upgrade head` line in the worker boot log).

## Migrations

The worker image runs `alembic upgrade head` on every start (idempotent). To run
them manually against Supabase:

```bash
cd apps/worker
DATABASE_URL_ASYNC='postgresql+asyncpg://…:5432/postgres' uv run alembic upgrade head
```

## Not in staging

Deliberately excluded — these gate a **public, paid** launch, not this free-scan
milestone:

- **Payments (Stripe checkout + webhook, E14)** — not built; the paywall is UI-only.
- **Email delivery** — registration currently returns the verification token in
  the response instead of emailing it; wire a provider before real accounts.
- **Abuse / rate-limit hardening (E15)** — `quick-scan` is open; keep the staging
  URL private or behind allow-listing until this lands.
- **Mandatory SOL_HIGH security reviews** — auth (E02), SSRF + crawler (E03/E04,
  incl. the DNS-rebinding/TOCTOU hardening noted in `crawler/transport.py`), and
  scoring (E10). These block production.
- **Crawler WAF-403 hardening** — some sites (Mayo, Shopify) block the bot;
  tracked as a follow-up.
