"""Deterministic topical alignment engine (§40–47, V2 Phase 6).

Named `topical_alignment` (not `relevance`) to avoid colliding with the cluster
`relevance` priority prior (§40). No embeddings, no LLM.
"""

from .engine import TopicalAlignmentEngine
from .tokenize import token_set, tokenize
from .types import TopicalAlignmentResult

__all__ = ["TopicalAlignmentEngine", "TopicalAlignmentResult", "token_set", "tokenize"]
