# Deployment runbook — free-scan staging

Target: a live end-to-end **free scan** (submit a domain → worker processes it →
report renders). No payments, email, or public abuse exposure yet — see
[Not in staging](#not-in-staging).

Recommended worker: a **free always-on VM** (Oracle Cloud / GCP e2-micro) running
the prebuilt container — $0 and instant scan pickup. A GitHub Actions fallback
(free, no VM, ~30–60s/scan) is documented under step 2. Production-grade managed
hosts are [ADR-0003](adr/0003-worker-hosting.md).

```
 Browser ─> Vercel (Next.js web + API) ─enqueue job─> Supabase Postgres
                                                          ▲   │ (jobs queue)
                     free VM: docker run geo-worker ──────┘   │ drains + writes
                     (always-on loop, <1s pickup)             ┘  report back
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

## 2. Worker on a free always-on VM (Oracle Cloud / GCP) — free **and** instant

The only way to get $0 **and** <1s scan pickup: a free always-on Linux VM running
the prebuilt worker image. Recommended: **Oracle Cloud Always Free** (most
generous) or **Google Cloud `e2-micro`** (always-free in `us-west1`/`us-central1`/
`us-east1`). Both are free forever; both ask for a card to verify identity but
won't charge on the free tier.

The container image is published to GHCR by
`.github/workflows/publish-worker.yml` (multi-arch: works on ARM *and* x86).
**One-time:** make the package public so the VM can pull it without auth — GitHub
→ your profile → **Packages → geo-readiness-worker → Package settings → Change
visibility → Public**.

On the VM (Ubuntu; ~15 min one-time):

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sudo sh

# 2. DB connection (Supabase SESSION pooler, 5432; note the +asyncpg scheme)
cat > worker.env <<'EOF'
DATABASE_URL_ASYNC=postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
METHODOLOGY_VERSION=geo-readiness-v2
LOG_LEVEL=info
EOF

# 3. Run it — restarts on crash/reboot; migrates then drains the queue forever
sudo docker run -d --name geo-worker --restart=always --env-file worker.env \
  ghcr.io/<owner-lowercase>/geo-readiness-worker:latest

# 4. Watch it come up (look for 'alembic upgrade head' then 'worker loop starting')
sudo docker logs -f geo-worker
```

To update after new code lands on `main` (the image rebuilds automatically):

```bash
sudo docker pull ghcr.io/<owner-lowercase>/geo-readiness-worker:latest
sudo docker rm -f geo-worker
sudo docker run -d --name geo-worker --restart=always --env-file worker.env \
  ghcr.io/<owner-lowercase>/geo-readiness-worker:latest
```

Because it's always awake, it picks up a scan the instant Vercel enqueues it — no
dispatch token needed (skip `GITHUB_DISPATCH_TOKEN`/`GITHUB_REPO` in step 3).

> **Zero-setup fallback (no VM, but slower):** GitHub Actions can drain the queue
> instead — `.github/workflows/process-scans.yml`, triggered per scan by the web
> app. Free, but ~30–60s cold-start per scan and less reliable. To use it, set the
> repo secret `DATABASE_URL_ASYNC` (session pooler) + a fine-grained PAT
> (Contents: write) as Vercel's `GITHUB_DISPATCH_TOKEN`, and re-add a `schedule:`
> backstop in that workflow. See [ADR-0003](adr/0003-worker-hosting.md).

## 3. Web on Vercel

- New Vercel project from the repo. **Root Directory = `apps/web`** (Vercel
  detects Next.js + the pnpm workspace from the root `pnpm-lock.yaml`).
- Environment variables:
  | Var | Value |
  |---|---|
  | `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres` (**transaction pooler**, 6543) |
  | `NEXT_PUBLIC_APP_URL` | the deployed URL (e.g. `https://geo.vercel.app`) |
  | `APP_ENV` | `staging` |
  | `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPO` | *only for the Actions fallback* — omit when using the always-on VM |
- Deploy. Report/account routes are already `noindex` via `next.config.ts`.

> The web and worker talk **only through the Postgres queue**; the sole extra
> signal is the `repository_dispatch` the web app sends to wake the workflow. If
> `GITHUB_DISPATCH_TOKEN`/`GITHUB_REPO` are unset the app just skips the wake and
> the 15-min backstop cron still drains the queue.

## 4. Smoke test

1. Open the deployed site, submit a domain on the homepage.
2. `POST /api/projects/quick-scan` returns `{ scanId }`; the scan page polls.
3. The always-on VM worker picks the job up within ~1s and runs it; the page
   flips from pending to the rendered V2 report in a few seconds (crawl time).
4. If it stays pending: `sudo docker logs geo-worker` on the VM (did it lease the
   job? any error?), confirm the VM's `DATABASE_URL_ASYNC` and Vercel's
   `DATABASE_URL` point at the **same** Supabase project, and that the container
   logged `alembic upgrade head`. *(Actions fallback: check the "Process scans"
   run log instead.)*

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
