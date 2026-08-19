// CSRF defenses: (1) a strict same-origin check on mutating requests, and
// (2) a double-submit token (cookie value must match the request header).
// Combined with SameSite=Lax session cookies this is defense in depth.
import { generateToken, safeEqual } from "@/lib/auth/tokens";

export const CSRF_COOKIE = "geo_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function generateCsrfToken(): string {
  return generateToken(32);
}

/**
 * Verify the request Origin (or Referer) host matches an allowed host.
 * Returns false when neither header is present on a mutating request.
 */
export function isSameOrigin(
  originHeader: string | null,
  refererHeader: string | null,
  allowedHosts: string[],
): boolean {
  const source = originHeader ?? refererHeader;
  if (!source) return false;
  let host: string;
  try {
    host = new URL(source).host;
  } catch {
    return false;
  }
  return allowedHosts.includes(host);
}

/** Double-submit check: header token must equal the cookie token. */
export function isCsrfTokenValid(
  cookieToken: string | undefined,
  headerToken: string | undefined,
): boolean {
  if (!cookieToken || !headerToken) return false;
  return safeEqual(cookieToken, headerToken);
}
