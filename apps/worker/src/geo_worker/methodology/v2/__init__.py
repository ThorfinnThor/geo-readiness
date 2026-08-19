"""V2 methodology.

Phase 1: V2 is registered and selectable but delegates to the current engine
functions (with its own versioned prompt config). Later phases replace coverage,
scoring, and actions with V2 implementations without touching V1.
"""

from __future__ import annotations

from geo_worker.actions import compute_actions
from geo_worker.clusters import generate_clusters
from geo_worker.coverage import compute_coverage
from geo_worker.scoring import compute_readiness

from ..types import Methodology

V2_METHODOLOGY = Methodology(
    version="geo-readiness-v2",
    prompt_config_version="v2",
    generate_clusters=generate_clusters,
    compute_coverage=compute_coverage,
    compute_readiness=compute_readiness,
    compute_actions=compute_actions,
)
