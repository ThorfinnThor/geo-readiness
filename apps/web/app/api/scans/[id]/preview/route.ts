import { NextResponse } from "next/server";

import { toPreviewDoc } from "@/lib/report/preview";
import { getReportByScan, getScanStatus, isUuid } from "@/lib/scans/repository";

export const runtime = "nodejs";

// GET /api/scans/{id}/preview — the FREE-PREVIEW projection only. Premium fields
// (fix text, evidence, clusters, diagnostics, business profile) are stripped
// server-side so they never reach an unpaid client. 202 while still running.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const report = await getReportByScan(id);
  if (report) return NextResponse.json({ status: "completed", preview: toPreviewDoc(report) });

  const scan = await getScanStatus(id);
  if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ status: scan.status }, { status: 202 });
}
