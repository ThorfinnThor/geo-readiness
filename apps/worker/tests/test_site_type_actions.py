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
    # The offer action still fires (invariant: a weak component always has an
    # issue), but with content wording rather than "state your products/services".
    rdy002b = next(a for a in acts if a.rule_id == "RDY-002B")
    assert "topic, dataset or content" in rdy002b.recommendation
    assert "products or services" not in rdy002b.recommendation


def test_weak_offer_always_has_an_action_on_any_site_type() -> None:
    # No shown-weak Offer Clarity may ever have zero matching actions.
    for st in (
        "unknown",
        "publisher_editorial",
        "documentation_reference",
        "saas",
        "service_business",
    ):
        prof = BusinessProfile(canonical_domain="ex.example", site_type=st)
        acts = _actions(prof, _readiness(offer_clarity=0.0))
        assert any(a.category == "offer" for a in acts), f"no offer action for site_type={st}"


def test_commercial_site_keeps_service_product_advice() -> None:
    prof = BusinessProfile(canonical_domain="shop.example", site_type="service_business")
    acts = _actions(prof, _readiness(structured_data=40.0, offer_clarity=35.0))
    rdy005 = next(a for a in acts if a.rule_id == "RDY-005")
    assert "Service/Product" in rdy005.recommendation
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
