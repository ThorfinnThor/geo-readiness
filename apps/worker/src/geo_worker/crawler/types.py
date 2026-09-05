"""Crawler data types and injectable transport protocols."""

from __future__ import annotations

import enum
from collections.abc import Callable
from dataclasses import dataclass, field

from geo_worker.extraction.types import ExtractedPage


@dataclass
class RawResponse:
    """A single-hop HTTP response (redirects NOT followed by the transport)."""

    status_code: int
    headers: dict[str, str]  # lowercased keys
    body: bytes


# Low-level single-hop fetch: (url, pinned_ip, max_bytes) -> RawResponse.
# Must not follow redirects and must cap the body at max_bytes.
FetchFn = Callable[[str, str, int], RawResponse]

# Optional JS renderer: url -> rendered HTML (or None if it could not render).
RenderFn = Callable[[str], str | None]


class CrawlStatus(enum.StrEnum):
    completed = "completed"
    partial = "partial"
    failed = "failed"
    cancelled = "cancelled"


@dataclass
class CrawlMetrics:
    pages_fetched: int = 0
    browser_renders: int = 0
    total_bytes: int = 0
    errors: int = 0
    ssrf_blocked: int = 0
    robots_skipped: int = 0
    redirects_followed: int = 0
    frontier_seen: int = 0


@dataclass
class CrawlResult:
    status: CrawlStatus
    pages: list[ExtractedPage] = field(default_factory=list)
    metrics: CrawlMetrics = field(default_factory=CrawlMetrics)
    homepage_reachable: bool = False
    robots_blocked_core: bool = False
    # Which documented AI crawlers this site's robots.txt lets in, token -> may
    # crawl the root. Read from the same robots.txt already fetched for our own
    # crawl, so it costs no extra request.
    ai_crawler_access: dict[str, bool] = field(default_factory=dict)
