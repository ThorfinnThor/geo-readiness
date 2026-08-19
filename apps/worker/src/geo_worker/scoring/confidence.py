"""Confidence scoring (§24) — computed separately from readiness.

Weights (sum 100): crawl completeness 30, profile evidence quality 25, page
classification quality 15, cluster evidence coverage 15, structured-data parse
health 10, content extraction health 5. Bands: high ≥85, moderate 70–84, low <70.
"""

from __future__ import annotations

from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile

from .types import ConfidenceComponent, CrawlMeta


def confidence_band(score: float) -> str:
    if score >= 85:
        return "high"
    if score >= 70:
        return "moderate"
    return "low"


def compute_confidence(
    pages: list[ExtractedPage],
    profile: BusinessProfile,
    coverage: CoverageReport,
    crawl_meta: CrawlMeta,
) -> tuple[float, list[ConfidenceComponent]]:
    n = len(pages)

    if crawl_meta.pages_requested > 0:
        crawl_completeness = min(crawl_meta.pages_crawled / crawl_meta.pages_requested, 1.0)
    else:
        crawl_completeness = 1.0 if n else 0.0

    if profile.evidence:
        evidence_quality = sum(e.confidence for e in profile.evidence) / len(profile.evidence)
    else:
        evidence_quality = 0.0

    classification = (sum(1 for p in pages if p.page_type != "other") / n) if n else 0.0

    if coverage.clusters:
        cluster_cov = sum(1 for c in coverage.clusters if c.coverage_score > 0) / len(
            coverage.clusters
        )
    else:
        cluster_cov = 0.0

    parse_health = 1.0 if any(p.json_ld for p in pages) else 0.7
    extraction_health = (sum(1 for p in pages if p.visible_text) / n) if n else 0.0

    entries = [
        ("crawl_completeness", 30, crawl_completeness),
        ("profile_evidence_quality", 25, evidence_quality),
        ("page_classification_quality", 15, classification),
        ("cluster_evidence_coverage", 15, cluster_cov),
        ("structured_data_parse_health", 10, parse_health),
        ("content_extraction_health", 5, extraction_health),
    ]
    components = [
        ConfidenceComponent(name=nm, weight=w, strength=round(s, 4), points=round(w * s, 4))
        for nm, w, s in entries
    ]
    score = round(sum(c.points for c in components), 2)
    return score, components
