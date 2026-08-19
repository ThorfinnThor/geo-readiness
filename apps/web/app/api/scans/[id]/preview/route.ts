import { NextResponse } from "next/server";

import { getReportByScan, getScanStatus, isUuid } from "@/lib/scans/repository";

export const runtime = "nodejs";

// GET /api/scans/{id}/preview — the report (preview view slices it client-side).
// 202 while the scan is still running.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const report = await getReportByScan(id);
  if (report) return NextResponse.json({ status: "completed", report });

  const scan = await getScanStatus(id);
  if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ status: scan.status }, { status: 202 });
}
