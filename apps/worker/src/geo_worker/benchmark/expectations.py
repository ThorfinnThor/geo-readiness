"""Per-signal expectations + corpus-wide invariants for the benchmark.

The ordering check in the benchmark verifies that good sites outscore bad ones.
It does NOT catch a site that is ordered correctly yet has a wrong brand, a
mislabeled site type, or a signal stuck at zero. These two layers do:

  * CaseExpect — booleans/directions asserted per captured real site. Every bug we
    find becomes a permanent guard by freezing the site and stating what must hold.
  * check_invariants — properties that must hold for ANY report (no raw signal
    keys leak, a shown-weak component always has an action, offerings are never UI
    junk, every number is finite).

All deterministic and no-network: snapshots are replayed from tests/corpus/*.json.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path

from geo_worker.crawler.types import FetchFn, RawResponse
from geo_worker.pipeline import build_report, run_pipeline
from geo_worker.pipeline.report import _label
from geo_worker.pipeline.runner import ScanResult
from geo_worker.profile.rules import _plausible_offering_name
from geo_worker.scoring.confidence import confidence_band

CORPUS_DIR = Path(__file__).resolve().parents[3] / "tests" / "corpus"
PUBLIC = "93.184.216.34"

# Applicable component shown below "Good" must carry an action of this category.
_COMPONENT_ACTION_CATEGORY = {
    "entity_clarity": {"entity", "local"},
    "offer_clarity": {"offer", "local"},
    "prompt_coverage": {"coverage"},
    "sourceability": {"sourceability"},
    "structured_data": {"structured_data"},
    "evidence_trust": {"trust"},
    "technical_access": {"technical"},
}
_GOOD_THRESHOLD = 65.0


@dataclass(frozen=True)
class CaseExpect:
    """What must hold for one captured site. None fields are not asserted."""

    brand_present: bool | None = None
    brand_equals: str | None = None
    legal_name_present: bool | None = None
    location_contains: str | None = None
    site_type_not: tuple[str, ...] = ()
    site_type_in: tuple[str, ...] = ()
    no_junk_offerings: bool = False
    freshness_present: bool | None = None
    direct_answers_present: bool | None = None
    confidence_band_not: tuple[str, ...] = ()


@dataclass(frozen=True)
class CorpusCase:
    name: str
    snapshot: str  # file under tests/corpus/
    expect: CaseExpect = field(default_factory=CaseExpect)


def _snapshot_fetch(pages: dict[str, str]) -> FetchFn:
    encoded = {k: v.encode("utf-8") for k, v in pages.items()}

    def fetch(url: str, _ip: str, _max: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in encoded:
                return RawResponse(200, {"content-type": "text/html"}, encoded[key])
        return RawResponse(404, {}, b"")

    return fetch


def run_snapshot(snapshot: str, methodology_version: str = "geo-readiness-v2") -> ScanResult:
    data = json.loads((CORPUS_DIR / snapshot).read_text(encoding="utf-8"))
    return run_pipeline(
        data["start_url"],
        methodology_version=methodology_version,
        fetch_fn=_snapshot_fetch(data["pages"]),
        resolver=lambda _h: [PUBLIC],
    )


def _subscore(scan: ScanResult, component: str, signal: str) -> float | None:
    comp = next((c for c in scan.readiness.components if c.name == component), None)
    if comp is None:
        return None
    sub = next((s for s in comp.subscores if s.name == signal), None)
    return sub.strength if sub else None


def check_expectations(scan: ScanResult, expect: CaseExpect) -> list[str]:
    """Violations of a captured site's expectations (empty list = all pass)."""
    p = scan.profile
    out: list[str] = []

    if expect.brand_present is not None:
        resolved = bool(p.brand_name) and not p.needs_confirmation
        if resolved != expect.brand_present:
            out.append(
                f"brand_present: expected {expect.brand_present}, got brand={p.brand_name!r} "
                f"needs_confirmation={p.needs_confirmation}"
            )
    if expect.brand_equals is not None and (p.brand_name or "") != expect.brand_equals:
        out.append(f"brand_equals: expected {expect.brand_equals!r}, got {p.brand_name!r}")
    if expect.legal_name_present is not None and bool(p.legal_name) != expect.legal_name_present:
        out.append(
            f"legal_name_present: expected {expect.legal_name_present}, got {p.legal_name!r}"
        )
    if expect.location_contains is not None and not any(
        expect.location_contains in loc for loc in p.locations
    ):
        out.append(
            f"location_contains: expected a location with {expect.location_contains!r}, "
            f"got {p.locations}"
        )
    if expect.site_type_not and p.site_type in expect.site_type_not:
        out.append(
            f"site_type_not: site_type is {p.site_type!r} (forbidden {expect.site_type_not})"
        )
    if expect.site_type_in and p.site_type not in expect.site_type_in:
        out.append(
            f"site_type_in: site_type is {p.site_type!r} (expected one of {expect.site_type_in})"
        )
    if expect.no_junk_offerings:
        junk = [n for n in (*p.products, *p.services) if not _plausible_offering_name(n)]
        if junk:
            out.append(f"no_junk_offerings: junk offering names present: {junk[:5]}")
    if expect.freshness_present is not None:
        strength = _subscore(scan, "sourceability", "declared_freshness") or 0.0
        if (strength > 0) != expect.freshness_present:
            out.append(
                f"freshness_present: expected {expect.freshness_present}, strength={strength}"
            )
    if expect.direct_answers_present is not None:
        strength = _subscore(scan, "sourceability", "direct_answerability") or 0.0
        if (strength > 0) != expect.direct_answers_present:
            out.append(
                f"direct_answers_present: expected {expect.direct_answers_present}, "
                f"strength={strength}"
            )
    if expect.confidence_band_not:
        band = confidence_band(scan.readiness.confidence_score)
        if band in expect.confidence_band_not:
            out.append(
                f"confidence_band_not: band is {band!r} (forbidden {expect.confidence_band_not})"
            )
    return out


def check_invariants(scan: ScanResult) -> list[str]:
    """Properties that must hold for ANY report, regardless of the site."""
    report = build_report(scan)
    out: list[str] = []

    # 1. Every score is a finite number in range (no NaN/inf, no €NaN downstream).
    nums = [report.overall_score, *(c.score for c in report.components)]
    if not all(isinstance(v, (int, float)) and math.isfinite(v) and 0 <= v <= 100 for v in nums):
        out.append(f"non-finite or out-of-range score in {nums}")

    # 2. No raw snake_case signal key leaks into a customer-facing diagnostic.
    for d in report.diagnostics:
        for sig in (*d.limiting_signals, *d.strongest_signals):
            if _label(sig) in d.explanation and "_" in _label(sig):
                out.append(f"raw signal key {sig!r} leaked into diagnostic: {d.explanation!r}")

    # 3. Every applicable component shown below "Good" has a matching action.
    action_categories = {a.category for a in scan.actions}
    for comp in report.components:
        if comp.applicable and comp.score < _GOOD_THRESHOLD:
            wanted = _COMPONENT_ACTION_CATEGORY.get(comp.key, set())
            if wanted and not (wanted & action_categories):
                out.append(
                    f"component {comp.key} is {comp.score} (<{_GOOD_THRESHOLD}) but no action "
                    f"in {wanted}; actions have {action_categories}"
                )

    # 4. No offering name is a UI fragment / sentence.
    junk = [
        n
        for n in (*scan.profile.products, *scan.profile.services)
        if not _plausible_offering_name(n)
    ]
    if junk:
        out.append(f"junk offering names: {junk[:5]}")

    return out


# The frozen corpus of captured real sites, each with what must hold for it.
CORPUS: list[CorpusCase] = [
    CorpusCase(
        name="selectyoursauna",
        snapshot="selectyoursauna.json",
        expect=CaseExpect(
            brand_present=True,
            brand_equals="Select Your Sauna",
            legal_name_present=True,
            location_contains="Berlin",
            site_type_not=("ecommerce",),
            no_junk_offerings=True,
            freshness_present=True,
            direct_answers_present=True,
            confidence_band_not=("High",),
        ),
    ),
]
