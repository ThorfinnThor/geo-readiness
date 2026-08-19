"""Crawl safety limits (§9). Server-side only; never client-controlled."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CrawlLimits:
    max_pages: int
    max_depth: int
    max_response_bytes: int
    max_total_bytes: int
    max_browser_renders: int
    max_redirects: int = 5
    connect_timeout_s: float = 5.0
    read_timeout_s: float = 15.0


QUICK_LIMITS = CrawlLimits(
    max_pages=12,
    max_depth=2,
    max_response_bytes=3 * 1024 * 1024,  # 3 MB
    max_total_bytes=25 * 1024 * 1024,  # 25 MB
    max_browser_renders=2,
)

FULL_LIMITS = CrawlLimits(
    max_pages=50,
    max_depth=3,
    max_response_bytes=5 * 1024 * 1024,  # 5 MB
    max_total_bytes=100 * 1024 * 1024,  # 100 MB
    max_browser_renders=8,
)
