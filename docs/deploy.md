# Deployment runbook — free-scan staging

Target: a live end-to-end **free scan** (submit a domain → worker processes it →
report renders). No payments, email, or public abuse exposure yet — see
[Not in staging](#not-in-staging).

Worker: **GitHub Actions** — free, no server. The web app fires a
`repository_dispatch` the moment a scan is enqueued; a workflow drains the queue.
Each scan takes **~60 seconds** (a fresh runner spins up per scan) — the UI states
this up front. A free always-on VM or managed host (instant pickup) is documented
as a faster alternative under step 2 and [ADR-0003](adr/0003-worker-hosting.md).

```
 Browser ─> Vercel (Next.js web + API) ─enqueue job─> Supabase Postgres
                     │                                    ▲   │ (jobs queue)
                     └ repository_dispatch ─> GitHub Actions   │ drains + writes
                       (process-scans, ~60s)             ┘  report back
```

## 1. Supabase (database)

1. Create a Supabase project (pick a region near your users; set a strong DB
   password — you'll paste it into the connection strings).
2. Click **Connect** (top bar) → **Connection string**. Supabase shows three
   options; you need two of them (both go through the IPv4 "Supavisor" pooler —
   host looks like `aws-0-<region>.pooler.supabase.com`, user `postgres.<ref>`):
   - **Transaction pooler**, port **6543** → for **Vercel** (serverless: many
     short connections).
   - **Session pooler**, port **5432** → for the **worker** (runs migrations;
     session mode supports the full DDL Alembic needs).
   - *(Ignore "Direct connection" — it's IPv6-only; the runners can't reach it.)*
3. No manual SQL needed — the worker runs `alembic upgrade head` on start and
   owns the schema.

## 2. Worker on GitHub Actions

The workflow `.github/workflows/process-scans.yml` drains the queue. It fires when
the web app enqueues a scan (`repository_dispatch`), on a 10-min backstop schedule
(catches misses + reclaims stranded jobs), and manually. Each scan takes ~60s (a
fresh runner spins up, installs deps from cache, migrates, then drains). Two
things to set up:

**a) Repo secret (so the workflow can reach the DB):**
- GitHub repo → **Settings → Secrets and variables → Actions → New repository
  secret**:
  | Secret | Value |
  |---|---|
  | `DATABASE_URL_ASYNC` | `postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` (**session pooler**, 5432) |

  Note the `postgresql+asyncpg://` scheme (not `postgresql://`) and the username
  `postgres.<ref>`, exactly as Supabase's session-pooler string shows.

**b) A token so Vercel can trigger the workflow per scan:**
- Create a **fine-grained Personal Access Token** (GitHub → Settings → Developer
  settings → Fine-grained tokens): repository access = `ThorfinnThor/geo-readiness`,
  permission **Contents: Read and write** (what `repository_dispatch` needs). Copy
  it — you'll paste it into Vercel as `GITHUB_DISPATCH_TOKEN` in step 3.

Test it now: GitHub repo → **Actions → Process scans → Run workflow** should go
green (reporting `done (0 job(s))` until a scan exists).

> **Want instant scans instead of ~60s?** Run the same prebuilt container on a
> free always-on VM (Oracle Cloud / GCP `e2-micro`) or a managed host. The image
> is published multi-arch to GHCR by `.github/workflows/publish-worker.yml`; make
> the package public, then on the VM:
> `docker run -d --restart=always --env-file worker.env ghcr.io/<owner>/geo-readiness-worker:latest`
> (`worker.env` holds the session-pooler `DATABASE_URL_ASYNC`). It polls the
> queue itself, so you can skip the dispatch token. See
> [ADR-0003](adr/0003-worker-hosting.md).

## 3. Web on Vercel

- New Vercel project from the repo. **Root Directory = `apps/web`** (Vercel
  detects Next.js + the pnpm workspace from the root `pnpm-lock.yaml`).
- Environment variables:
  | Var | Value |
  |---|---|
  | `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres` (**transaction pooler**, 6543) |
  | `GITHUB_DISPATCH_TOKEN` | the fine-grained PAT from step 2b (wakes the worker per scan) |
  | `GITHUB_REPO` | `ThorfinnThor/geo-readiness` |
  | `NEXT_PUBLIC_APP_URL` | the deployed URL (e.g. `https://geo.vercel.app`) |
  | `APP_ENV` | `staging` |
- Deploy. Report/account routes are already `noindex` via `next.config.ts`.

> The web and worker talk **only through the Postgres queue**; the sole extra
> signal is the `repository_dispatch` the web app sends to wake the workflow. If
> `GITHUB_DISPATCH_TOKEN`/`GITHUB_REPO` are unset the app just skips the wake and
> the 15-min backstop cron still drains the queue.

## 4. Smoke test

1. Open the deployed site, submit a domain on the homepage. The UI states the
   scan takes ~60 seconds and shows a live elapsed counter.
2. `POST /api/projects/quick-scan` returns `{ scanId }` and fires the dispatch;
   the scan page polls. In the GitHub repo **Actions** tab a "Process scans" run
   appears.
3. When that run finishes (~60s) the report is written and the page flips from
   pending to the rendered V2 report.
4. If it stays pending: check the **Actions** run log (did it drain / any error?),
   confirm the run's `DATABASE_URL_ASYNC` secret and Vercel's `DATABASE_URL` point
   at the **same** Supabase project, and that `alembic upgrade head` ran. No
   Actions run at all → check `GITHUB_DISPATCH_TOKEN` scope (Contents: write) in
   Vercel.

## Migrations

The `process-scans` workflow runs `alembic upgrade head` before draining
(idempotent), so the schema is created/updated on the first scan. To run them
manually against Supabase:

```bash
cd apps/worker
DATABASE_URL_ASYNC='postgresql+asyncpg://…:5432/postgres' uv run alembic upgrade head
```

## Alternative worker (always-on host)

If the ~1–2 min per-scan latency is too slow (or for the paid launch), run the
worker as an always-on container instead — [ADR-0003](adr/0003-worker-hosting.md).
`apps/worker/Dockerfile` runs the resilient loop (`scripts/run_worker.py`, E16:
lease recovery + graceful shutdown); host it on Railway/Render/Fly with the same
`DATABASE_URL_ASYNC` session-pooler string. It picks scans up in <1s. Switching
is a config change, not a code change — both entrypoints already exist.

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
