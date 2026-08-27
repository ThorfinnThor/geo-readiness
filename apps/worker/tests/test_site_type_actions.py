"""Site-type-aware recommendations: data/content sites get Dataset/Article advice,
not Service/Product, and no commercial offer action (fix for the generic prompt on
a non-commercial site like clinicaltrialfailures.com)."""

from __future__ import annotations

from geo_worker.coverage.types import CoverageReport
from geo_worker.methodology.v2.actions import compute_actions
from geo_worker.profile.rules import _plausible_offering_name
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.types import ComponentScore, ReadinessResult

_C = [
    "entity_clarity",
    "offer_clarity",
    "prompt_coverage",
    "sourceability",
    "structured_data",
    "evidence_trust",
    "technical_access",
]


def _readiness(**scores) -> ReadinessResult:
    base = dict.fromkeys(_C, 70.0)
    base.update(scores)
    return ReadinessResult(
        methodology_version="geo-readiness-v2",
        overall_score=60.0,
        entity_clarity_score=base["entity_clarity"],
        offer_clarity_score=base["offer_clarity"],
        prompt_coverage_score=base["prompt_coverage"],
        sourceability_score=base["sourceability"],
        structured_data_score=base["structured_data"],
        evidence_trust_score=base["evidence_trust"],
        technical_access_score=base["technical_access"],
        confidence_score=70.0,
        components=[ComponentScore(name=n, score=base[n]) for n in _C],
    )


def _actions(profile: BusinessProfile, readiness: ReadinessResult):
    return compute_actions(readiness, profile, CoverageReport(prompt_coverage_score=70.0), [], [])


def test_data_site_gets_dataset_structured_data_advice() -> None:
    prof = BusinessProfile(canonical_domain="data.example", site_type="publisher_editorial")
    acts = _actions(prof, _readiness(structured_data=40.0, offer_clarity=35.0))
    rdy005 = next(a for a in acts if a.rule_id == "RDY-005")
    assert "Dataset" in rdy005.recommendation
    assert "Do not add Service or Product" in rdy005.recommendation
    # Offer Clarity is N/A on a content/data site → no commercial offer action.
    assert "RDY-002B" not in {a.rule_id for a in acts}


def test_weak_applicable_offer_always_has_an_action() -> None:
    # A weak Offer Clarity that DOES apply must always yield a matching action
    # (no shown-weak component with zero issues). N/A site types are excluded.
    for st in ("unknown", "saas", "service_business", "portfolio_personal_brand"):
        prof = BusinessProfile(canonical_domain="ex.example", site_type=st)
        acts = _actions(prof, _readiness(offer_clarity=0.0))
        assert any(a.category == "offer" for a in acts), f"no offer action for site_type={st}"


def test_needs_improvement_offer_with_products_still_has_an_action() -> None:
    # Regression (vibefootprint.com): Offer Clarity 54 = "Needs improvement" (the
    # 50-64 band, shown under "What needs improvement"), with products detected but
    # no services, produced an EMPTY fix list — RDY-002 needs services, and the old
    # RDY-002B only fired below 50 with no offering. The catch-all now covers the
    # whole applicable < 65 range regardless of what was detected.
    prof = BusinessProfile(
        canonical_domain="vibefootprint.example",
        site_type="unknown",
        products=["some product"],
    )
    acts = _actions(prof, _readiness(offer_clarity=54.0))
    ids = {a.rule_id for a in acts}
    assert "RDY-002B" in ids
    offer_action = next(a for a in acts if a.rule_id == "RDY-002B")
    # An offering WAS detected, so the copy addresses making it explicit, not "state it".
    assert "explicit" in offer_action.title.lower()


def test_good_offer_gets_no_catch_all_action() -> None:
    # At/above "Good" (>= 65) Offer Clarity is not shown as a gap, so no catch-all.
    prof = BusinessProfile(canonical_domain="ex.example", site_type="unknown")
    acts = _actions(prof, _readiness(offer_clarity=65.0))
    assert "RDY-002B" not in {a.rule_id for a in acts}


def test_commercial_site_keeps_service_product_advice() -> None:
    prof = BusinessProfile(canonical_domain="shop.example", site_type="service_business")
    acts = _actions(prof, _readiness(structured_data=40.0, offer_clarity=35.0))
    rdy005 = next(a for a in acts if a.rule_id == "RDY-005")
    assert "Service or Product" in rdy005.recommendation
    ids = {a.rule_id for a in acts}
    assert "RDY-002B" in ids  # commercial site with no offering is still told to state it


def test_plausible_offering_name_rejects_sentences() -> None:
    assert _plausible_offering_name("Solar Panels")
    assert _plausible_offering_name("AI Search Readiness Audit")
    assert not _plausible_offering_name(
        "teva branded pharmaceutical products r&d, inc.: stopped clinical trials and "
        "failure signals"
    )
    assert not _plausible_offering_name("word " * 12)
