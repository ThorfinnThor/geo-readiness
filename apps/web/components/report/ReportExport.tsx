"use client";

import type { ReportDocument } from "@/lib/report/types";
import { reportFileBase, reportToMarkdown } from "@/lib/report/markdown";

export function ReportExport({ report }: { report: ReportDocument }) {
  function downloadMarkdown() {
    const md = reportToMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportFileBase(report)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center justify-end gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        Save as PDF
      </button>
      <button
        type="button"
        onClick={downloadMarkdown}
        className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        Download Markdown
      </button>
    </div>
  );
}
