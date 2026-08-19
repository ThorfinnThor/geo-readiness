import { NextResponse } from "next/server";

import { getScanStatus, isUuid } from "@/lib/scans/repository";

export const runtime = "nodejs";

// GET /api/scans/{id} — scan status for progress polling.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const scan = await getScanStatus(id);
  if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    id: scan.id,
    status: scan.status,
    errorCode: scan.error_code,
    pageCount: scan.page_count,
  });
}
