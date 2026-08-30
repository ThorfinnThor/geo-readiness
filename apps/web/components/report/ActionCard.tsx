// A single fix, rendered in full — severity, title, problem, the fix, how to
// verify it, and the evidence behind it. Matches the paid report's card. The
// paste-ready prompt button appears only when `fix_prompt` is present, so the
// free-preview teaser (which strips it) shows the substance without the premium
// payload.
import { CopyPromptButton } from "@/components/report/CopyPromptButton";
import { severityColor } from "@/components/report/shared";
import type { ReportAction } from "@/lib/report/types";

export function ActionCard({ action: a }: { action: ReportAction }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
          style={{
            color: severityColor(a.severity),
            backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
          }}
        >
          {a.severity}
        </span>
        <span className="font-medium">{a.title}</span>
        <span className="ml-auto font-mono text-xs text-fg-subtle">{a.rule_id}</span>
      </div>
      <p className="mt-3 text-sm text-fg-muted">{a.problem}</p>
      <p className="mt-2 text-sm">
        <span className="font-mono text-accent">Fix</span> {a.recommendation}
      </p>
      <p className="mt-2 text-xs text-fg-subtle">
        <span className="font-mono">Verify</span> {a.how_to_verify}
      </p>
      {a.evidence.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 font-mono text-xs text-fg-subtle">
          {a.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {a.fix_prompt && (
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <CopyPromptButton text={a.fix_prompt} />
        </div>
      )}
    </div>
  );
}
