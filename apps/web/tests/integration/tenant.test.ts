import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { registerUser } from "@/lib/auth/service";
import {
  getProjectForOrg,
  getReportForOrg,
  requireMembership,
} from "@/lib/tenant/repository";
import { AuthError } from "@/lib/auth/errors";
import { closeDb, insertProject, insertReport, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(closeDb);

async function makeTenant(email: string) {
  const reg = await registerUser(email, "correct-horse-battery");
  return { userId: reg.userId, orgId: reg.organizationId };
}

describe("tenant isolation (Org B cannot read Org A)", () => {
  it("a project is invisible to another org", async () => {
    const a = await makeTenant("a@example.com");
    const b = await makeTenant("b@example.com");
    const projectA = await insertProject(a.orgId, "a-corp.example");

    // Owner org sees it; other org gets null (→ 404 at the API).
    expect(await getProjectForOrg(a.orgId, projectA)).not.toBeNull();
    expect(await getProjectForOrg(b.orgId, projectA)).toBeNull();
  });

  it("a paid report is invisible to another org", async () => {
    const a = await makeTenant("a@example.com");
    const b = await makeTenant("b@example.com");
    const projectA = await insertProject(a.orgId, "a-corp.example");
    const reportA = await insertReport(a.orgId, projectA, "full");

    expect(await getReportForOrg(a.orgId, reportA)).not.toBeNull();
    expect(await getReportForOrg(b.orgId, reportA)).toBeNull();
  });

  it("requireMembership rejects non-members", async () => {
    const a = await makeTenant("a@example.com");
    const b = await makeTenant("b@example.com");

    await expect(requireMembership(a.userId, a.orgId)).resolves.toMatchObject({ role: "owner" });
    await expect(requireMembership(b.userId, a.orgId)).rejects.toBeInstanceOf(AuthError);
  });
});
