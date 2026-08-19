"""Load versioned taxonomy and template configs (V2 §8).

Prompt config is methodology-versioned: configs/prompts/<version>/… . V1 scans
must never pick up a future V2 template, so the version is explicit.
"""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path

from geo_worker.config import get_settings

from .types import Taxonomy, TemplateSet

DEFAULT_PROMPT_VERSION = "v1"
_MARKER = Path("prompts") / "v1" / "intent-taxonomy.json"


def configs_dir() -> Path:
    """Resolve the configs directory (settings override, else walk upward)."""
    override = get_settings().configs_dir
    if override:
        return Path(override)
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "configs"
        if (candidate / _MARKER).exists():
            return candidate
    raise FileNotFoundError("could not locate configs/ directory")


@cache
def load_taxonomy(version: str = DEFAULT_PROMPT_VERSION) -> Taxonomy:
    path = configs_dir() / "prompts" / version / "intent-taxonomy.json"
    return Taxonomy.model_validate(json.loads(path.read_text(encoding="utf-8")))


@cache
def load_template_set(language: str, version: str = DEFAULT_PROMPT_VERSION) -> TemplateSet:
    path = configs_dir() / "prompts" / version / f"templates.{language}.json"
    return TemplateSet.model_validate(json.loads(path.read_text(encoding="utf-8")))
