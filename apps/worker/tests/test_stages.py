"""Stage-score tests (§70–73, §104)."""

from __future__ import annotations

import datetime as dt

from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage, PageSignals
from geo_worker.methodology.v2.scoring import compute_readiness as readiness_v2
from geo_worker.methodology.v2.stages import STAGE_NAMES, compute_stage_scores, load_stage_rollups
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring import recompute_overall
from geo_worker.scoring.types import CrawlMeta

AS_OF = dt.datetime(2026, 8, 20, tzinfo=dt.UTC)
_COMPONENT_KEYS = [
    "entity_clarity",
    "offer_clarity",
    "prompt_coverage",
    "sourceability",
    "structured_data",
    "evidence_trust",
    "technical_access",
]


def test_rollup_weights_sum_to_one() -> None:
    rollups = load_stage_rollups()
    assert set(rollups) == set(STAGE_NAMES)
    for weights in rollups.values():
        assert round(sum(weights.values()), 6) == 1.0


def test_stage_scores_bounded() -> None:
    stages = compute_stage_scores({k: 75.0 for k in _COMPONENT_KEYS})
    for value in stages.values():
        assert value == 75.0  # uniform components → each stage equals them
        assert 0.0 <= value <= 100.0


def _readiness():
    page = ExtractedPage(
        final_url="https://s.example/",
        title="SolarCo",
        h1="SolarCo",
        page_type="service",
        visible_text="content " * 60,
        signals=PageSignals(main_text="content " * 60, data_table_count=1),
    )
    profile = BusinessProfile(
        canonical_domain="s.example", brand_name="SolarCo", needs_confirmation=False
    )
    coverage = CoverageReport(prompt_coverage_score=60.0, clusters=[])
    return readiness_v2(
        [page],
        profile,
        coverage,
        CrawlMeta(pages_requested=12, pages_crawled=1),
        "geo-readiness-v2",
        as_of=AS_OF,
    )


def test_stage_scores_present_and_bounded() -> None:
    r = _readiness()
    for score in (
        r.retrieval_readiness_score,
        r.citation_readiness_score,
        r.answer_extractability_score,
    ):
        assert score is not None
        assert 0.0 <= score <= 100.0


def test_stages_do_not_change_overall() -> None:
    r = _readiness()
    # Overall is the component blend only; stages are derived and excluded.
    assert r.overall_score == recompute_overall(r.components)
