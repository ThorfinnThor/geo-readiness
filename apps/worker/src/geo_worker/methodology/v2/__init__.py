"""V2 methodology.

Phase 1: V2 is registered and selectable but delegates to the current engine
functions (with its own versioned prompt config). Later phases replace coverage,
scoring, and actions with V2 implementations without touching V1.
"""

from __future__ import annotations

from geo_worker.actions import compute_actions
from geo_worker.clusters import generate_clusters

from ..types import Methodology
from .coverage import compute_coverage as compute_coverage_v2
from .scoring import compute_readiness as compute_readiness_v2

V2_METHODOLOGY = Methodology(
    version="geo-readiness-v2",
    prompt_config_version="v2",
    generate_clusters=generate_clusters,
    compute_coverage=compute_coverage_v2,
    compute_readiness=compute_readiness_v2,
    compute_actions=compute_actions,
)
