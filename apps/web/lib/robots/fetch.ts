// Server-side fetch of a third party's robots.txt for the public checker.
//
// This takes an arbitrary hostname from an anonymous caller, so it is an SSRF
// surface and is treated as one: the host must be a public domain, every
// address it resolves to must be publicly routable, only https://<host>/robots.txt
// is ever requested, redirects are followed manually with the same checks
// re-applied at each hop, and the response is bounded in both time and size.
//
// Residual risk, stated rather than hidden: Node's fetch resolves DNS itself,
// so a name that passes validation could in principle resolve differently a
// moment later (DNS rebinding). The blast radius is one GET of /robots.txt over
// https whose body is parsed into directives — no headers, cookies or other
// paths are ever returned. The worker's SafeFetcher pins the resolved IP and is
// the right tool where more is at stake.
import { lookup } from "node:dns/promises";

import { InvalidDomainError, normalizeDomain } from "@/lib/scans/domain";

const TIMEOUT_MS = 6000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 2;

export type FetchFailure =
  | "invalid_domain"
  | "private_host"
  | "dns_failed"
  | "timeout"
  | "too_large"
  | "unreachable";

export type RobotsFetchResult =
  | { ok: true; status: number; text: string; finalUrl: string }
  | { ok: false; reason: FetchFailure };

function ipv4IsPublic(addr: string): boolean {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return false; // this-network, private, loopback
  if (a === 169 && b === 254) return false; // link-local, incl. cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 192 && b === 0) return false; // IETF protocol assignments / TEST-NET-1
  if (a === 198 && b === 51) return false; // TEST-NET-2
  if (a === 203 && b === 0) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast and reserved
  return true;
}

export function isPublicAddress(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  if (!a) return false;
  // Anything without a colon has to be an IPv4 literal, and ipv4IsPublic
  // rejects it if it is not one. Falling through to the IPv6 branch here would
  // let an unparseable string be judged public, which is the wrong way to fail.
  if (!a.includes(":")) return ipv4IsPublic(a);
  if (!/^[0-9a-f:.]+$/.test(a)) return false;
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) must be judged as the IPv4 it carries.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(a);
  if (mapped) return ipv4IsPublic(mapped[1]!);
  if (a.includes(".")) return false; // any other dotted form is not a plain IPv6
  if (a === "::" || a === "::1") return false; // unspecified, loopback
  if (/^f[cd]/.test(a)) return false; // fc00::/7 unique local
  if (/^fe[89ab]/.test(a)) return false; // fe80::/10 link-local
  if (a.startsWith("ff")) return false; // multicast
  return true;
}

async function resolvesPublicly(host: string): Promise<boolean> {
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => isPublicAddress(a.address));
  } catch {
    return false;
  }
}

export async function fetchRobots(input: string): Promise<RobotsFetchResult> {
  let host: string;
  try {
    host = normalizeDomain(input);
  } catch (err) {
    if (err instanceof InvalidDomainError) return { ok: false, reason: "invalid_domain" };
    throw err;
  }
  if (!(await resolvesPublicly(host))) return { ok: false, reason: "private_host" };

  let url = `https://${host}/robots.txt`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const res = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Identify honestly. A site owner reading their logs should be able to
          // see who asked and why.
          "user-agent": "FindYourAIScore-RobotsCheck/1.0 (+https://www.findyouraiscore.com/ai-crawler-check)",
          accept: "text/plain,*/*",
        },
        cache: "no-store",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) return { ok: false, reason: "unreachable" };
        let next: URL;
        try {
          next = new URL(location, url);
        } catch {
          return { ok: false, reason: "unreachable" };
        }
        // Re-validate every hop: a redirect is an attacker-controlled jump.
        if (next.protocol !== "https:") return { ok: false, reason: "unreachable" };
        if (!(await resolvesPublicly(next.hostname))) return { ok: false, reason: "private_host" };
        url = next.toString();
        continue;
      }

      // No robots.txt is a valid, meaningful answer: everything is allowed.
      if (res.status === 404 || res.status === 410) {
        return { ok: true, status: res.status, text: "", finalUrl: url };
      }
      if (!res.ok) return { ok: false, reason: "unreachable" };

      const length = Number(res.headers.get("content-length") ?? 0);
      if (length > MAX_BYTES) return { ok: false, reason: "too_large" };
      const text = await res.text();
      if (text.length > MAX_BYTES) return { ok: false, reason: "too_large" };
      return { ok: true, status: res.status, text, finalUrl: url };
    }
    return { ok: false, reason: "unreachable" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
