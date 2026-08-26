"""Offer Clarity is N/A on content/data sites: excluded from the overall and the
stages, shown as not-applicable rather than weak."""

from __future__ import annotations

from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.methodology.v2.scoring import compute_readiness
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.types import CrawlMeta

_PAGES = [
    ExtractedPage(final_url="https://x/", page_type="home", visible_text="hi", content_hash="a")
]


def _readiness(site_type: str):
    prof = BusinessProfile(canonical_domain="x.example", site_type=site_type)
    return compute_readiness(
        _PAGES, prof, CoverageReport(prompt_coverage_score=0.0), CrawlMeta(), "geo-readiness-v2"
    )


def test_offer_clarity_not_applicable_on_data_sites() -> None:
    r = _readiness("documentation_reference")
    offer = next(c for c in r.components if c.name == "offer_clarity")
    assert offer.applicable is False


def test_offer_clarity_applicable_on_commercial_sites() -> None:
    for st in ("unknown", "service_business", "saas"):
        r = _readiness(st)
        offer = next(c for c in r.components if c.name == "offer_clarity")
        assert offer.applicable is True, st


def test_na_offer_raises_overall_vs_counting_it_as_weak() -> None:
    # With a weak offer, excluding it (data site) must not drag the overall the way
    # counting it (commercial site) does — same component scores otherwise.
    data = _readiness("documentation_reference")
    commercial = _readiness("unknown")
    # Both share every other component score; the data site excludes offer, so its
    # overall is >= the commercial one (offer is a drag when counted).
    assert data.overall_score >= commercial.overall_score
