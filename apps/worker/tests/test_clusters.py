"""Deterministic cluster-generation tests (E08)."""

from __future__ import annotations

import hashlib

from geo_worker.clusters import generate_clusters
from geo_worker.clusters.generator import MAX_PROMPTS_PER_CLUSTER, QUICK_MAX_CLUSTERS
from geo_worker.profile.types import BusinessProfile, EvidenceItem

MV = "geo-readiness-v1"


def _profile() -> BusinessProfile:
    return BusinessProfile(
        canonical_domain="mueller-solar.example",
        brand_name="Müller Solar",
        brand_confidence=0.9,
        services=["photovoltaik", "speicher", "beratung"],
        products=["solarmodul"],
        locations=["Neu-Ulm", "Ulm"],
        languages=["de"],
        target_audiences=["gewerbe"],
        industries=["solar"],
        evidence=[
            EvidenceItem(
                field_name="service", value="photovoltaik", source_type="json_ld", confidence=0.9
            ),
            EvidenceItem(field_name="location", value="ulm", source_type="json_ld", confidence=0.9),
        ],
    )


def test_generation_is_deterministic() -> None:
    a = generate_clusters(_profile(), MV, "quick")
    b = generate_clusters(_profile(), MV, "quick")
    assert [c.model_dump() for c in a] == [c.model_dump() for c in b]


def test_quick_cap_and_prompt_limits() -> None:
    clusters = generate_clusters(_profile(), MV, "quick")
    assert len(clusters) <= QUICK_MAX_CLUSTERS
    # Sorted by priority descending.
    priorities = [c.priority for c in clusters]
    assert priorities == sorted(priorities, reverse=True)
    for c in clusters:
        assert 1 <= len(c.prompts) <= MAX_PROMPTS_PER_CLUSTER
        for p in c.prompts:
            assert "{" not in p.prompt_text and "}" not in p.prompt_text


def test_full_yields_at_least_as_many_as_quick() -> None:
    quick = generate_clusters(_profile(), MV, "quick")
    full = generate_clusters(_profile(), MV, "full")
    assert len(full) >= len(quick)
    assert len(full) <= 50


def test_cluster_key_is_stable_and_versioned() -> None:
    clusters = generate_clusters(_profile(), MV, "full")
    local = next(
        c
        for c in clusters
        if c.intent == "local" and c.service == "photovoltaik" and c.location == "Ulm"
    )
    expected = hashlib.sha256(
        "|".join([MV, "local", "", "photovoltaik", "", "ulm", "", "de"]).encode("utf-8")
    ).hexdigest()
    assert local.cluster_key == expected

    # Changing the methodology version changes every key.
    other = generate_clusters(_profile(), "geo-readiness-v2", "full")
    assert {c.cluster_key for c in clusters}.isdisjoint({c.cluster_key for c in other})


def test_intents_and_language() -> None:
    clusters = generate_clusters(_profile(), MV, "full")
    intents = {c.intent for c in clusters}
    assert "local" in intents  # locations present
    assert "branded" in intents  # brand known, reported separately
    assert "combined_service" in intents  # >= 2 services
    assert all(c.language == "de" for c in clusters)
    assert all(c.generation_method == "rule_v1" for c in clusters)


def test_priority_independent_of_call_context() -> None:
    # Priority derives only from the profile — no readiness/coverage input exists
    # in the signature, so repeated calls are identical (§14: never score-based).
    first = {c.cluster_key: c.priority for c in generate_clusters(_profile(), MV, "full")}
    second = {c.cluster_key: c.priority for c in generate_clusters(_profile(), MV, "full")}
    assert first == second
