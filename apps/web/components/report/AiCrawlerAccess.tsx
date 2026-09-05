import Link from "next/link";

import { CRAWLERS, PURPOSE_LABEL, type CrawlerPurpose } from "@/lib/content/crawlers";
import type { ReportDocument } from "@/lib/report/types";

const ORDER: CrawlerPurpose[] = ["search", "training", "user", "ads"];

/**
 * Who is allowed to read this site, read off the robots.txt the crawl already
 * fetched. Access sits underneath every other signal: a page nothing may fetch
 * cannot be understood, quoted or cited however good it is.
 */
export function AiCrawlerAccess({ report }: { report: ReportDocument }) {
  const access = report.crawl?.ai_crawler_access;
  if (!access || Object.keys(access).length === 0) return null;

  const known = CRAWLERS.filter((c) => c.token in access);
  const blockedSearch = known.filter((c) => c.purpose === "search" && !access[c.token]);
  const blockedTraining = known.filter((c) => c.purpose === "training" && !access[c.token]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl border p-4 text-sm"
        style={{
          borderColor:
            blockedSearch.length > 0
              ? "color-mix(in srgb, var(--weak) 45%, var(--border))"
              : "var(--border)",
          background:
            blockedSearch.length > 0
              ? "color-mix(in srgb, var(--weak) 7%, transparent)"
              : "color-mix(in srgb, var(--excellent) 5%, transparent)",
        }}
      >
        {blockedSearch.length > 0 ? (
          <>
            <strong>
              Your robots.txt blocks {blockedSearch.length} of the crawlers that put you in AI
              answers.
            </strong>{" "}
            {blockedSearch.map((c) => c.token).join(", ")} decide whether you can appear in{" "}
            {[...new Set(blockedSearch.map((c) => c.company))].join(", ")} results at all. If you
            meant to opt out of model training, those are different tokens
            {blockedTraining.length > 0 && " — and you have already blocked those separately"}.
          </>
        ) : (
          <>
            <strong>Every answer engine is allowed to read this site.</strong>{" "}
            {blockedTraining.length > 0
              ? `Training is opted out via ${blockedTraining
                  .map((c) => c.token)
                  .join(", ")}, which costs nothing in search. That is the split most publishers want.`
              : "Nothing is blocked, in either direction."}
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ORDER.map((purpose) => {
          const rows = known.filter((c) => c.purpose === purpose);
          if (rows.length === 0) return null;
          return (
            <div key={purpose} className="flex flex-col gap-1.5">
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
                {PURPOSE_LABEL[purpose]}
              </h3>
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/40">
                {rows.map((c) => (
                  <li key={c.token} className="flex items-center gap-3 px-3 py-2">
                    <span className="truncate font-mono text-xs">{c.token}</span>
                    <span
                      className="ml-auto shrink-0 font-mono text-[0.7rem] font-semibold uppercase"
                      style={{ color: access[c.token] ? "var(--excellent)" : "var(--weak)" }}
                    >
                      {access[c.token] ? "allowed" : "blocked"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-fg-subtle">
        Read from your robots.txt at the time of this scan, for the site root — a site can allow the
        root and still disallow paths below it. Two of these agents state that they ignore
        robots.txt entirely. What each one does, and three copy-paste policies, are on the{" "}
        <Link href="/ai-crawlers" className="underline underline-offset-2">
          AI crawler reference
        </Link>
        .
      </p>
    </div>
  );
}
