"""Topical alignment result types."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TopicalAlignmentResult(BaseModel):
    cluster_key: str
    score: float  # 0..100 site-level topical alignment
    best_supporting_url: str | None = None
    best_page_score: float = 0.0
    concept_coverage: float = 0.0  # 0..1, diagnostic
    missing_concepts: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
