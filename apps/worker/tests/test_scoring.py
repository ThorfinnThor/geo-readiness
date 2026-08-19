"""Readiness score engine tests (E10)."""

from __future__ import annotations

from geo_worker.coverage.types import ClusterCoverageResult, CoverageReport
from geo_worker.extraction.types import ExtractedPage, Link
from geo_worker.profile.types import BusinessProfile, EvidenceItem
from geo_worker.scoring import compute_readiness, recompute_overall
from geo_worker.scoring.confidence import confidence_band
from geo_worker.scoring.types import COMPONENT_WEIGHTS, CrawlMeta

MV = "geo-readiness-v1"
META = CrawlMeta(pages_requested=12, pages_crawled=10)


def _page(url: str, page_type: str, chash: str, **kw) -> ExtractedPage:
    return ExtractedPage(final_url=url, page_type=page_type, content_hash=chash, **kw)


def _weak() -> tuple[list[ExtractedPage], BusinessProfile, CoverageReport]:
    pages = [_page("https://w.example/", "other", "hw", visible_text="hi")]
    profile = BusinessProfile(canonical_domain="w.example", needs_confirmation=True)
    coverage = CoverageReport(prompt_coverage_score=0.0, clusters=[])
    return pages, profile, coverage


def _strong() -> tuple[list[ExtractedPage], BusinessProfile, CoverageReport]:
    long = "Wir bieten umfassende Leistungen. " * 20  # >400 chars
    links = [Link(href="https://acme.example/x", text="x")]
    pages = [
        _page(
            "https://acme.example/",
            "home",
            "h0",
            title="Acme",
            h1="Acme",
            canonical_url="https://acme.example/",
            internal_links=links,
            visible_text=long + " 2026 ",
            json_ld=[
                {
                    "@type": "Organization",
                    "name": "Acme",
                    "url": "https://acme.example/",
                    "address": {
                        "@type": "PostalAddress",
                        "addressLocality": "Berlin",
                        "addressCountry": "DE",
                    },
                    "telephone": "+49",
                    "datePublished": "2026-01-01",
                }
            ],
        ),
        _page(
            "https://acme.example/about",
            "about",
            "h1",
            title="About Acme",
            h1="About Acme",
            canonical_url="https://acme.example/about",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/kontakt",
            "contact",
            "h2",
            canonical_url="https://acme.example/kontakt",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/impressum",
            "legal",
            "h3",
            canonical_url="https://acme.example/impressum",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/leistungen/one",
            "service",
            "h4",
            title="One",
            h1="One",
            canonical_url="https://acme.example/leistungen/one",
            internal_links=links,
            visible_text=long + " 42 ",
            json_ld=[{"@type": "Service", "name": "One"}],
        ),
        _page(
            "https://acme.example/referenzen",
            "case_study",
            "h5",
            canonical_url="https://acme.example/referenzen",
            internal_links=links,
            visible_text=long,
        ),
        _page(
            "https://acme.example/faq",
            "faq",
            "h6",
            canonical_url="https://acme.example/faq",
            internal_links=links,
            visible_text=long,
        ),
    ]
    profile = BusinessProfile(
        canonical_domain="acme.example",
        brand_name="Acme",
        needs_confirmation=False,
        legal_name="Acme Inc.",
        services=["one", "two", "three"],
        products=["widget"],
        locations=["Berlin"],
        countries=["DE"],
        languages=["de", "en"],
        target_audiences=["smb"],
        evidence=[
            EvidenceItem(field_name="service", value="one", source_type="json_ld", confidence=0.9)
        ],
    )
    coverage = CoverageReport(
        prompt_coverage_score=80.0,
        clusters=[ClusterCoverageResult(cluster_key="k", coverage_score=80.0, confidence=0.8)],
    )
    return pages, profile, coverage


def test_component_weights_sum_to_one() -> None:
    assert round(sum(COMPONENT_WEIGHTS.values()), 6) == 1.0


def test_subscore_weights_sum_to_100_and_bounds() -> None:
    pages, profile, coverage = _strong()
    result = compute_readiness(pages, profile, coverage, META, MV)
    for comp in result.components:
        assert sum(s.weight for s in comp.subscores) == 100
        assert 0.0 <= comp.score <= 100.0
    for score in (
        result.overall_score,
        result.confidence_score,
        result.entity_clarity_score,
        result.technical_access_score,
    ):
        assert 0.0 <= score <= 100.0


def test_overall_recomputes_from_components() -> None:
    pages, profile, coverage = _strong()
    result = compute_readiness(pages, profile, coverage, META, MV)
    assert recompute_overall(result.components) == result.overall_score
    assert result.methodology_version == MV


def test_monotonicity_strong_dominates_weak() -> None:
    weak = compute_readiness(*_weak(), META, MV)
    strong = compute_readiness(*_strong(), META, MV)

    assert strong.overall_score > weak.overall_score
    for attr in (
        "entity_clarity_score",
        "offer_clarity_score",
        "prompt_coverage_score",
        "sourceability_score",
        "structured_data_score",
        "evidence_trust_score",
        "technical_access_score",
    ):
        assert getattr(strong, attr) >= getattr(weak, attr), attr


def test_confidence_is_separate_and_banded() -> None:
    weak = compute_readiness(*_weak(), META, MV)
    strong = compute_readiness(*_strong(), META, MV)
    assert 0.0 <= weak.confidence_score <= 100.0
    assert strong.confidence_score >= weak.confidence_score
    assert confidence_band(90) == "high"
    assert confidence_band(75) == "moderate"
    assert confidence_band(50) == "low"
    # Confidence weights sum to 100.
    assert sum(c.weight for c in strong.confidence_components) == 100
