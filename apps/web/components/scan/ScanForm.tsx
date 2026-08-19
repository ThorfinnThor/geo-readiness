"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScanForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/quick-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (res.ok) {
        const data = (await res.json()) as { scanId: string };
        router.push(`/scan/${data.scanId}`);
        return;
      }
      setError("Please enter a valid public domain (e.g. example.com).");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourwebsite.com"
          aria-label="Website domain"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={loading || domain.trim() === ""}
          className="rounded-lg bg-neutral-900 px-5 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "Starting…" : "Run free scan"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}
