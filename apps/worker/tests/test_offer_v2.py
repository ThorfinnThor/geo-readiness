"""Offer clarity V2 (§11–12, §67): applicability-aware, counterfactual tests.

Each test changes exactly one factor and asserts a deterministic direction, per
the anti-gaming / counterfactual requirement.
"""

from __future__ import annotations

from geo_worker.methodology.v2.offer import offer_component
from geo_worker.scoring.engine import _offer, _ScoreIndex


def _idx(**overrides) -> _ScoreIndex:
    """A neutral _ScoreIndex; override only the offer-relevant fields."""
    base = dict(
        n=1,
        page_types=["home"],
        brand_resolved=True,
        brand_present=True,
        legal_name_present=False,
        brand_domain_sim=1.0,
        brand_title_pages=1,
        services_count=0,
        products_count=0,
        aliases=0,
        needs_confirmation=False,
        countries=0,
        locations=0,
        audiences=0,
        dedicated_pages=0,
        org_name_present=True,
        org_core_fields=1,
        org_distinct_names=1,
        has_service_product_jsonld=False,
        has_breadcrumb_jsonld=False,
        has_dates_jsonld=False,
        canonical_ratio=1.0,
        jsonld_ratio=1.0,
        internal_links_ratio=1.0,
        unique_hash_ratio=1.0,
        digits_ratio=0.0,
        longtext200_ratio=0.0,
        headings_structure_ratio=0.0,
        dedicated_longtext400=False,
        dedicated_longtext200=False,
        linked_types=frozenset(),
    )
    base.update(overrides)
    return _ScoreIndex(**base)


def _names(component) -> set[str]:
    return {s.name for s in component.subscores}


def test_location_and_audience_are_na_for_a_global_single_service_business() -> None:
    # A global SaaS: one service, a brand, no locations/countries/audiences.
    comp, diag = offer_component(_idx(services_count=1))
    names = _names(comp)
    assert "location_service_relation" not in names  # N/A → excluded
    assert "target_customer_use_case" not in names  # N/A → excluded
    # Applicable weight is 100 - 10 (location) - 10 (audience) = 80.
    assert diag.assessed_weight_ratio == 0.80


def test_na_renormalization_beats_scoring_the_gap_as_zero() -> None:
    idx = _idx(services_count=1)
    v2_score = offer_component(idx)[0].score
    # V1 keeps location + audience in the denominator as zeros.
    v1_pairs = _offer(idx)
    v1_score = round(100 * sum(w * s for _, w, s in v1_pairs) / 100, 2)
    assert v2_score > v1_score  # excluding N/A raises the (correct) score


def test_location_is_scored_when_a_location_is_resolved() -> None:
    # Counterfactual: a resolved location makes the signal applicable.
    without = offer_component(_idx(services_count=1))[0]
    with_loc = offer_component(_idx(services_count=1, locations=1))[0]
    assert "location_service_relation" not in _names(without)
    assert "location_service_relation" in _names(with_loc)


def test_local_site_type_makes_location_applicable() -> None:
    # A local_business is location-based even before a location string resolves.
    comp = offer_component(_idx(services_count=1, site_type="local_business"))[0]
    assert "location_service_relation" in _names(comp)


def test_saas_site_type_keeps_location_not_applicable() -> None:
    # A SaaS is not location-based → the signal must be N/A, never a penalty.
    comp = offer_component(_idx(services_count=1, site_type="saas", countries=1))[0]
    assert "location_service_relation" not in _names(comp)


def test_location_strength_rises_with_an_actual_service_location() -> None:
    # Counterfactual: same local site, vary locations 0 → 1.
    weak = offer_component(_idx(services_count=1, site_type="local_business", locations=0))[0]
    strong = offer_component(_idx(services_count=1, site_type="local_business", locations=1))[0]
    assert strong.score > weak.score


def test_audience_observed_raises_the_score() -> None:
    # Counterfactual: audiences 0 (N/A) → 1 (observed).
    without = offer_component(_idx(services_count=1))[0]
    withaud = offer_component(_idx(services_count=1, audiences=1))[0]
    assert "target_customer_use_case" not in _names(without)
    assert "target_customer_use_case" in _names(withaud)
    assert withaud.score > without.score


def test_v1_offer_is_unchanged_frozen_for_the_golden() -> None:
    # V1 still scores location + audience as dead zeros (behavior preserved).
    idx = _idx(services_count=1)
    pairs = dict((k, s) for k, _, s in _offer(idx))
    assert pairs["location_service_relation"] == 0.0
    assert pairs["target_customer_use_case"] == 0.0


def test_empty_business_scores_zero_not_crash() -> None:
    comp, diag = offer_component(_idx())  # no services at all
    assert comp.score == 0.0
    assert diag.assessed_weight_ratio == 0.80  # location + audience still N/A
