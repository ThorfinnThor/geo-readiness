"""Methodology registry + fail-closed resolver (V2 §6)."""

from __future__ import annotations

from .types import Methodology, UnknownMethodologyError
from .v1 import V1_METHODOLOGY
from .v2 import V2_METHODOLOGY

METHODOLOGIES: dict[str, Methodology] = {
    V1_METHODOLOGY.version: V1_METHODOLOGY,
    V2_METHODOLOGY.version: V2_METHODOLOGY,
}


def get_methodology(version: str) -> Methodology:
    """Resolve a methodology; unknown versions fail closed (never 'latest')."""
    try:
        return METHODOLOGIES[version]
    except KeyError as exc:
        raise UnknownMethodologyError(version) from exc
