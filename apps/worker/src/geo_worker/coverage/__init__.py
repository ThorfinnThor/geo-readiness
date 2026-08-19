"""Prompt coverage engine (§15, E09).

For each generated cluster it asks: does the website contain explicit,
structured evidence to answer this information need? Prompts are NEVER sent to
an AI (§15). Evidence strength is graded, cluster coverage is a weighted 0–100
score, and the aggregate is weight-averaged across clusters. Deterministic.
"""

from .engine import compute_coverage
from .types import ClusterCoverageResult, CoverageReport, RequirementResult

__all__ = [
    "ClusterCoverageResult",
    "CoverageReport",
    "RequirementResult",
    "compute_coverage",
]
