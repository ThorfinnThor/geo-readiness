"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  const failed = current === "failed";

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">
        {failed ? "We couldn’t scan that site" : "Scanning your website…"}
      </h1>
      {failed ? (
        <p className="text-neutral-500">
          The site could not be reached or crawled. Please check the domain and try again.
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-2 text-sm text-neutral-500">
            {STEPS.map((step) => (
              <li key={step} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
                {step}
              </li>
            ))}
          </ol>
          <p className="text-xs text-neutral-400">This usually takes under a minute.</p>
        </>
      )}
    </main>
  );
}
