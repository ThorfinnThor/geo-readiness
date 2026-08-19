"""Readiness score engine (§16–24, E10).

Deterministic, evidence-aligned, and fully explainable: every component score is
the sum of named sub-scores whose weights total 100, and the overall score is a
fixed weighted blend of the seven components (weights sum to 1.0). Confidence is
computed separately (§24) and never mixed into readiness.

SOL_HIGH methodology review required before this epic's gate closes (§48).
"""

from .confidence import compute_confidence
from .engine import compute_readiness, recompute_overall
from .types import ComponentScore, CrawlMeta, ReadinessResult, SubScore

__all__ = [
    "ComponentScore",
    "CrawlMeta",
    "ReadinessResult",
    "SubScore",
    "compute_confidence",
    "compute_readiness",
    "recompute_overall",
]
