"""Typed coverage results."""

from __future__ import annotations

from pydantic import BaseModel


class RequirementResult(BaseModel):
    name: str
    weight: int
    strength: float  # 0.0..1.0 evidence strength (§15)


class ClusterCoverageResult(BaseModel):
    cluster_key: str
    coverage_score: float  # 0..100 (V1: == requirements; V2: 0.7·req + 0.3·topical)
    confidence: float  # 0..1, share of weight with any evidence
    requirements: list[RequirementResult] = []
    matched_requirements: list[str] = []
    missing_requirements: list[str] = []
    supporting_urls: list[str] = []
    # V2 (§48): separated sub-scores. V1 leaves these at their defaults.
    requirements_score: float = 0.0
    topical_alignment_score: float = 0.0
    best_supporting_url: str | None = None


class LanguageCoverage(BaseModel):
    """Coverage computed from a single language's pages (§v2-plan 7.4)."""

    language: str
    pages: int
    prompt_coverage_score: float


class CoverageReport(BaseModel):
    prompt_coverage_score: float  # 0..100, weight-averaged across clusters
    clusters: list[ClusterCoverageResult] = []
    # V2 additive: per-language coverage on multilingual sites; empty otherwise.
    language_coverage: list[LanguageCoverage] = []
