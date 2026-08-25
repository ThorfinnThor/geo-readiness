"""RDY-009 split (§v2-plan 4.3): duplicate content and page-type classification
are independent findings. A site with unique content but many unclassified pages
must not be told it has duplicate content."""

from __future__ import annotations

from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.methodology.v2.actions import compute_actions
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.types import ComponentScore, ReadinessResult

_COMPONENTS = [
    "entity_clarity",
    "offer_clarity",
    "prompt_coverage",
    "sourceability",
    "structured_data",
    "evidence_trust",
    "technical_access",
]


def _readiness() -> ReadinessResult:
    return ReadinessResult(
        methodology_version="geo-readiness-v2",
        overall_score=70.0,
        entity_clarity_score=70.0,
        offer_clarity_score=70.0,
        prompt_coverage_score=70.0,
        sourceability_score=70.0,
        structured_data_score=70.0,
        evidence_trust_score=70.0,
        technical_access_score=70.0,
        confidence_score=70.0,
        components=[ComponentScore(name=n, score=70.0) for n in _COMPONENTS],
    )


def _page(url: str, text: str, ptype: str) -> ExtractedPage:
    return ExtractedPage(
        final_url=url, visible_text=text, content_hash=str(hash(text)), page_type=ptype
    )


def _run(pages: list[ExtractedPage]):
    return compute_actions(
        _readiness(),
        BusinessProfile(canonical_domain="ex.example"),
        CoverageReport(prompt_coverage_score=70.0),
        [],
        pages,
    )


def test_unique_content_but_unclassified_reports_only_classification() -> None:
    # §4.3 acceptance: unique_content_ratio = 1.0, unclassified_page_ratio ≈ 0.83.
    pages = [_page(f"https://ex.example/p{i}", f"unique text {i}", "other") for i in range(5)]
    pages.append(_page("https://ex.example/", "home text", "home"))
    ids = {a.rule_id for a in _run(pages)}
    assert "RDY-014" in ids  # page-type classification finding
    assert "RDY-009A" not in ids  # NOT duplicate content


def test_duplicate_content_on_classified_pages_reports_only_duplicate() -> None:
    pages = [_page(f"https://ex.example/s{i}", "identical body", "service") for i in range(6)]
    ids = {a.rule_id for a in _run(pages)}
    assert "RDY-009A" in ids  # duplicate content finding
    assert "RDY-014" not in ids  # none are unclassified


def test_both_problems_yield_both_findings() -> None:
    pages = [_page(f"https://ex.example/x{i}", "same", "other") for i in range(6)]
    ids = {a.rule_id for a in _run(pages)}
    assert "RDY-009A" in ids and "RDY-014" in ids


def test_clean_site_reports_neither() -> None:
    pages = [_page(f"https://ex.example/s{i}", f"unique service {i}", "service") for i in range(4)]
    ids = {a.rule_id for a in _run(pages)}
    assert "RDY-009A" not in ids and "RDY-014" not in ids
