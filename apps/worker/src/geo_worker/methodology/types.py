"""Methodology dispatch types (V2 §6)."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass


class UnknownMethodologyError(Exception):
    """Raised for an unregistered methodology version. Never fall back to 'latest'."""

    def __init__(self, version: str) -> None:
        self.version = version
        super().__init__(f"unknown methodology version: {version!r}")


@dataclass(frozen=True)
class Methodology:
    version: str
    prompt_config_version: str
    generate_clusters: Callable
    compute_coverage: Callable
    compute_readiness: Callable
    compute_actions: Callable
