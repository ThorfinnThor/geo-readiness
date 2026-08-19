// Tenant-scoped data access. Every tenant-owned read is filtered by
// organization_id, so a resource UUID from another org resolves to null (the
// API surfaces that as 404 — never another org's row). This is the isolation
// guarantee behind E02's "Org B cannot read Org A" acceptance test.
import { query } from "@/lib/db";
import { AuthError } from "@/lib/auth/errors";

export interface Membership {
  organizationId: string;
  role: string;
}

export async function getUserOrganizations(userId: string): Promise<Membership[]> {
  const rows = await query<{ organization_id: string; role: string }>(
    `SELECT organization_id, role FROM organization_members WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => ({ organizationId: r.organization_id, role: r.role }));
}

/** Return the membership row or throw forbidden if the user is not a member. */
export async function requireMembership(userId: string, orgId: string): Promise<Membership> {
  const rows = await query<{ organization_id: string; role: string }>(
    `SELECT organization_id, role FROM organization_members
     WHERE user_id = $1 AND organization_id = $2`,
    [userId, orgId],
  );
  const row = rows[0];
  if (!row) throw new AuthError("forbidden");
  return { organizationId: row.organization_id, role: row.role };
}

export interface ProjectRow {
  id: string;
  organization_id: string;
  canonical_domain: string;
  status: string;
}

/** Fetch a project only if it belongs to the given org; else null. */
export async function getProjectForOrg(
  orgId: string,
  projectId: string,
): Promise<ProjectRow | null> {
  const rows = await query<ProjectRow>(
    `SELECT id, organization_id, canonical_domain, status
     FROM projects WHERE id = $1 AND organization_id = $2`,
    [projectId, orgId],
  );
  return rows[0] ?? null;
}

export interface ReportRow {
  id: string;
  organization_id: string;
  project_id: string;
  scan_id: string;
  depth: string;
}

/** Fetch a report only if it belongs to the given org; else null. */
export async function getReportForOrg(
  orgId: string,
  reportId: string,
): Promise<ReportRow | null> {
  const rows = await query<ReportRow>(
    `SELECT id, organization_id, project_id, scan_id, depth
     FROM reports WHERE id = $1 AND organization_id = $2`,
    [reportId, orgId],
  );
  return rows[0] ?? null;
}
