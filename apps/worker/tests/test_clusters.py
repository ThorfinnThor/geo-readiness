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


def test_humanize_offering_display_only() -> None:
    # Presentation fixes for prompt text: acronyms re-cased, leading article
    # dropped. Lowercased generic offerings (the golden case) are untouched.
    from geo_worker.clusters.generator import _humanize_offering

    assert _humanize_offering("premium ai readiness audit") == "premium AI readiness audit"
    assert _humanize_offering("the ai search readiness audit") == "AI search readiness audit"
    assert _humanize_offering("seo audit") == "SEO audit"
    # No acronym, no article -> unchanged (keeps golden fixtures byte-identical).
    assert _humanize_offering("solar panels") == "solar panels"
    assert _humanize_offering("battery storage") == "battery storage"


def test_generated_prompts_recase_acronym_offering() -> None:
    profile = BusinessProfile(
        canonical_domain="findyouraiscore.com",
        brand_name="Find Your AI Score",
        services=["premium ai readiness audit"],
        evidence=[
            EvidenceItem(
                field_name="service",
                value="premium ai readiness audit",
                source_type="json_ld",
                confidence=0.9,
            )
        ],
    )
    clusters = generate_clusters(profile, MV, "quick", "en")
    texts = [p.prompt_text for c in clusters for p in c.prompts]
    assert texts, "expected at least one generated prompt"
    # The acronym is cased and no lowercased 'ai' token leaks into any prompt.
    assert any("AI readiness audit" in t for t in texts)
    assert not any(" ai " in f" {t.lower()} " and " AI " not in t for t in texts)


def test_topic_info_clusters_for_content_site() -> None:
    profile = BusinessProfile(
        canonical_domain="besttravelclimate.com",
        brand_name="Best Travel Climate",
        languages=["de"],
        topics=["Madeira im Oktober", "Beste Reisezeit für Kreta"],
    )
    clusters = generate_clusters(profile, "geo-readiness-v2", "quick", "de", "v2")
    topic_clusters = [c for c in clusters if c.intent == "topic_info"]
    assert topic_clusters, "expected topic_info clusters for a content site"
    texts = [p.prompt_text for c in topic_clusters for p in c.prompts]
    assert any("Madeira im Oktober" in t for t in texts)
    assert any("Was sollte man über" in t for t in texts)
    # Provider-shaped 'Anbieter für' wording must not wrap a content topic.
    assert not any("Anbieter für Madeira" in t for t in texts)
