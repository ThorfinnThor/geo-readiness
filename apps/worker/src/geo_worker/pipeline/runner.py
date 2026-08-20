"""End-to-end scan pipeline (in-memory, deterministic)."""

from __future__ import annotations

import datetime as dt
from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import urlsplit

from geo_worker.actions import Action
from geo_worker.clusters import GeneratedCluster
from geo_worker.coverage import CoverageReport
from geo_worker.crawler import crawl
from geo_worker.crawler.types import FetchFn, RenderFn
from geo_worker.extraction.signals.dates import validate_page_dates
from geo_worker.methodology import compute_methodology_hash, get_methodology
from geo_worker.profile import BusinessProfile, build_profile
from geo_worker.scoring import ReadinessResult
from geo_worker.scoring.types import CrawlMeta
from geo_worker.security import FULL_LIMITS, QUICK_LIMITS, CrawlLimits
from geo_worker.security.resolver import Resolver, system_resolver


@dataclass
class ScanResult:
    canonical_domain: str
    scan_type: str
    methodology_version: str
    pages_analyzed: int
    profile: BusinessProfile
    clusters: list[GeneratedCluster]
    coverage: CoverageReport
    readiness: ReadinessResult
    actions: list[Action]
    crawl_status: str
    as_of: dt.datetime
    methodology_hash: str


def _limits_for(scan_type: str) -> CrawlLimits:
    return FULL_LIMITS if scan_type == "full" else QUICK_LIMITS


def run_pipeline(
    start_url: str,
    *,
    scan_type: str = "quick",
    methodology_version: str = "geo-readiness-v2",
    fetch_fn: FetchFn,
    resolver: Resolver = system_resolver,
    allow_raw_ip: bool = False,
    render_fn: RenderFn | None = None,
    should_cancel: Callable[[], bool] | None = None,
    confirmed_name: str | None = None,
    as_of: dt.datetime | None = None,
) -> ScanResult:
    """Run the full scan and return every engine output in memory.

    `as_of` is resolved once and pinned (reproducibility, V2 §11): the same
    crawl + same as_of + same methodology hash yields the same result. Freshness
    scoring (a later phase) reads this instead of calling datetime.now itself.
    """
    measurement_as_of = as_of or dt.datetime.now(dt.UTC)
    limits = _limits_for(scan_type)
    crawl_result = crawl(
        start_url,
        limits=limits,
        fetch_fn=fetch_fn,
        resolver=resolver,
        allow_raw_ip=allow_raw_ip,
        render_fn=render_fn,
        should_cancel=should_cancel,
    )
    pages = crawl_result.pages
    canonical_domain = urlsplit(start_url).hostname or start_url

    # Validate page dates against the pinned as_of (future/invalid flags, §36).
    for page in pages:
        validate_page_dates(page.signals, measurement_as_of)

    # Dispatch by methodology version (fail-closed on unknown versions).
    methodology = get_methodology(methodology_version)
    methodology_hash = compute_methodology_hash(
        methodology_version, methodology.prompt_config_version
    )

    profile = build_profile(pages, canonical_domain, confirmed_name)
    clusters = methodology.generate_clusters(
        profile, methodology_version, scan_type, prompt_version=methodology.prompt_config_version
    )
    coverage = methodology.compute_coverage(clusters, pages, profile)

    fetched = crawl_result.metrics.pages_fetched
    errors = crawl_result.metrics.errors
    crawl_meta = CrawlMeta(
        pages_requested=limits.max_pages,
        pages_crawled=fetched,
        homepage_reachable=crawl_result.homepage_reachable,
        robots_blocked_core=crawl_result.robots_blocked_core,
        valid_response_ratio=(fetched / (fetched + errors)) if (fetched + errors) else 1.0,
    )
    readiness = methodology.compute_readiness(
        pages, profile, coverage, crawl_meta, methodology_version, as_of=measurement_as_of
    )
    actions = methodology.compute_actions(readiness, profile, coverage, clusters, pages)

    return ScanResult(
        canonical_domain=canonical_domain,
        scan_type=scan_type,
        methodology_version=methodology_version,
        pages_analyzed=len(pages),
        profile=profile,
        clusters=clusters,
        coverage=coverage,
        readiness=readiness,
        actions=actions,
        crawl_status=str(crawl_result.status),
        as_of=measurement_as_of,
        methodology_hash=methodology_hash,
    )
