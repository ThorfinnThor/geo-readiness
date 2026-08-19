import type { Metadata } from "next";

import { FullReport } from "@/components/report/FullReport";
import { exampleReport } from "@/lib/report/example";

// E13 Full Report. Customer reports are noindex (§40; also enforced via headers
// in next.config for /report/*).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FullReport report={exampleReport} reportId={id} />;
}
