"""Confidence reflects true crawl coverage: hitting the page cap on a large site
(24 of 400 discovered) must lower crawl completeness, while a small site fully
crawled is unaffected (keeps the frozen behaviour)."""

from __future__ import annotations

from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.confidence import compute_confidence
from geo_worker.scoring.types import CrawlMeta


def _strength(pages, meta) -> float:
    _, comps = compute_confidence(
        pages,
        BusinessProfile(canonical_domain="x.example"),
        CoverageReport(prompt_coverage_score=0.0),
        meta,
    )
    return next(c.strength for c in comps if c.name == "crawl_completeness")


def test_hitting_cap_on_large_site_lowers_completeness() -> None:
    pages = [ExtractedPage(final_url=f"https://x/{i}", page_type="other") for i in range(24)]
    capped = _strength(pages, CrawlMeta(pages_requested=24, pages_crawled=24, pages_discovered=400))
    assert capped < 1.0  # only sampled 24 of 400


def test_small_site_under_cap_is_unaffected() -> None:
    pages = [ExtractedPage(final_url=f"https://x/{i}", page_type="other") for i in range(5)]
    # 5 crawled of 5 discovered, cap 24 not hit -> completeness is the plain ratio.
    s = _strength(pages, CrawlMeta(pages_requested=24, pages_crawled=5, pages_discovered=5))
    assert s == round(5 / 24, 4)
