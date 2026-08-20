"""Derived stage scores (§69–73): Retrieval / Citation / Answer readiness.

Explanatory views over the seven components. Weights live in the methodology
config (validated to sum to 1.0). Stage scores DO NOT enter the overall score.
"""

from __future__ import annotations

import json
from functools import cache

from geo_worker.prompts.loader import configs_dir

STAGE_NAMES = ("retrieval_readiness", "citation_readiness", "answer_extractability")

STAGE_EXPLANATIONS: dict[str, str] = {
    "retrieval_readiness": (
        "Measures whether important pages are technically accessible, clearly "
        "associated with the business and aligned with likely information needs."
    ),
    "citation_readiness": (
        "Measures whether relevant pages contain specific, attributable and "
        "trustworthy evidence suitable for use as a source."
    ),
    "answer_extractability": (
        "Measures whether important information is presented in forms that can be "
        "cleanly extracted into answers, such as concise explanations, "
        "specifications, comparisons and procedures."
    ),
}


@cache
def load_stage_rollups(version: str = "geo-readiness-v2") -> dict[str, dict[str, float]]:
    path = configs_dir() / "methodology" / version / "scoring.json"
    rollups = json.loads(path.read_text(encoding="utf-8")).get("stageRollups", {})
    for name, weights in rollups.items():
        total = round(sum(weights.values()), 6)
        if total != 1.0:
            raise ValueError(f"stage rollup {name!r} weights sum to {total}, expected 1.0")
    return rollups


def compute_stage_scores(
    components: dict[str, float], version: str = "geo-readiness-v2"
) -> dict[str, float]:
    rollups = load_stage_rollups(version)
    return {
        stage: round(sum(components[k] * w for k, w in weights.items()), 2)
        for stage, weights in rollups.items()
    }
