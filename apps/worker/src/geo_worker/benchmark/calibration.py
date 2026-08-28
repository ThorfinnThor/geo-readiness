"""Calibration gate: flag detectors that are degenerate across the corpus.

A signal (component subscore) that reads ~0 for every site it applies to — or
~max for every site — is almost always a broken or trivial detector, not a real
measurement. Freshness sat at 0 across the whole corpus before it was fixed; this
gate turns that class of mistake into an automatic failure instead of something
you only notice by reading individual reports.

Runs the synthetic benchmark corpus plus the captured real sites through V2 and
inspects the per-subscore strengths. Deterministic, no network.
"""

from __future__ import annotations

from collections import defaultdict

from geo_worker.pipeline import run_pipeline
from geo_worker.pipeline.runner import ScanResult

from .expectations import CORPUS, run_snapshot

_MIN_CASES = 3  # need enough applicable sites before calling a signal degenerate
_FLOOR = 0.01
_CEILING = 0.99

# Signals that are legitimately degenerate on the CURRENT small, healthy corpus —
# a corpus limitation, not a broken detector. Each is documented; the gate fails on
# anything NOT here (a newly dead/saturated signal = a likely regression, e.g. if
# a detector broke and started reading 0 everywhere). Trim this as the real corpus
# grows to include sites that exercise these signals.
EXPECTED_DEGENERATE: dict[str, str] = {
    # Health gates: ~1.0 for every working site; they only drop for a broken one,
    # and the corpus has none.
    "technical_access.homepage_reachable": "saturated",
    "technical_access.robots_not_blocking_core": "saturated",
    "technical_access.low_duplicate_content": "saturated",
    # Clean sites have no contradictory markup by definition.
    "structured_data.no_contradictory_markup": "saturated",
    # No corpus site publishes case studies / named customers yet.
    "evidence_trust.case_studies_references": "dead",
    "evidence_trust.named_customers": "dead",
    # No corpus site carries dates in JSON-LD (some carry visible dates, which the
    # sourceability freshness signal reads; the trust signal only reads JSON-LD).
    "evidence_trust.published_updated_dates": "dead",
}


def corpus_scans() -> list[ScanResult]:
    """Every corpus site (synthetic tiers + captured real sites) scored under V2."""
    from geo_worker.benchmark import default_corpus

    scans = [
        run_pipeline(
            c.start_url,
            methodology_version="geo-readiness-v2",
            fetch_fn=c.fetch_fn,
            resolver=c.resolver,
        )
        for c in default_corpus()
    ]
    scans += [run_snapshot(cc.snapshot) for cc in CORPUS]
    return scans


def signal_flags(scans: list[ScanResult]) -> dict[str, str]:
    """Map "component.subscore" → "dead" | "saturated" for degenerate signals.

    Only signals applicable on at least ``_MIN_CASES`` sites are judged; a subscore
    is emitted by the scorer only where it applies, so the collected strengths are
    already the applicable ones.
    """
    per_signal: dict[str, list[float]] = defaultdict(list)
    for scan in scans:
        for comp in scan.readiness.components:
            for sub in comp.subscores:
                per_signal[f"{comp.name}.{sub.name}"].append(sub.strength)

    flags: dict[str, str] = {}
    for key, strengths in per_signal.items():
        if len(strengths) < _MIN_CASES:
            continue
        if all(v <= _FLOOR for v in strengths):
            flags[key] = "dead"
        elif all(v >= _CEILING for v in strengths):
            flags[key] = "saturated"
    return flags
