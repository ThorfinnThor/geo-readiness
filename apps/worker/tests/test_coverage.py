"""Coverage engine tests (E09) — synthetic exact scores, no hallucinated evidence."""

from __future__ import annotations

from geo_worker.clusters.types import GeneratedCluster
from geo_worker.coverage import compute_coverage
from geo_worker.extraction.types import ExtractedPage
from geo_worker.profile.types import BusinessProfile


def _pages() -> list[ExtractedPage]:
    return [
        ExtractedPage(
            final_url="https://s.example/",
            title="Solar",
            h1="Solar",
            page_type="home",
            visible_text="Wir bieten photovoltaik in ulm an.",
        ),
        ExtractedPage(
            final_url="https://s.example/leistungen/photovoltaik",
            title="Photovoltaik",
            h1="Photovoltaik",
            page_type="service",
            visible_text="Photovoltaik " * 60,  # >=200 chars, dedicated depth
        ),
        ExtractedPage(
            final_url="https://s.example/ueber-uns",
            page_type="about",
            visible_text="Über uns: unser Team.",
        ),
    ]


def _profile() -> BusinessProfile:
    return BusinessProfile(canonical_domain="s.example", brand_name="SolarCo")


def _local_cluster(
    service: str, location: str, key: str = "k1", weight: float = 1.0
) -> GeneratedCluster:
    return GeneratedCluster(
        cluster_key=key,
        intent="local",
        service=service,
        location=location,
        language="de",
        commercial_intent=0.85,
        relevance=0.95,
        priority=weight,
        weight=weight,
        template_version="1",
    )


def test_exact_local_coverage() -> None:
    report = compute_coverage([_local_cluster("photovoltaik", "ulm")], _pages(), _profile())
    result = report.clusters[0]
    # 30(service 1.0) + 10(location 0.4) + 25(colocation 1.0) + 10(identity 1.0)
    # + 10(depth 1.0) = 85.0
    assert result.coverage_score == 85.0
    assert "service_presence" in result.matched_requirements
    assert "company_identity" in result.matched_requirements
    assert result.missing_requirements == []
    assert set(result.supporting_urls) == {
        "https://s.example/",
        "https://s.example/leistungen/photovoltaik",
    }


def test_absent_terms_score_low_without_hallucination() -> None:
    report = compute_coverage([_local_cluster("kryptomining", "berlin")], _pages(), _profile())
    result = report.clusters[0]
    # Only company_identity (1.0 × 10) scores.
    assert result.coverage_score == 10.0
    assert "service_presence" in result.missing_requirements
    assert "location_presence" in result.missing_requirements
    assert result.supporting_urls == []  # no evidence invented


def test_aggregate_is_weight_averaged() -> None:
    strong = _local_cluster("photovoltaik", "ulm", key="k1", weight=2.0)
    weak = _local_cluster("kryptomining", "berlin", key="k2", weight=1.0)
    report = compute_coverage([strong, weak], _pages(), _profile())
    # (85*2 + 10*1) / 3 = 60.0
    assert report.prompt_coverage_score == 60.0


def test_empty_clusters_score_zero() -> None:
    report = compute_coverage([], _pages(), _profile())
    assert report.prompt_coverage_score == 0.0
    assert report.clusters == []
