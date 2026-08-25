"""V2 coverage (§48–50): requirements + topical alignment.

    coverage_score = 0.70 · requirements_score + 0.30 · topical_alignment_score

The 70/30 split is a product heuristic (§50), to be benchmarked later. V1
coverage is untouched.
"""

from __future__ import annotations

from geo_worker.clusters.types import GeneratedCluster
from geo_worker.coverage.engine import aggregate_prompt_coverage, score_requirements
from geo_worker.coverage.types import CoverageReport, LanguageCoverage
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile
from geo_worker.relevance import TopicalAlignmentEngine

_REQUIREMENTS_WEIGHT = 0.70
_TOPICAL_WEIGHT = 0.30


def _coverage_score(
    clusters: list[GeneratedCluster],
    pages: list[ExtractedPage],
    profile: BusinessProfile,
) -> float:
    """Aggregate prompt-coverage score from a given page subset."""
    results = score_requirements(clusters, pages, profile)
    aligner = TopicalAlignmentEngine(pages)
    for result, cluster in zip(results, clusters, strict=True):
        alignment = aligner.score_cluster(cluster)
        result.coverage_score = round(
            _REQUIREMENTS_WEIGHT * result.coverage_score + _TOPICAL_WEIGHT * alignment.score, 2
        )
    return round(aggregate_prompt_coverage(results, clusters), 2)


def _language_coverage(
    clusters: list[GeneratedCluster],
    pages: list[ExtractedPage],
    profile: BusinessProfile,
) -> list[LanguageCoverage]:
    """Per-language coverage on multilingual sites (§v2-plan 7.4): each language is
    scored from ONLY its own pages, so a German page never counts as English coverage."""
    by_lang: dict[str, list[ExtractedPage]] = {}
    for p in pages:
        if p.language:
            by_lang.setdefault(p.language, []).append(p)
    if len(by_lang) < 2 or not clusters:
        return []
    return [
        LanguageCoverage(
            language=lang,
            pages=len(lang_pages),
            prompt_coverage_score=_coverage_score(clusters, lang_pages, profile),
        )
        for lang, lang_pages in sorted(by_lang.items())
    ]


def compute_coverage(
    clusters: list[GeneratedCluster],
    pages: list[ExtractedPage],
    profile: BusinessProfile,
) -> CoverageReport:
    results = score_requirements(clusters, pages, profile)
    aligner = TopicalAlignmentEngine(pages)

    for result, cluster in zip(results, clusters, strict=True):
        requirements_score = result.coverage_score  # requirements-only, from V1 logic
        alignment = aligner.score_cluster(cluster)

        result.requirements_score = round(requirements_score, 2)
        result.topical_alignment_score = alignment.score
        result.best_supporting_url = alignment.best_supporting_url
        result.coverage_score = round(
            _REQUIREMENTS_WEIGHT * requirements_score + _TOPICAL_WEIGHT * alignment.score, 2
        )

    return CoverageReport(
        prompt_coverage_score=aggregate_prompt_coverage(results, clusters),
        clusters=results,
        language_coverage=_language_coverage(clusters, pages, profile),
    )
