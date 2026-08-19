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

from .robots import USER_AGENT
from .types import RawResponse


def httpx_fetch(url: str, pinned_ip: str, max_bytes: int) -> RawResponse:
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
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
