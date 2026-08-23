"""Production HTTP transport (httpx) — a thin FetchFn for the crawler.

Single-hop only (redirects are followed by SafeFetcher, which re-validates each
hop via E03). Streams the body and aborts past the byte cap.

SECURITY NOTE (Sol-review scope): validate_target has already checked the host
and pinned a safe IP before this runs, but this adapter still lets httpx resolve
the hostname itself, leaving a small TOCTOU/rebinding window between validation
and connection. Hardening this to connect to the pre-validated IP (with correct
Host header + TLS SNI) is required as part of the mandatory SOL_HIGH review of
the crawler before production (E19/E20).
"""

from __future__ import annotations

import httpx

from .types import RawResponse

# Browser-like request headers. Many WAFs/CDNs (Akamai, Cloudflare) 403 requests
# that carry a non-browser User-Agent or lack the header set a real browser
# sends — which blocked legitimate on-demand audits of public pages (e.g. Mayo
# Clinic, Shopify Help) entirely. Presenting as a mainstream browser at the
# transport level restores access. This does NOT change robots.txt behavior: the
# crawler still honors robots for its own token (see robots.RobotsPolicy), so we
# never fetch a path the site disallows — only the wire-level UA/headers change.
_BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
_BROWSER_HEADERS = {
    "User-Agent": _BROWSER_UA,
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua": '"Chromium";v="125", "Not.A/Brand";v="24", "Google Chrome";v="125"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
}


def httpx_fetch(url: str, pinned_ip: str, max_bytes: int) -> RawResponse:
    headers = _BROWSER_HEADERS
    timeout = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)
    with (
        httpx.Client(follow_redirects=False, timeout=timeout, headers=headers) as client,
        client.stream("GET", url) as response,
    ):
        body = bytearray()
        for chunk in response.iter_bytes():
            body.extend(chunk)
            if len(body) > max_bytes:
                break  # over cap; SafeFetcher rejects oversized bodies
        return RawResponse(
            status_code=response.status_code,
            headers={k.lower(): v for k, v in response.headers.items()},
            body=bytes(body),
        )
