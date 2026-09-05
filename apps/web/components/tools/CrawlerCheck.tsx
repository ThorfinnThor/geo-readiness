"use client";

import Link from "next/link";
import { useState } from "react";

import type { CrawlerCheckResponse } from "@/app/api/ai-crawler-check/route";
import { CRAWLERS, PURPOSE_LABEL, type CrawlerPurpose } from "@/lib/content/crawlers";

const ORDER: CrawlerPurpose[] = ["search", "training", "user", "ads"];

const ERRORS: Record<string, string> = {
  invalid_domain: "That does not look like a public domain. Try it as example.com.",
  private_host: "That name does not resolve to a public address, so there is nothing to check.",
  dns_failed: "We could not resolve that domain.",
  timeout: "The site did not answer in time. That is worth knowing on its own: a crawler gets the same silence.",
  too_large: "That robots.txt is implausibly large, so we stopped reading it.",
  unreachable: "We could not read a robots.txt from that domain.",
  rate_limited: "Too many checks from here. Give it a few minutes.",
  invalid_request: "Something was wrong with that request.",
};

function Pill({ verdict }: { verdict: "allowed" | "blocked" }) {
  const ok = verdict === "allowed";
  return (
    <span
      className="rounded px-2 py-0.5 font-mono text-[0.7rem] font-semibold uppercase tracking-wide"
      style={{
        color: ok ? "var(--excellent)" : "var(--weak)",
        backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
      }}
    >
      {ok ? "allowed" : "blocked"}
    </span>
  );
}

export function CrawlerCheck() {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CrawlerCheckResponse | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim() || busy) return;
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/ai-crawler-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const json = await res.json();
      if (!res.ok) setError(ERRORS[json.error as string] ?? ERRORS.unreachable!);
      else setData(json as CrawlerCheckResponse);
    } catch {
      setError(ERRORS.unreachable!);
    } finally {
      setBusy(false);
    }
  }

  const byToken = new Map((data?.rows ?? []).map((r) => [r.token, r]));
  const blockedSearch = (data?.rows ?? []).filter(
    (r) => r.verdict === "blocked" && CRAWLERS.find((c) => c.token === r.token)?.purpose === "search",
  );

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourdomain.com"
          aria-label="Domain to check"
          autoComplete="url"
          spellCheck={false}
          className="min-h-[48px] flex-1 rounded-lg border border-border bg-surface px-4 text-base outline-none focus:border-border-strong"
        />
        <button
          type="submit"
          disabled={busy || !domain.trim()}
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg px-5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
        >
          {busy ? "Reading robots.txt…" : "Check"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-border bg-surface/50 p-4 text-sm text-fg-muted">{error}</p>
      )}

      {data && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-5">
            <p className="text-sm">
              {!data.hasRobots ? (
                <>
                  <strong>{data.domain} has no robots.txt rules.</strong> That is not a problem:
                  with no file, or an empty one, every crawler is allowed everywhere. It also means
                  you cannot opt out of training without adding one.
                </>
              ) : blockedSearch.length > 0 ? (
                <>
                  <strong>
                    {data.domain} blocks {blockedSearch.length} of the crawlers that put you in AI
                    answers.
                  </strong>{" "}
                  Blocking {blockedSearch.map((r) => r.token).join(", ")} removes you from those
                  products&rsquo; results. If you meant to opt out of training only, those are
                  different tokens.
                </>
              ) : (
                <>
                  <strong>{data.domain} lets every answer engine in.</strong> All the search
                  crawlers can reach your site root. Whether they can make sense of it once they
                  arrive is a separate question, and the one the audit answers.
                </>
              )}
            </p>
            <p className="font-mono text-xs text-fg-subtle">
              read {data.robotsUrl} · HTTP {data.robotsStatus}
              {data.sitemaps.length > 0 && ` · ${data.sitemaps.length} sitemap declared`}
            </p>
          </div>

          {ORDER.map((purpose) => {
            const rows = CRAWLERS.filter((c) => c.purpose === purpose);
            return (
              <div key={purpose} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
                  {PURPOSE_LABEL[purpose]}
                </h3>
                <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/40">
                  {rows.map((c) => {
                    const r = byToken.get(c.token);
                    if (!r) return null;
                    return (
                      <li key={c.token} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                        <span className="font-mono text-xs font-semibold">{c.token}</span>
                        <span className="text-xs text-fg-subtle">{c.company}</span>
                        <span className="ml-auto flex items-center gap-2">
                          {!c.obeysRobots && (
                            <span className="font-mono text-[0.7rem] text-warn">ignores robots.txt</span>
                          )}
                          <Pill verdict={r.verdict} />
                        </span>
                        {r.pathRestrictions && r.verdict === "allowed" && (
                          <span className="w-full text-xs text-fg-subtle">
                            Allowed at the root, but its group also disallows specific paths.
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <p className="text-xs text-fg-subtle">
            This checks whether each agent may crawl the site root. A site can allow the root and
            still block individual pages, and two of these agents state that they ignore robots.txt
            entirely. Access is also only the first hurdle &mdash;{" "}
            <Link href="/" className="text-accent underline underline-offset-4">
              a free readiness scan
            </Link>{" "}
            checks whether a crawler can actually use the page once it arrives.
          </p>
        </div>
      )}
    </div>
  );
}
