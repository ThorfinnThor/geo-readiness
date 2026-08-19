"""Versioned language vocab for quantitative extraction (§26).

Vocab lives in configs/language/<version>/<lang>.json, not in source. EN + DE
are merged so extraction is robust without precise language detection.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import cache

from geo_worker.prompts.loader import configs_dir

_LANGUAGES = ("en", "de")


@dataclass(frozen=True)
class Vocab:
    count_nouns: frozenset[str]
    measurement_units: frozenset[str]
    percent_words: frozenset[str]


@cache
def load_vocab(version: str = "v1") -> Vocab:
    counts: set[str] = set()
    units: set[str] = set()
    percents: set[str] = set()
    base = configs_dir() / "language" / version
    for lang in _LANGUAGES:
        data = json.loads((base / f"{lang}.json").read_text(encoding="utf-8"))
        counts.update(data.get("count_nouns", []))
        units.update(data.get("measurement_units", []))
        percents.update(data.get("percent_words", []))
    return Vocab(frozenset(counts), frozenset(units), frozenset(percents))
