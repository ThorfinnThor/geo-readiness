"""Frozen real-site corpus: per-signal expectations + corpus-wide invariants.

Each captured site (tests/corpus/*.json) is replayed through the pipeline with no
network. Expectations turn every real bug we found into a permanent guard;
invariants hold for ANY report. Add a case by capturing a site
(`uv run python scripts/capture_site.py …`) and stating what must hold for it.
"""

from __future__ import annotations

import pytest

from geo_worker.benchmark.expectations import (
    CORPUS,
    check_expectations,
    check_invariants,
    run_snapshot,
)

_SCANS = {c.name: run_snapshot(c.snapshot) for c in CORPUS}


@pytest.mark.parametrize("case", CORPUS, ids=lambda c: c.name)
def test_case_meets_expectations(case) -> None:
    violations = check_expectations(_SCANS[case.name], case.expect)
    assert not violations, f"{case.name}: " + "; ".join(violations)


@pytest.mark.parametrize("case", CORPUS, ids=lambda c: c.name)
def test_case_holds_invariants(case) -> None:
    violations = check_invariants(_SCANS[case.name])
    assert not violations, f"{case.name}: " + "; ".join(violations)
