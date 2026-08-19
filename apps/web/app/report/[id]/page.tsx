import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FullReport } from "@/components/report/FullReport";
import { ScanPending } from "@/components/scan/ScanPending";
import { exampleReport } from "@/lib/report/example";
import { getReportByScan, getScanStatus, isUuid } from "@/lib/scans/repository";

export const dynamic = "force-dynamic";

// E13 Full Report — noindex (§40; also enforced via next.config headers).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "demo") return <FullReport report={exampleReport} reportId="demo" />;
  if (!isUuid(id)) notFound();

  const report = await getReportByScan(id);
  if (report) return <FullReport report={report} reportId={id} />;

  const status = await getScanStatus(id);
  if (!status) notFound();
  return <ScanPending scanId={id} status={status.status} />;
}
