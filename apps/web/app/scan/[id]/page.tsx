import { notFound } from "next/navigation";

import { PreviewReport } from "@/components/report/PreviewReport";
import { ScanPending } from "@/components/scan/ScanPending";
import { exampleReport } from "@/lib/report/example";
import { getReportByScan, getScanStatus, isUuid } from "@/lib/scans/repository";

export const dynamic = "force-dynamic";

// E12 Free Preview — renders the stored report, or a live progress view while
// the scan runs. `demo` shows the example fixture.
export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "demo") return <PreviewReport report={exampleReport} reportId="demo" />;
  if (!isUuid(id)) notFound();

  const report = await getReportByScan(id);
  if (report) return <PreviewReport report={report} reportId={id} />;

  const status = await getScanStatus(id);
  if (!status) notFound();
  return <ScanPending scanId={id} status={status.status} />;
}
