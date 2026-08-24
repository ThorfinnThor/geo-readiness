// Scan submission + read access (Supabase Postgres). The Python worker owns the
// schema (Alembic) and processes the enqueued job.
import { query, withTransaction } from "@/lib/db";
import type { ReportDocument } from "@/lib/report/types";

const ANON_EMAIL = "anonymous@geo.internal";
const DOMAIN_COOLDOWN_HOURS = Number(process.env.FREE_DOMAIN_COOLDOWN_HOURS ?? "24");
// V2 is the default methodology as of the 2026-08-20 switch (calibrated against
// the 35-site benchmark corpus). V1 stays reachable by explicit version + frozen
// behind the worker's golden regression test.
const METHODOLOGY_VERSION = "geo-readiness-v2";
const QUICK_MAX_PAGES = 12;
const QUICK_MAX_RENDERS = 2;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function ensureAnonymousOrg(): Promise<string> {
  await query(
    `INSERT INTO users (email, status) VALUES ($1, 'active')
     ON CONFLICT (email) DO NOTHING`,
    [ANON_EMAIL],
  );
  const user = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [ANON_EMAIL]);
  const userId = user[0]!.id;
  const existing = await query<{ id: string }>(
    `SELECT id FROM organizations WHERE owner_user_id = $1 ORDER BY created_at LIMIT 1`,
    [userId],
  );
  if (existing[0]) return existing[0].id;
  const org = await query<{ id: string }>(
    `INSERT INTO organizations (name, owner_user_id) VALUES ('Anonymous', $1) RETURNING id`,
    [userId],
  );
  return org[0]!.id;
}

/** Create (or reuse) a project for the domain and enqueue a fresh quick scan.
 * Returns `reused: true` when the domain cooldown returned an existing scan. */
export async function createQuickScan(domain: string): Promise<{ scanId: string; reused: boolean }> {
  const orgId = await ensureAnonymousOrg();

  // Run the whole create in one transaction, guarded by a per-domain advisory
  // lock, so two simultaneous submissions for the same domain cannot both pass
  // the dedup check and each start a scan. The lock is released on commit.
  return withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${orgId}:${domain}`]);

    const project = await client.query<{ id: string }>(
      `INSERT INTO projects (organization_id, canonical_domain) VALUES ($1, $2)
       ON CONFLICT (organization_id, canonical_domain) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [orgId, domain],
    );
    const projectId = project.rows[0]!.id;

    // Domain cooldown / dedup: within the cooldown window, reuse the most recent
    // non-failed scan for this domain instead of running the worker again. This
    // is the primary abuse/cost control — one scan per domain per window.
    const recent = await client.query<{ id: string }>(
      `SELECT id FROM scans
         WHERE project_id = $1
           AND status <> 'failed'
           AND requested_at > now() - ($2 || ' hours')::interval
         ORDER BY requested_at DESC
         LIMIT 1`,
      [projectId, String(DOMAIN_COOLDOWN_HOURS)],
    );
    if (recent.rows[0]) return { scanId: recent.rows[0].id, reused: true };

    const scan = await client.query<{ id: string }>(
      `INSERT INTO scans
         (project_id, scan_type, methodology_version, status, max_pages, max_browser_renders, requested_at)
       VALUES ($1, 'quick', $2, 'queued', $3, $4, now())
       RETURNING id`,
      [projectId, METHODOLOGY_VERSION, QUICK_MAX_PAGES, QUICK_MAX_RENDERS],
    );
    const scanId = scan.rows[0]!.id;

    await client.query(
      `INSERT INTO jobs (job_type, payload_json, idempotency_key, status)
       VALUES ('crawl_project', $1, $2, 'queued')
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [{ scan_id: scanId }, scanId],
    );

    return { scanId, reused: false };
  });
}

export interface ScanStatusRow {
  id: string;
  status: string;
  error_code: string | null;
  page_count: number;
}

export async function getScanStatus(scanId: string): Promise<ScanStatusRow | null> {
  const rows = await query<ScanStatusRow>(
    `SELECT id, status, error_code, page_count FROM scans WHERE id = $1`,
    [scanId],
  );
  return rows[0] ?? null;
}

export async function getReportByScan(scanId: string): Promise<ReportDocument | null> {
  const rows = await query<{ content_json: ReportDocument }>(
    `SELECT content_json FROM reports WHERE scan_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [scanId],
  );
  return rows[0]?.content_json ?? null;
}
