import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FullReport } from "@/components/report/FullReport";
import { ScanPending } from "@/components/scan/ScanPending";
import { exampleReport } from "@/lib/report/example";
import { confirmCheckoutSession } from "@/lib/payments/checkout";
import { hasEntitlement } from "@/lib/payments/entitlements";
import { getReportByScan, getScanStatus, isUuid } from "@/lib/scans/repository";

export const dynamic = "force-dynamic";

// E13 Full Report — noindex (§40; also enforced via next.config headers).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id } = await params;
  if (id === "demo") return <FullReport report={exampleReport} reportId="demo" />;
  if (!isUuid(id)) notFound();

  const report = await getReportByScan(id);
  if (report) {
    let entitled = await hasEntitlement(id);
    // Returning from Stripe Checkout: verify the payment directly and unlock now,
    // so unlocking never races the webhook (which is only a backstop).
    if (!entitled) {
      const { session_id } = await searchParams;
      if (session_id) entitled = await confirmCheckoutSession(id, session_id);
    }
    // Gate: the full report requires an unlock (paid or promo). Otherwise send
    // the visitor to the free preview / paywall.
    if (!entitled) redirect(`/scan/${id}`);
    return <FullReport report={report} reportId={id} />;
  }

  const status = await getScanStatus(id);
  if (!status) notFound();
  return <ScanPending scanId={id} status={status.status} />;
}
