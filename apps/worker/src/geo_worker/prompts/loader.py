"""Load taxonomy and template configs from the repo configs directory."""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path

from geo_worker.config import get_settings

from .types import Taxonomy, TemplateSet

_MARKER = Path("prompts") / "intent-taxonomy.json"


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
def load_taxonomy() -> Taxonomy:
    path = configs_dir() / "prompts" / "intent-taxonomy.json"
    return Taxonomy.model_validate(json.loads(path.read_text(encoding="utf-8")))


@cache
def load_template_set(language: str) -> TemplateSet:
    path = configs_dir() / "prompts" / f"templates.{language}.json"
    return TemplateSet.model_validate(json.loads(path.read_text(encoding="utf-8")))
