"""Deterministic business-profile extraction (§12, E06).

Consumes E05 extraction output and produces an evidence-backed business
profile. Every inferred core field carries evidence; genuine ambiguity resolves
to ``unknown`` with ``needs_confirmation`` rather than a guess (§12). No network,
no LLM; fully deterministic for a given set of pages.
"""

from .rules import build_profile
from .types import BusinessProfile, EvidenceItem

__all__ = ["BusinessProfile", "EvidenceItem", "build_profile"]
