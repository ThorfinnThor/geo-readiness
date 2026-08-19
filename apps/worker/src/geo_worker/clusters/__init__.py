"""Deterministic prompt-cluster generation (§14, E08).

Rule-based, reproducible: the same business profile + methodology/template
versions always yields the same clusters, keys, and prompts. No network, no LLM
(Golden Rules §0A). Cluster priority is derived only from structural relevance,
commercial intent, and evidence — never from any observed readiness outcome.
"""

from .generator import generate_clusters
from .types import GeneratedCluster, GeneratedPrompt

__all__ = ["GeneratedCluster", "GeneratedPrompt", "generate_clusters"]
