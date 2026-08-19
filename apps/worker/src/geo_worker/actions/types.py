"""Typed action output."""

from __future__ import annotations

from pydantic import BaseModel


class Action(BaseModel):
    rule_id: str
    category: str
    severity: str  # low | medium | high | critical
    title: str
    problem: str
    evidence: list[str]  # non-empty: no action without evidence (§25)
    recommendation: str
    expected_signal: str
    how_to_verify: str
    impact: float
    effort: int
    confidence: float
    readiness_gap: float
    priority_score: float
