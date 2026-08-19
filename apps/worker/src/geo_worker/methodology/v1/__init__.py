"""V1 methodology — the frozen V1 engine wired into the registry."""

from __future__ import annotations

from geo_worker.actions import compute_actions
from geo_worker.clusters import generate_clusters
from geo_worker.coverage import compute_coverage
from geo_worker.scoring import compute_readiness

from ..types import Methodology

V1_METHODOLOGY = Methodology(
    version="geo-readiness-v1",
    prompt_config_version="v1",
    generate_clusters=generate_clusters,
    compute_coverage=compute_coverage,
    compute_readiness=compute_readiness,
    compute_actions=compute_actions,
)
