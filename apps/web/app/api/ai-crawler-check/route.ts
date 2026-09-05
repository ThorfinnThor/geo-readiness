import { NextResponse } from "next/server";

import { clientIpHash } from "@/lib/auth/http";
import { CRAWLERS } from "@/lib/content/crawlers";
import { fetchRobots } from "@/lib/robots/fetch";
import { hasPathRestrictions, parseRobots, rootVerdict } from "@/lib/robots/parse";
import { checkCrawlerCheckRateLimit } from "@/lib/scans/abuse";

export const runtime = "nodejs";

export interface CrawlerCheckRow {
  token: string;
  verdict: "allowed" | "blocked";
  matchedBy: "agent" | "wildcard" | "default";
  pathRestrictions: boolean;
}

export interface CrawlerCheckResponse {
  domain: string;
  robotsStatus: number;
  robotsUrl: string;
  hasRobots: boolean;
  sitemaps: string[];
  rows: CrawlerCheckRow[];
}

// POST /api/ai-crawler-check — public, anonymous, no account. Reads one file
// (https://<domain>/robots.txt) and reports which documented AI agents it lets
// through. No same-origin guard: the whole point is a tool anyone can reach,
// and it writes nothing. The rate limit is what keeps it from being a proxy.
export async function POST(req: Request): Promise<NextResponse> {
  if (!checkCrawlerCheckRateLimit(clientIpHash(req) ?? "unknown")) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let domain: unknown;
  try {
    ({ domain } = (await req.json()) as { domain?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (typeof domain !== "string" || domain.length > 255) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const fetched = await fetchRobots(domain);
  if (!fetched.ok) {
    const status = fetched.reason === "invalid_domain" ? 400 : 502;
    return NextResponse.json({ error: fetched.reason }, { status });
  }

  const file = parseRobots(fetched.text);
  const rows: CrawlerCheckRow[] = CRAWLERS.map((c) => {
    const v = rootVerdict(file, c.token);
    return {
      token: c.token,
      verdict: v.verdict,
      matchedBy: v.matchedBy,
      pathRestrictions: hasPathRestrictions(v),
    };
  });

  const body: CrawlerCheckResponse = {
    domain: new URL(fetched.finalUrl).hostname,
    robotsStatus: fetched.status,
    robotsUrl: fetched.finalUrl,
    hasRobots: fetched.status === 200 && fetched.text.trim() !== "",
    sitemaps: file.sitemaps.slice(0, 10),
    rows,
  };
  return NextResponse.json(body, {
    headers: { "cache-control": "no-store" },
  });
}
