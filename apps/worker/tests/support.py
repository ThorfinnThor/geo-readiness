"""Shared test helpers (importable; not a conftest)."""

from __future__ import annotations

import subprocess
from pathlib import Path

WORKER_ROOT = Path(__file__).resolve().parent.parent


def run_alembic(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["alembic", *args],
        cwd=WORKER_ROOT,
        check=check,
        capture_output=True,
        text=True,
    )
