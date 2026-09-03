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
    # The dominant content language (most pages), used to generate questions in
    # the language the site is actually in. Derived, not part of the profile hash.
    primary_language: str = ""
    industries: list[str] = []
    target_audiences: list[str] = []
    # Content topics for informational sites with no extractable offerings, used
    # only as a cluster-generation fallback. Derived after the profile hash (like
    # site_type) so it never affects reproducibility, and not serialized in the
    # report, so it does not touch the frozen V1 golden.
    topics: list[str] = []
    # Original casing of each offering, keyed by its lowercased form. The
    # lowercased names stay the identity (dedup, keys, hash); this only
    # restores display casing for generated questions ("karibu saunahaus
    # monterey" -> "Karibu Saunahaus Monterey"). Derived, not hashed.
    offering_display: dict[str, str] = {}
    # Primary site archetype (§v2-plan 6); drives per-profile rule applicability.
    site_type: str = "unknown"
    site_type_confidence: float = 0.0
    evidence: list[EvidenceItem] = []
    profile_hash: str = ""
