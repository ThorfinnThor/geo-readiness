"""Crawl orchestration (§10) — bounded, SSRF-guarded, deterministic."""

from __future__ import annotations

import re
from collections.abc import Callable
from urllib.parse import urlsplit

from geo_worker.extraction import extract_page
from geo_worker.security import CrawlLimits, SSRFBlocked, validate_target
from geo_worker.security.resolver import Resolver, system_resolver

from .fetcher import FetchError, SafeFetcher
from .frontier import Frontier, locale_prefix
from .robots import RobotsPolicy
from .types import CrawlMetrics, CrawlResult, CrawlStatus, FetchFn, RenderFn

_LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>", re.IGNORECASE)
_MAX_SITEMAP_LOCS = 50
_MIN_TEXT_FOR_RENDER = 200


def _decode(body: bytes) -> str:
    return body.decode("utf-8", errors="replace")


def _is_html(headers: dict[str, str]) -> bool:
    ctype = headers.get("content-type", "")
    return ctype == "" or "html" in ctype.lower()


def crawl(
    start_url: str,
    *,
    limits: CrawlLimits,
    fetch_fn: FetchFn,
    resolver: Resolver = system_resolver,
    allow_raw_ip: bool = False,
    render_fn: RenderFn | None = None,
    should_cancel: Callable[[], bool] | None = None,
) -> CrawlResult:
    metrics = CrawlMetrics()
    fetcher = SafeFetcher(fetch_fn, limits, resolver=resolver, allow_raw_ip=allow_raw_ip)

    # Validate the seed before anything else.
    try:
        seed = validate_target(start_url, allow_raw_ip=allow_raw_ip, resolver=resolver)
    except SSRFBlocked:
        return CrawlResult(status=CrawlStatus.failed, metrics=metrics)

    start = seed.normalized_url
    parts = urlsplit(start)
    origin = f"{parts.scheme}://{parts.netloc}"

    robots = _load_robots(fetcher, origin, metrics)

    frontier = Frontier()
    frontier.enqueue(start, 0)
    # A start URL that already carries a locale ("/en/…") fixes the primary
    # language before sitemap seeding; otherwise the first page settles it below.
    frontier.set_primary_locale(locale_prefix(start))
    for sm_url in robots.sitemaps:
        _seed_sitemap(fetcher, sm_url, frontier, metrics)

    result = CrawlResult(status=CrawlStatus.completed, metrics=metrics)
    cancelled = False

    while frontier and metrics.pages_fetched < limits.max_pages:
        if metrics.total_bytes >= limits.max_total_bytes:
            break
        if should_cancel is not None and should_cancel():
            cancelled = True
            break

        url, depth = frontier.pop()
        if not robots.can_fetch(url):
            metrics.robots_skipped += 1
            if url == start:
                result.robots_blocked_core = True
            continue

        try:
            outcome = fetcher.fetch(url)
        except SSRFBlocked:
            metrics.ssrf_blocked += 1
            continue
        except FetchError:
            metrics.errors += 1
            continue

        metrics.redirects_followed += outcome.redirects
        resp = outcome.response
        metrics.total_bytes += len(resp.body)

        if resp.status_code >= 400:
            metrics.errors += 1
            continue
        if not _is_html(resp.headers):
            continue

        page = extract_page(_decode(resp.body), outcome.final_url)

        # Selective, hard-capped browser fallback for JS-thin pages.
        if (
            render_fn is not None
            and len(page.visible_text) < _MIN_TEXT_FOR_RENDER
            and metrics.browser_renders < limits.max_browser_renders
        ):
            metrics.browser_renders += 1
            rendered = render_fn(outcome.final_url)
            if rendered:
                page = extract_page(rendered, outcome.final_url)

        result.pages.append(page)
        metrics.pages_fetched += 1
        if url == start:
            result.homepage_reachable = True
            # The site's own declared language, so translated copies rank last.
            frontier.set_primary_locale(page.language)

        if depth < limits.max_depth:
            for link in page.internal_links:
                frontier.enqueue(link.href, depth + 1)

    metrics.frontier_seen = frontier.seen_count
    if cancelled:
        result.status = CrawlStatus.cancelled
    elif len(frontier) > 0:
        result.status = CrawlStatus.partial
    else:
        result.status = CrawlStatus.completed
    return result


def _load_robots(fetcher: SafeFetcher, origin: str, metrics: CrawlMetrics) -> RobotsPolicy:
    try:
        outcome = fetcher.fetch(f"{origin}/robots.txt")
    except (SSRFBlocked, FetchError):
        return RobotsPolicy.allow_all()
    if outcome.response.status_code == 200:
        return RobotsPolicy.parse(_decode(outcome.response.body))
    return RobotsPolicy.allow_all()


def _seed_sitemap(
    fetcher: SafeFetcher, sitemap_url: str, frontier: Frontier, metrics: CrawlMetrics
) -> None:
    try:
        outcome = fetcher.fetch(sitemap_url)
    except (SSRFBlocked, FetchError):
        return
    if outcome.response.status_code != 200:
        return
    for loc in _LOC_RE.findall(_decode(outcome.response.body))[:_MAX_SITEMAP_LOCS]:
        frontier.enqueue(loc, 1)
