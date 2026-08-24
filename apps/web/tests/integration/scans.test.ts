import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { query } from "@/lib/db";
import {
  createQuickScan,
  getReportByScan,
  getScanStatus,
} from "@/lib/scans/repository";
import { closeDb, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(closeDb);

describe("quick scan submission", () => {
  it("creates a queued scan and an idempotent job", async () => {
    const { scanId } = await createQuickScan("example.com");
    const status = await getScanStatus(scanId);
    expect(status?.status).toBe("queued");

    const jobs = await query<{ n: string }>(
      `SELECT count(*) AS n FROM jobs WHERE idempotency_key = $1`,
      [scanId],
    );
    expect(Number(jobs[0]!.n)).toBe(1);
  });

  it("dedupes a repeat scan of the same domain within the cooldown window", async () => {
    // Domain cooldown/dedup (abuse/cost control): a second scan of the same
    // domain within the window reuses the first scan instead of running again.
    const first = await createQuickScan("acme.example");
    const second = await createQuickScan("acme.example");
    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.scanId).toBe(first.scanId);

    const projects = await query<{ n: string }>(
      `SELECT count(*) AS n FROM projects WHERE canonical_domain = $1`,
      ["acme.example"],
    );
    expect(Number(projects[0]!.n)).toBe(1);

    const scans = await query<{ n: string }>(
      `SELECT count(*) AS n FROM scans s
         JOIN projects p ON p.id = s.project_id
        WHERE p.canonical_domain = $1`,
      ["acme.example"],
    );
    expect(Number(scans[0]!.n)).toBe(1);
  });

  it("dedupes concurrent scans of the same domain (advisory lock)", async () => {
    // Warm up so the singleton anonymous org exists (its production steady
    // state); this isolates the scan-creation race the advisory lock guards.
    await createQuickScan("warmup.example");

    // 12 simultaneous submissions must produce exactly one scan + one job.
    const results = await Promise.all(
      Array.from({ length: 12 }, () => createQuickScan("race.example")),
    );
    const uniqueIds = new Set(results.map((r) => r.scanId));
    expect(uniqueIds.size).toBe(1);

    const scans = await query<{ n: string }>(
      `SELECT count(*) AS n FROM scans s
         JOIN projects p ON p.id = s.project_id
        WHERE p.canonical_domain = $1`,
      ["race.example"],
    );
    expect(Number(scans[0]!.n)).toBe(1);

    const jobs = await query<{ n: string }>(
      `SELECT count(*) AS n FROM jobs WHERE idempotency_key = $1`,
      [[...uniqueIds][0]!],
    );
    expect(Number(jobs[0]!.n)).toBe(1);
  });

  it("returns null report until one is stored, then returns it", async () => {
    const { scanId } = await createQuickScan("example.com");
    expect(await getReportByScan(scanId)).toBeNull();

    const scan = await query<{ project_id: string }>(
      `SELECT project_id FROM scans WHERE id = $1`,
      [scanId],
    );
    const proj = await query<{ id: string; organization_id: string }>(
      `SELECT id, organization_id FROM projects WHERE id = $1`,
      [scan[0]!.project_id],
    );
    const doc = { overall_score: 74, meta: { canonical_domain: "example.com" } };
    await query(
      `INSERT INTO reports (scan_id, organization_id, project_id, depth, content_json, generated_at)
       VALUES ($1, $2, $3, 'preview', $4, now())`,
      [scanId, proj[0]!.organization_id, proj[0]!.id, doc],
    );

    const report = await getReportByScan(scanId);
    expect(report?.overall_score).toBe(74);
  });
});
