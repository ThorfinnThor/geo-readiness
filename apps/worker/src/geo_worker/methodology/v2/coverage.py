"""V2 coverage (§48–50): requirements + topical alignment.

    coverage_score = 0.70 · requirements_score + 0.30 · topical_alignment_score

The 70/30 split is a product heuristic (§50), to be benchmarked later. V1
coverage is untouched.
"""

from __future__ import annotations

from geo_worker.clusters.types import GeneratedCluster
from geo_worker.coverage.engine import aggregate_prompt_coverage, score_requirements
from geo_worker.coverage.types import CoverageReport
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile
from geo_worker.relevance import TopicalAlignmentEngine

_REQUIREMENTS_WEIGHT = 0.70
_TOPICAL_WEIGHT = 0.30


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
        prompt_coverage_score=aggregate_prompt_coverage(results, clusters), clusters=results
    )
