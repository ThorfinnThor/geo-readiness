"""Offer clarity V2 (§11–12, §67): applicability-aware.

V1's ``_offer`` scores two signals as plain zeros that many valid businesses can
never earn, dragging the component down instead of excluding them:

  * ``target_customer_use_case`` reads ``profile.target_audiences``, which no
    extractor ever populates — a dead signal that is zero for every site.
  * ``location_service_relation`` is zero for any business with no location,
    penalizing global/online businesses for a signal that does not apply to them.

Per §67 a signal that does not apply is excluded from the denominator, not scored
zero. This scorer marks those two ``not_applicable`` when there is no evidence
they apply and renormalizes over the applicable signals. Every other subscore
matches V1 exactly. V1's ``_offer`` is untouched, so the V1 golden output stands.
"""

from __future__ import annotations

from geo_worker.scoring.engine import _ScoreIndex
from geo_worker.scoring.types import (
    ComponentDiagnostic,
    ComponentScore,
    SignalAssessment,
    SignalStatus,
    SubScore,
)

# (key, weight); identical weights to V1 _offer (sum 100).
_WEIGHTS: list[tuple[str, int]] = [
    ("primary_services_explicit", 20),
    ("dedicated_service_product_pages", 20),
    ("product_service_taxonomy", 15),
    ("business_offering_relation", 15),
    ("target_customer_use_case", 10),
    ("location_service_relation", 10),
    ("differentiating_factual_detail", 10),
]

_OBS = SignalStatus.observed
_MISS = SignalStatus.missing
_NA = SignalStatus.not_applicable


def _status(strength: float) -> SignalStatus:
    return _OBS if strength > 0 else _MISS


def _assess(idx: _ScoreIndex) -> list[SignalAssessment]:
    services = idx.services_count
    primary = min(services, 3) / 3
    dedicated = min(idx.dedicated_pages, 3) / 3
    taxonomy = min(services + idx.products_count, 4) / 4
    relation = 1.0 if (services and idx.brand_resolved) else (0.6 if services else 0.0)
    diff = 1.0 if idx.dedicated_longtext400 else (0.5 if idx.dedicated_longtext200 else 0.0)

    # target_customer_use_case: audiences are never extracted, so a bare zero here
    # would penalize every site. Observe it only when actually present; else N/A.
    audience: tuple[SignalStatus, float | None] = (_OBS, 1.0) if idx.audiences else (_NA, None)

    # location_service_relation applies only to location-based businesses. With no
    # location AND no country signal at all, the business is not location-based
    # (global/online) → N/A. Otherwise score the service↔location relation.
    location: tuple[SignalStatus, float | None]
    if not idx.locations and not idx.countries:
        location = (_NA, None)
    elif idx.locations and services:
        location = (_OBS, 1.0)
    elif idx.locations:
        location = (_MISS, 0.5)
    else:
        location = (_MISS, 0.0)

    values: dict[str, tuple[SignalStatus, float | None]] = {
        "primary_services_explicit": (_status(primary), primary),
        "dedicated_service_product_pages": (_status(dedicated), dedicated),
        "product_service_taxonomy": (_status(taxonomy), taxonomy),
        "business_offering_relation": (_status(relation), relation),
        "target_customer_use_case": audience,
        "location_service_relation": location,
        "differentiating_factual_detail": (_status(diff), diff),
    }
    return [
        SignalAssessment(key=key, status=values[key][0], weight=weight, strength=values[key][1])
        for key, weight in _WEIGHTS
    ]


def offer_component(idx: _ScoreIndex) -> tuple[ComponentScore, ComponentDiagnostic]:
    assessments = _assess(idx)

    applicable_weight = 0
    earned = 0.0
    subscores: list[SubScore] = []
    for a in assessments:
        if a.status is SignalStatus.not_applicable or a.strength is None:
            continue
        applicable_weight += a.weight
        earned += a.weight * a.strength
        subscores.append(
            SubScore(
                name=a.key,
                weight=a.weight,
                strength=round(a.strength, 4),
                points=round(a.weight * a.strength, 4),
            )
        )
    score = round(100 * earned / applicable_weight, 2) if applicable_weight else 0.0

    ranked = sorted(
        (a for a in assessments if a.strength is not None), key=lambda a: a.strength or 0
    )
    diagnostic = ComponentDiagnostic(
        component="offer_clarity",
        limiting_signals=[a.key for a in ranked[:2] if (a.strength or 0) < 0.5],
        strongest_signals=[a.key for a in reversed(ranked[-2:]) if (a.strength or 0) >= 0.5],
        assessed_weight_ratio=round(applicable_weight / 100, 4),
    )
    return ComponentScore(name="offer_clarity", score=score, subscores=subscores), diagnostic
