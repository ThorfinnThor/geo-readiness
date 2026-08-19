"""Typed business-profile result."""

from __future__ import annotations

from pydantic import BaseModel


class EvidenceItem(BaseModel):
    """A single piece of evidence backing an inferred field."""

    field_name: str
    value: str
    source_url: str | None = None
    source_type: str  # e.g. "json_ld", "title", "navigation", "heading", "hreflang"
    confidence: float


class BrandCandidate(BaseModel):
    name: str
    score: float
    sources: list[str] = []


class BusinessProfile(BaseModel):
    canonical_domain: str
    legal_name: str | None = None
    brand_name: str | None = None
    brand_confidence: float = 0.0
    needs_confirmation: bool = False
    aliases: list[str] = []
    products: list[str] = []
    services: list[str] = []
    locations: list[str] = []
    countries: list[str] = []
    languages: list[str] = []
    industries: list[str] = []
    target_audiences: list[str] = []
    evidence: list[EvidenceItem] = []
    profile_hash: str = ""
