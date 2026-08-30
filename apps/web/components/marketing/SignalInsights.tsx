// Real aggregate from the sites people have scanned here: average readiness per
// signal, weakest first. Renders nothing until the sample is large enough to be
// honest (see lib/scans/insights). Framed explicitly as "sites scanned here",
// never as a web-wide benchmark.
import { signalInsights } from "@/lib/scans/insights";

export async function SignalInsights() {
  const data = await signalInsights();
  if (!data) return null;

  const { sampleSize, signals } = data;

  return (
    <section className="flex flex-col gap-6 border-t border-border py-16">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">What most sites get wrong</h2>
        <p className="max-w-2xl text-fg-muted">
          Average readiness by signal across {sampleSize.toLocaleString("en-US")} sites scanned here,
          weakest first. These sites are self-selected, not a web-wide sample, so read it as where
          people who check their AI readiness tend to fall short.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40">
        {signals.map((s) => {
          const pct = Math.max(0, Math.min(100, s.avg));
          return (
            <li key={s.key} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-40 shrink-0 text-sm font-medium">{s.name}</span>
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                aria-hidden
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                  }}
                />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-sm tabular-nums text-fg-muted">
                {Math.round(s.avg)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-fg-subtle">
        Live average from real scans, updated hourly. Each site counts once (its latest scan).
      </p>
    </section>
  );
}
