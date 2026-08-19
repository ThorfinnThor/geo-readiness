"""SSRF-guarded fetch with per-hop redirect re-validation (§9)."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin

from geo_worker.security import CrawlLimits, validate_target
from geo_worker.security.resolver import Resolver, system_resolver

from .types import FetchFn, RawResponse

_REDIRECT_CODES = frozenset({301, 302, 303, 307, 308})


class FetchError(Exception):
    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


@dataclass
class FetchOutcome:
    final_url: str
    response: RawResponse
    redirects: int


class SafeFetcher:
    """Validates every URL/redirect via E03 and streams within byte caps."""

    def __init__(
        self,
        fetch_fn: FetchFn,
        limits: CrawlLimits,
        *,
        resolver: Resolver = system_resolver,
        allow_raw_ip: bool = False,
    ) -> None:
        self._fetch = fetch_fn
        self._limits = limits
        self._resolver = resolver
        self._allow_raw_ip = allow_raw_ip

    def fetch(self, url: str) -> FetchOutcome:
        """Fetch a URL, re-validating each redirect hop. Raises SSRFBlocked / FetchError."""
        current = url
        redirects = 0
        for _ in range(self._limits.max_redirects + 1):
            # Re-validate on every hop — defeats redirect-based SSRF + rebinding.
            target = validate_target(
                current, allow_raw_ip=self._allow_raw_ip, resolver=self._resolver
            )
            resp = self._fetch(
                target.normalized_url, target.ips[0], self._limits.max_response_bytes
            )

            if len(resp.body) > self._limits.max_response_bytes:
                raise FetchError("response_too_large")

            if resp.status_code in _REDIRECT_CODES:
                location = resp.headers.get("location")
                if not location:
                    return FetchOutcome(target.normalized_url, resp, redirects)
                current = urljoin(target.normalized_url, location)
                redirects += 1
                continue

            return FetchOutcome(target.normalized_url, resp, redirects)

        raise FetchError("too_many_redirects")
