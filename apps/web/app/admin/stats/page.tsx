import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

import { query } from "@/lib/db";
import { limitedPromoUsage } from "@/lib/payments/entitlements";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

function tokenOk(provided: string | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function count(sql: string): Promise<number> {
  const rows = await query<{ n: string }>(sql);
  return Number(rows[0]?.n ?? 0);
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface/50 p-5">
      <span className="text-[0.7rem] uppercase tracking-wide text-fg-subtle">{label}</span>
      <span className="font-mono text-3xl font-semibold tabular-nums text-fg">{value}</span>
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
    </div>
  );
}

/** Integer percentage a/b, guarding divide-by-zero. */
function pct(a: number, b: number): number {
  return b > 0 ? Math.round((100 * a) / b) : 0;
}

// One funnel stage: a bar sized to its share of the top of the funnel, with the
// count and the stage-to-stage conversion.
function FunnelRow({
  label,
  value,
  ofTop,
  conversion,
}: {
  label: string;
  value: number;
  ofTop: number; // width as a share of the top stage
  conversion?: string; // e.g. "42% of started"
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <span className="w-36 shrink-0 text-sm font-medium">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.max(2, ofTop)}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
          }}
        />
      </span>
      <span className="flex w-28 shrink-0 flex-col items-end">
        <span className="font-mono text-sm tabular-nums text-fg">
          {value.toLocaleString("en-US")}
        </span>
        {conversion && <span className="text-[0.7rem] text-fg-subtle">{conversion}</span>}
      </span>
    </li>
  );
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // Hide the page's existence entirely when the token is wrong/missing.
  if (!tokenOk(token)) notFound();

  const [total, last24h, last7d, completed, failed, domains, unlocks, promoUnlocks, limitedPromo] =
    await Promise.all([
      count(`SELECT count(*) AS n FROM scans`),
      count(`SELECT count(*) AS n FROM scans WHERE created_at > now() - interval '24 hours'`),
      count(`SELECT count(*) AS n FROM scans WHERE created_at > now() - interval '7 days'`),
      count(`SELECT count(*) AS n FROM scans WHERE status = 'completed'`),
      count(`SELECT count(*) AS n FROM scans WHERE status = 'failed'`),
      count(`SELECT count(DISTINCT canonical_domain) AS n FROM projects`),
      count(`SELECT count(*) AS n FROM payments WHERE status = 'paid'`),
      count(`SELECT count(*) AS n FROM payments WHERE status = 'paid' AND provider = 'promo'`),
      limitedPromoUsage(),
    ]);

  const paidUnlocks = Math.max(0, unlocks - promoUnlocks); // Stripe-paid, excluding promo

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
          Internal · usage
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Scan activity</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Total scans" value={total.toLocaleString("en-US")} />
        <Tile label="Last 24 hours" value={last24h.toLocaleString("en-US")} />
        <Tile label="Last 7 days" value={last7d.toLocaleString("en-US")} />
        <Tile label="Unique domains" value={domains.toLocaleString("en-US")} />
        <Tile
          label="Completed"
          value={completed.toLocaleString("en-US")}
          hint={`${failed.toLocaleString("en-US")} failed`}
        />
        <Tile
          label="Full unlocks"
          value={unlocks.toLocaleString("en-US")}
          hint={`${promoUnlocks.toLocaleString("en-US")} via promo`}
        />
        <Tile
          label="PROMO10 left"
          value={limitedPromo.remaining.toLocaleString("en-US")}
          hint={`${limitedPromo.used} of ${limitedPromo.limit} used`}
        />
      </div>

      {/* Funnel from existing data: every completed scan lands on the results/paywall
          page, so 'completed' is the paywall-reached stage. Paid = Stripe unlocks. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle">
          Conversion funnel
        </h2>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/50">
          <FunnelRow label="Scans started" value={total} ofTop={100} />
          <FunnelRow
            label="Reached paywall"
            value={completed}
            ofTop={pct(completed, total)}
            conversion={`${pct(completed, total)}% of started`}
          />
          <FunnelRow
            label="Unlocked (any)"
            value={unlocks}
            ofTop={pct(unlocks, total)}
            conversion={`${pct(unlocks, completed)}% of paywall`}
          />
          <FunnelRow
            label="Paid unlock"
            value={paidUnlocks}
            ofTop={pct(paidUnlocks, total)}
            conversion={`${pct(paidUnlocks, completed)}% of paywall`}
          />
        </ul>
        <p className="text-[0.7rem] text-fg-subtle">
          Every completed scan lands on the results page with the paywall, so “reached paywall”
          equals completed scans. “Paid” excludes promo unlocks.
        </p>
      </section>

      <p className="text-xs text-fg-subtle">
        Live counts from the database. Bookmark this URL with your token — it 404s without it.
      </p>
    </main>
  );
}
