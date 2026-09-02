"use client";

// The premium "test it yourself" kit: the neutral questions the engine generated,
// plus two paste-ready prompts (blinded measurement, then evaluation) and a
// downloadable full protocol. It measures ACTUAL citation in ChatGPT/Claude,
// which the honest copy separates from the readiness score.
import { CopyPromptButton } from "@/components/report/CopyPromptButton";
import type { CitationQuery } from "@/lib/report/citationTest";

export function CitationSelfTest({
  queries,
  measurement,
  evaluation,
  protocol,
  domain,
}: {
  queries: CitationQuery[];
  measurement: string;
  evaluation: string;
  protocol: string;
  domain: string;
}) {
  function downloadProtocol() {
    const blob = new Blob([protocol], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${domain.replace(/[^a-z0-9.-]/gi, "-")}-ai-citation-self-test.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-fg-muted">
        Your readiness score is deterministic and calls no AI provider. To see whether ChatGPT and
        Claude actually cite you right now, run this test yourself. It uses the neutral questions the
        engine built from your business, keeps the site under test hidden until after the search, and
        reports whether {domain} was cited.
      </p>
      <p className="text-xs text-fg-subtle">
        Readiness and real citation are different layers. A miss here does not by itself mean a page
        is weak, and results vary between runs. Use it to see the live status and to compare before
        and after you apply the fixes.
      </p>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Your neutral test questions</h3>
        <ol className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface/50 p-4 text-sm text-fg-muted">
          {queries.map((q) => (
            <li key={q.qid} className="flex gap-2">
              <span className="font-mono text-fg-subtle">{q.qid}</span>
              <span>{q.query}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Step 1 — paste into a new ChatGPT or Claude chat</h3>
            <p className="mt-0.5 text-xs text-fg-muted">
              Blinded measurement. Your domain is intentionally not in this prompt.
            </p>
          </div>
          <CopyPromptButton text={measurement} label="Copy step 1" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Step 2 — paste into the same chat afterwards</h3>
            <p className="mt-0.5 text-xs text-fg-muted">
              Reveals {domain} and evaluates the citations, with no new search.
            </p>
          </div>
          <CopyPromptButton text={evaluation} label="Copy step 2" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-subtle">
          Want the strict, per-question protocol for a serious audit? Download the full version.
        </p>
        <button
          type="button"
          onClick={downloadProtocol}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-border px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg print:hidden"
        >
          Download full protocol (.md)
        </button>
      </div>
    </div>
  );
}
