"""Methodology dispatch (V2 §6): version → frozen implementation set."""

from .hashing import compute_methodology_hash
from .registry import METHODOLOGIES, get_methodology
from .types import Methodology, UnknownMethodologyError

__all__ = [
    "METHODOLOGIES",
    "Methodology",
    "UnknownMethodologyError",
    "compute_methodology_hash",
    "get_methodology",
]
