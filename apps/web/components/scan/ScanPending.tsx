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

export function ScanPending({ scanId, status }: { scanId: string; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [step, setStep] = useState(0);

  // Poll real status.
  useEffect(() => {
    if (DONE.has(current)) {
      router.refresh();
      return;
    }
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { status: string };
        setCurrent(data.status);
        if (DONE.has(data.status)) {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        /* transient; keep polling */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [scanId, current, router]);

  // Advance the visual pipeline (stops one short until the scan actually completes).
  useEffect(() => {
    if (DONE.has(current)) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 2)), 1400);
    return () => clearInterval(t);
  }, [current]);

  const failed = current === "failed";

  return (
    <>
      <TopBar />
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
      <div className="rounded-2xl border border-border bg-surface/50 p-6">
        <div className="mb-5 flex items-center gap-2 font-mono text-xs text-fg-subtle">
          <span
            className={`h-2 w-2 rounded-full ${failed ? "bg-weak" : "animate-pulse bg-excellent"}`}
          />
          {failed ? "scan failed" : "scanning…"}
        </div>

        {failed ? (
          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-semibold">We couldn’t scan that site</h1>
            <p className="text-sm text-fg-muted">
              The site could not be reached or crawled. Check the domain and try again.
            </p>
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
                      done
                        ? "text-excellent"
                        : active
                          ? "text-accent"
                          : "text-fg-subtle/50"
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
      {!failed && (
        <p className="text-center font-mono text-xs text-fg-subtle">
          this usually takes under a minute
        </p>
      )}
      </main>
    </>
  );
}
