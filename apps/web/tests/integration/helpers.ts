// Integration test helpers. Requires a Postgres migrated to head
// (DATABASE_URL). Each test resets the mutated tables.
import { getPool, query } from "@/lib/db";

export async function resetDb(): Promise<void> {
  // Cascades from users clear credentials/sessions/tokens/members/projects/etc.
  await query("TRUNCATE users, login_attempts RESTART IDENTITY CASCADE");
}

export async function closeDb(): Promise<void> {
  const g = globalThis as unknown as { __geoPool?: { end: () => Promise<void> } };
  await g.__geoPool?.end();
  g.__geoPool = undefined;
}

/** Directly insert a project for an org (bypasses higher layers). */
export async function insertProject(orgId: string, domain: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO projects (organization_id, canonical_domain) VALUES ($1, $2) RETURNING id`,
    [orgId, domain],
  );
  return rows[0]!.id;
}

/** Directly insert a completed scan + report for an org. */
export async function insertReport(
  orgId: string,
  projectId: string,
  depth: "preview" | "full",
): Promise<string> {
  const scan = await query<{ id: string }>(
    `INSERT INTO scans (project_id, scan_type, methodology_version, max_pages, max_browser_renders)
     VALUES ($1, $2, 'geo-readiness-v1', 12, 2) RETURNING id`,
    [projectId, depth === "full" ? "full" : "quick"],
  );
  const scanId = scan[0]!.id;
  const report = await query<{ id: string }>(
    `INSERT INTO reports (scan_id, organization_id, project_id, depth)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [scanId, orgId, projectId, depth],
  );
  return report[0]!.id;
}

export { getPool };
