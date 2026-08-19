"""Methodology registry, fail-closed resolution, and config hashing (V2 §6/§10)."""

from __future__ import annotations

import re

import pytest

from geo_worker.methodology import (
    UnknownMethodologyError,
    compute_methodology_hash,
    get_methodology,
)


def test_registry_resolves_known_versions() -> None:
    v1 = get_methodology("geo-readiness-v1")
    v2 = get_methodology("geo-readiness-v2")
    assert v1.prompt_config_version == "v1"
    assert v2.prompt_config_version == "v2"


def test_unknown_version_fails_closed() -> None:
    with pytest.raises(UnknownMethodologyError):
        get_methodology("geo-readiness-latest")
    with pytest.raises(UnknownMethodologyError):
        get_methodology("nope")


def test_methodology_hash_is_deterministic_and_versioned() -> None:
    h1a = compute_methodology_hash("geo-readiness-v1", "v1")
    h1b = compute_methodology_hash("geo-readiness-v1", "v1")
    h2 = compute_methodology_hash("geo-readiness-v2", "v2")
    assert re.fullmatch(r"[0-9a-f]{64}", h1a)
    assert h1a == h1b  # deterministic
    assert h1a != h2  # different config → different hash
