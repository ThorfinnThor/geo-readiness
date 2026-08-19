"""Canonical methodology config hash (V2 §10).

SHA-256 over the methodology config + versioned prompt config (+ research basis
when present), in deterministic path order with canonical JSON. No timestamps,
no environment-dependent fields.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from geo_worker.prompts.loader import configs_dir


def _canonical(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def compute_methodology_hash(version: str, prompt_version: str) -> str:
    root = configs_dir()
    dirs = [root / "methodology" / version, root / "prompts" / prompt_version]
    files: list[Path] = []
    for d in dirs:
        if d.exists():
            files.extend(d.rglob("*.json"))
    research = root / "methodology" / "research_basis.v1.json"
    if research.exists():
        files.append(research)

    digest = hashlib.sha256()
    for path in sorted(files, key=lambda p: str(p.relative_to(root))):
        rel = str(path.relative_to(root))
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        digest.update(_canonical(path).encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()
