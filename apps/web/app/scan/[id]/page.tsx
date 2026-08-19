import { PreviewReport } from "@/components/report/PreviewReport";
import { exampleReport } from "@/lib/report/example";

// E12 Free Preview. Until live scans are wired through the API, this renders the
// example report; `id` will select the real scan once persistence lands.
export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreviewReport report={exampleReport} reportId={id} />;
}
