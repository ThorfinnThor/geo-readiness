// Light domain normalization for the submit form. The AUTHORITATIVE SSRF/domain
// validation happens in the worker (E03) before any fetch; this only shapes the
// input and rejects obviously invalid or non-public hosts early.
export class InvalidDomainError extends Error {}

export function normalizeDomain(input: string): string {
  let s = (input || "").trim().toLowerCase();
  if (!s) throw new InvalidDomainError("empty");
  if (s.includes("://")) {
    try {
      s = new URL(s).hostname;
    } catch {
      throw new InvalidDomainError("invalid_url");
    }
  } else {
    s = s.split("/")[0]!;
  }
  s = s.replace(/\.$/, "");
  if (
    !/^[a-z0-9.-]+$/.test(s) ||
    !s.includes(".") ||
    s === "localhost" ||
    s.endsWith(".local") ||
    s.endsWith(".internal")
  ) {
    throw new InvalidDomainError("invalid_domain");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    throw new InvalidDomainError("no_raw_ip"); // public free scan: no raw IPs (§8)
  }
  return s;
}
