"""Migration integrity: downgrade→upgrade round trip and no model drift."""

from __future__ import annotations

from tests.support import run_alembic


def test_downgrade_upgrade_roundtrip() -> None:
    # Schema starts at head (session fixture). Full cycle must succeed and end
    # back at head so later tests keep a valid schema.
    run_alembic("downgrade", "base")
    run_alembic("upgrade", "head")


def test_no_model_drift() -> None:
    # `alembic check` fails if the models diverge from the migrations (§33).
    result = run_alembic("check", check=False)
    assert result.returncode == 0, result.stdout + result.stderr
