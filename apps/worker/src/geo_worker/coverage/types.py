"""Typed coverage results."""

from __future__ import annotations

from pydantic import BaseModel


class RequirementResult(BaseModel):
    name: str
    weight: int
    strength: float  # 0.0..1.0 evidence strength (§15)


class ClusterCoverageResult(BaseModel):
    cluster_key: str
    coverage_score: float  # 0..100
    confidence: float  # 0..1, share of weight with any evidence
    requirements: list[RequirementResult] = []
    matched_requirements: list[str] = []
    missing_requirements: list[str] = []
    supporting_urls: list[str] = []


class CoverageReport(BaseModel):
    prompt_coverage_score: float  # 0..100, weight-averaged across clusters
    clusters: list[ClusterCoverageResult] = []
