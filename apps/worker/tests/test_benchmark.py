"""V2 Phase 14 — benchmark harness structural checks.

These lock in properties the harness must have; they do NOT assert exact scores
(calibration against real URLs is a separate, human-judged step)."""

from __future__ import annotations

from geo_worker.benchmark import default_corpus, run_benchmark


def test_corpus_spans_three_tiers() -> None:
    tiers = {c.tier for c in default_corpus()}
    assert tiers == {"weak", "medium", "strong"}


def test_v1_and_v2_both_order_tiers_correctly() -> None:
    report = run_benchmark()
    # Overall score rises weak → medium → strong under both methodologies.
    assert report.ordering_ok_v1
    assert report.ordering_ok_v2


def test_v2_populates_stage_scores_v1_does_not() -> None:
    report = run_benchmark()
    for s in report.v2:
        assert all(v is not None for v in s.stages.values())
    for s in report.v1:
        assert all(v is None for v in s.stages.values())


def test_strong_beats_weak_by_a_clear_margin_under_v2() -> None:
    report = run_benchmark()
    by = {s.name: s for s in report.v2}
    assert by["strong"].overall - by["weak"].overall >= 15.0


def test_benchmark_is_deterministic() -> None:
    a = run_benchmark()
    b = run_benchmark()
    assert [(s.name, s.overall) for s in a.v2] == [(s.name, s.overall) for s in b.v2]
    assert a.mean_abs_overall_delta == b.mean_abs_overall_delta
