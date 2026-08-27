"use client";

// Per-browser scan history and before/after comparison. When you rescan the same
// domain (after fixing things), this shows what moved since your last scan. Stored
// only in this browser's localStorage — nothing is sent anywhere, and it is a
// per-viewer convenience, so a private window or cleared storage simply shows the
// first-scan hint instead.
import { useEffect, useState } from "react";

type Comp = { key: string; name: string; score: number };
type StoredComp = { key: string; score: number };
type Entry = { scanId: string; at: string; overall: number; components: StoredComp[] };

const historyKey = (domain: string) => `fyas:history:${domain}`;
const MAX_ENTRIES = 12;

function DeltaChip({ delta, small = false }: { delta: number; small?: boolean }) {
  const size = small ? "text-[0.7rem]" : "text-xs";
  if (delta === 0) return <span className={`${size} text-fg-subtle`}>no change</span>;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium ${size}`}
      style={{ color: up ? "var(--excellent)" : "var(--weak)" }}
    >
      {up ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}

export function ScanComparison({
  domain,
  scanId,
  overall,
  components,
}: {
  domain: string;
  scanId: string;
  overall: number;
  components: Comp[];
}) {
  const [prev, setPrev] = useState<Entry | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let history: Entry[] = [];
    try {
      const raw = localStorage.getItem(historyKey(domain));
      if (raw) history = JSON.parse(raw) as Entry[];
    } catch {
      return; // storage unavailable — render nothing
    }

    // The most recent stored scan that isn't this one is the baseline to compare.
    setPrev(history.find((e) => e.scanId !== scanId) ?? null);
    setReady(true);

    // Save this scan (idempotent: dedupe by scanId, newest first, capped).
    const current: Entry = {
      scanId,
      at: new Date().toISOString(),
      overall,
      components: components.map((c) => ({ key: c.key, score: c.score })),
    };
    const next = [current, ...history.filter((e) => e.scanId !== scanId)].slice(0, MAX_ENTRIES);
    try {
      localStorage.setItem(historyKey(domain), JSON.stringify(next));
    } catch {
      // best effort — comparison still renders from what we read above
    }
    // Data is fixed for a given scanId, so only re-run if the scan changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, scanId]);

  if (!ready) return null;

  if (!prev) {
    return (
      <p className="text-xs text-fg-subtle">
        Saved to this browser. Rescan {domain} after you change your site to see what improved.
      </p>
    );
  }

  const overallDelta = Math.round(overall) - Math.round(prev.overall);
  const prevByKey = new Map(prev.components.map((c) => [c.key, c.score]));
  const changed = components
    .map((c) => ({ ...c, delta: Math.round(c.score) - Math.round(prevByKey.get(c.key) ?? c.score) }))
    .filter((c) => c.delta !== 0);
  const prevDate = new Date(prev.at).toLocaleDateString();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Since your last scan
        </span>
        <span className="text-[0.7rem] text-fg-subtle">{prevDate}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm text-fg-muted">Overall</span>
        <span className="font-mono text-lg font-semibold text-fg">{Math.round(overall)}</span>
        <DeltaChip delta={overallDelta} />
        <span className="text-xs text-fg-subtle">was {Math.round(prev.overall)}</span>
      </div>
      {changed.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border pt-2">
          {changed.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-fg-muted">{c.name}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-fg-subtle">
                  {Math.round(prevByKey.get(c.key) ?? c.score)} → {Math.round(c.score)}
                </span>
                <DeltaChip delta={c.delta} small />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
