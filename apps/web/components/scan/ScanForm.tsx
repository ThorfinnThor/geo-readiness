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
      // Map the API's status/error codes to distinct, actionable messages
      // instead of blaming the domain for every failure.
      if (res.status === 400) {
        setError("Please enter a valid public domain (e.g. example.com).");
      } else if (res.status === 429) {
        setError("Too many scans just now. Please wait a few minutes and try again.");
      } else if (res.status === 403) {
        setError("That request was blocked. Please reload the page and try again.");
      } else {
        setError("The scan service is temporarily unavailable. Please try again shortly.");
      }
    } catch {
      setError("Couldn’t reach the scan service. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 text-left">
      <div className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface/70 p-1.5 pl-3 shadow-lg backdrop-blur transition-colors focus-within:border-[color:var(--accent)]">
        <span className="font-mono text-sm text-fg-subtle">https://</span>
        <input
          type="text"
          inputMode="url"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourwebsite.com"
          aria-label="Website domain"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "scan-error" : undefined}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fg-subtle sm:text-base"
        />
        <button
          type="submit"
          disabled={loading || domain.trim() === ""}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-[color:var(--accent-fg)] transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
          style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
        >
          {loading ? "Scanning…" : "Run scan"}
        </button>
      </div>
      {error && (
        <p id="scan-error" role="alert" className="px-1 text-sm text-weak">
          {error}
        </p>
      )}
      <p className="px-1 text-xs text-fg-subtle">
        Can take up to 3 minutes. We crawl and analyze your pages live.
      </p>
    </form>
  );
}
