"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";

const STEPS = [
  "Checking domain",
  "Crawling key pages",
  "Building business profile",
  "Generating search-intent clusters",
  "Checking coverage",
  "Computing readiness",
  "Preparing results",
];

const DONE = new Set(["completed", "partial", "failed"]);
// After this many consecutive poll failures, or this many seconds without a
// result, stop pretending everything is fine and offer a retry.
const MAX_POLL_FAILS = 5;
const STALL_SECONDS = 300;

export function ScanPending({ scanId, status }: { scanId: string; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fails, setFails] = useState(0);

  // Poll real status. Track consecutive failures so a persistent problem
  // surfaces instead of the spinner running forever.
  useEffect(() => {
    if (DONE.has(current)) {
      router.refresh();
      return;
    }
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}`, { cache: "no-store" });
        if (!res.ok) {
          setFails((f) => f + 1);
          return;
        }
        const data = (await res.json()) as { status: string };
        setFails(0);
        setCurrent(data.status);
        if (DONE.has(data.status)) {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        setFails((f) => f + 1);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [scanId, current, router]);

  // Advance the visual pipeline (stops one short until the scan actually
  // completes). Paced to ~9s/step so it tracks the ~60s+ run.
  useEffect(() => {
    if (DONE.has(current)) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 2)), 9000);
    return () => clearInterval(t);
  }, [current]);

  // Live elapsed counter so the wait never feels frozen.
  useEffect(() => {
    if (DONE.has(current)) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [current]);

  const failed = current === "failed";
  const stalled = !DONE.has(current) && (fails >= MAX_POLL_FAILS || elapsed > STALL_SECONDS);

  return (
    <>
      <TopBar />
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <div
            role="status"
            aria-live="polite"
            className="mb-5 flex items-center gap-2 font-mono text-xs text-fg-subtle"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                failed || stalled ? "bg-weak" : "animate-pulse bg-excellent"
              }`}
            />
            {failed ? "scan failed" : stalled ? "connection problem" : "scanning…"}
          </div>

          {failed ? (
            <div className="flex flex-col gap-3">
              <h1 className="text-xl font-semibold">We couldn’t scan that site</h1>
              <p className="text-sm text-fg-muted">
                The site could not be reached or crawled. Check the domain and try again.
              </p>
            </div>
          ) : stalled ? (
            <div className="flex flex-col gap-3">
              <h1 className="text-xl font-semibold">This is taking longer than expected</h1>
              <p className="text-sm text-fg-muted">
                {fails >= MAX_POLL_FAILS
                  ? "We’re having trouble reaching the scan service right now."
                  : "Your scan is still queued. Larger sites and busy periods can take a few minutes."}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-fit rounded-lg border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-2"
              >
                Retry
              </button>
            </div>
          ) : (
            <ol className="flex flex-col gap-3 font-mono text-sm">
              {STEPS.map((label, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={
                        done ? "text-excellent" : active ? "text-accent" : "text-fg-subtle/50"
                      }
                    >
                      {done ? "✓" : active ? "▸" : "·"}
                    </span>
                    <span
                      className={
                        done
                          ? "text-fg-muted line-through decoration-fg-subtle/40"
                          : active
                            ? "text-fg"
                            : "text-fg-subtle/60"
                      }
                    >
                      {label}
                      {active && <span className="ml-1 animate-pulse">…</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        {!failed && !stalled && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-mono text-xs text-fg-subtle">
              Diagnosis usually takes about a minute. {elapsed}s elapsed
            </p>
            <p className="max-w-sm text-xs text-fg-subtle/70">
              We crawl and analyze your pages live, so this isn’t instant. You can safely keep this
              tab open.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
