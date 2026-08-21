"""V2 readiness scoring.

Reuses V1 for entity/offer/structured/technical/prompt-coverage (top-level
weights unchanged, §3). Replaces Sourceability entirely (signal-based, §51–60)
and de-proxies Evidence & Trust's supported-specifics subscore (§62).
"""

from __future__ import annotations

import datetime as dt

from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.confidence import compute_confidence
from geo_worker.scoring.engine import (
    _component,
    _entity,
    _offer,
    _ScoreIndex,
    _structured,
    _technical,
    _trust,
)
from geo_worker.scoring.types import (
    COMPONENT_WEIGHTS,
    ComponentScore,
    CrawlMeta,
    ReadinessResult,
    SubScore,
)

from .sourceability import sourceability_component
from .stages import compute_stage_scores

# Calibration curve (V2). Raw readiness proxies saturate well below 100: across
# the 35-site benchmark even strong real sites top out ~75-80 and a purpose-built
# ideal site ~85, so the level bands (Good 65 / Strong 80 / Excellent 90) were
# effectively unreachable. This monotonic curve maps the empirical achievable
# range onto a fuller 0-100 grade so an excellent site reads as "Strong/Excellent"
# — without changing the bands. Endpoints fixed (0→0, 100→100); ordering and the
# positive/negative separation are preserved (monotonic), and the low/noise range
# is barely lifted so weak sites stay weak. Applied to each component; the overall
# is the weighted sum of calibrated components (so header and cards stay consistent).
_CAL_ANCHORS = [
    (0.0, 0.0),
    (35.0, 40.0),
    (55.0, 64.0),
    (70.0, 83.0),
    (85.0, 94.0),
    (100.0, 100.0),
]


def calibrate_score(score: float) -> float:
    """Map a raw 0-100 proxy score onto the calibrated readiness grade."""
    x = max(0.0, min(100.0, score))
    for (x0, y0), (x1, y1) in zip(_CAL_ANCHORS, _CAL_ANCHORS[1:], strict=False):
        if x <= x1:
            return round(y0 + (y1 - y0) * (x - x0) / (x1 - x0), 2)
    return 100.0


def _trust_v2(idx: _ScoreIndex, pages: list[ExtractedPage]) -> list[tuple[str, int, float]]:
    total_quant = sum(p.signals.quantified_information_count for p in pages)
    total_cit = sum(
        p.signals.external_citation_count + p.signals.attributed_quote_count for p in pages
    )
    has_case = any(p.page_type in {"case_study", "reference"} for p in pages)
    supported = min(
        1.0,
        (0.5 if total_quant else 0.0) + (0.3 if total_cit else 0.0) + (0.2 if has_case else 0.0),
    )
    return [
        (name, weight, supported if name == "claims_supported_specifics" else strength)
        for name, weight, strength in _trust(idx)
    ]


def compute_readiness(
    pages: list[ExtractedPage],
    profile: BusinessProfile,
    coverage: CoverageReport,
    crawl_meta: CrawlMeta,
    methodology_version: str,
    as_of: dt.datetime | None = None,
) -> ReadinessResult:
    measurement_as_of = as_of or dt.datetime.now(dt.UTC)
    idx = _ScoreIndex.build(pages, profile)

    entity = _component("entity_clarity", _entity(idx))
    offer = _component("offer_clarity", _offer(idx))
    cov = round(coverage.prompt_coverage_score, 2)
    coverage_component = ComponentScore(
        name="prompt_coverage",
        score=cov,
        subscores=[
            SubScore(
                name="prompt_coverage_aggregate",
                weight=100,
                strength=round(cov / 100, 4),
                points=cov,
            )
        ],
    )
    source, source_diag = sourceability_component(pages, measurement_as_of)
    structured = _component("structured_data", _structured(idx))
    trust = _component("evidence_trust", _trust_v2(idx, pages))
    technical = _component("technical_access", _technical(idx, crawl_meta))

    components = [entity, offer, coverage_component, source, structured, trust, technical]
    # Calibrate each component onto the readiness grade, then derive the overall
    # and stages from the calibrated components so everything stays consistent.
    for c in components:
        c.score = calibrate_score(c.score)
    by_name = {c.name: c.score for c in components}
    overall = round(sum(COMPONENT_WEIGHTS[k] * by_name[k] for k in COMPONENT_WEIGHTS), 2)
    stages = compute_stage_scores(by_name)

    confidence_score, confidence_components = compute_confidence(
        pages, profile, coverage, crawl_meta
    )

    return ReadinessResult(
        methodology_version=methodology_version,
        overall_score=overall,
        entity_clarity_score=entity.score,
        offer_clarity_score=offer.score,
        prompt_coverage_score=coverage_component.score,
        sourceability_score=source.score,
        structured_data_score=structured.score,
        evidence_trust_score=trust.score,
        technical_access_score=technical.score,
        confidence_score=confidence_score,
        components=components,
        confidence_components=confidence_components,
        retrieval_readiness_score=stages["retrieval_readiness"],
        citation_readiness_score=stages["citation_readiness"],
        answer_extractability_score=stages["answer_extractability"],
        as_of=measurement_as_of,
        component_diagnostics=[source_diag],
    )
