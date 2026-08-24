"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PaywallCTA({ reportId, issueCount }: { reportId: string; issueCount: number }) {
  const router = useRouter();
  const isDemo = reportId === "demo";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  async function startCheckout() {
    setCheckoutBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId: reportId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string; alreadyPaid?: boolean };
        if (data.url) {
          window.location.assign(data.url);
          return;
        }
        if (data.alreadyPaid) {
          router.push(`/report/${reportId}`);
          return;
        }
      }
      // Stripe not configured yet (503), or any other response: fall back to the
      // pricing page, which explains the promo path.
      router.push("/pricing");
    } catch {
      router.push("/pricing");
    }
    setCheckoutBusy(false);
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scans/${reportId}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        router.push(`/report/${reportId}`);
        return;
      }
      if (res.status === 429) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (res.status === 403) {
        setError("That code isn’t valid.");
      } else {
        setError("Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mb-4 w-full max-w-sm rounded-2xl border border-border-strong bg-surface/80 p-5 text-center shadow-2xl backdrop-blur">
      <p className="font-mono text-xs" style={{ color: "var(--weak)" }}>
        {issueCount} issues are limiting how AI search reads your site
      </p>
      <h2 className="mt-2 text-base font-semibold">Unlock the full audit</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Every fix, with the evidence behind it and how to verify it.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2">
        {isDemo ? (
          <Link
            href="/pricing"
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
          >
            Get the full audit
          </Link>
        ) : (
          <button
            type="button"
            onClick={startCheckout}
            disabled={checkoutBusy}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60"
            style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
          >
            {checkoutBusy ? "Starting checkout…" : "Get the full audit"}
          </button>
        )}

        {isDemo ? (
          <Link
            href={`/report/${reportId}`}
            className="font-mono text-xs text-fg-subtle underline underline-offset-4 hover:text-fg-muted"
          >
            view full report (demo)
          </Link>
        ) : (
          <form onSubmit={redeem} className="mt-1 w-full">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="promo code"
                aria-label="Promo code"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "promo-error" : undefined}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface/70 px-3 py-2 font-mono text-xs text-fg outline-none placeholder:text-fg-subtle focus:border-[color:var(--accent)]"
              />
              <button
                type="submit"
                disabled={busy || code.trim() === ""}
                className="rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold transition-colors hover:bg-surface-2 disabled:opacity-40"
              >
                {busy ? "…" : "Redeem"}
              </button>
            </div>
            {error && (
              <p id="promo-error" role="alert" className="mt-1.5 text-left text-xs text-weak">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
