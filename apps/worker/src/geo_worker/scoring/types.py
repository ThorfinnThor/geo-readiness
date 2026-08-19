"""Typed scoring results."""

from __future__ import annotations

from pydantic import BaseModel

# Overall blend weights (§16); must sum to 1.0.
COMPONENT_WEIGHTS: dict[str, float] = {
    "entity_clarity": 0.20,
    "offer_clarity": 0.20,
    "prompt_coverage": 0.20,
    "sourceability": 0.15,
    "structured_data": 0.10,
    "evidence_trust": 0.10,
    "technical_access": 0.05,
}


class SubScore(BaseModel):
    name: str
    weight: int  # points out of the component's 100
    strength: float  # 0.0..1.0
    points: float  # weight * strength


class ComponentScore(BaseModel):
    name: str
    score: float  # 0..100
    subscores: list[SubScore] = []


class CrawlMeta(BaseModel):
    """Crawl-level facts scoring needs but that aren't on ExtractedPage.

    Populated by the crawler (E04); defaults are neutral for standalone use.
    """

    pages_requested: int = 0
    pages_crawled: int = 0
    homepage_reachable: bool = True
    robots_blocked_core: bool = False
    valid_response_ratio: float = 1.0


class ConfidenceComponent(BaseModel):
    name: str
    weight: int
    strength: float
    points: float


class ReadinessResult(BaseModel):
    methodology_version: str
    overall_score: float
    entity_clarity_score: float
    offer_clarity_score: float
    prompt_coverage_score: float
    sourceability_score: float
    structured_data_score: float
    evidence_trust_score: float
    technical_access_score: float
    confidence_score: float
    components: list[ComponentScore] = []
    confidence_components: list[ConfidenceComponent] = []
