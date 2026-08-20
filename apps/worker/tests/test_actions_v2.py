"""V2 action rule tests (§78–85, §133)."""

from __future__ import annotations

from geo_worker.clusters.types import GeneratedCluster
from geo_worker.coverage.types import ClusterCoverageResult, CoverageReport
from geo_worker.crawler.types import RawResponse
from geo_worker.methodology.v2.actions import compute_actions
from geo_worker.methodology.v2.sourceability import _WEIGHTS
from geo_worker.pipeline import run_pipeline
from geo_worker.profile.types import BusinessProfile
from geo_worker.scoring.types import ComponentScore, ReadinessResult, SubScore

PUBLIC = "93.184.216.34"
FORBIDDEN = ("rank", "ranking", "chatgpt", "visibility", "citation rate", "will cite")
_COMPONENTS = [
    "entity_clarity",
    "offer_clarity",
    "prompt_coverage",
    "sourceability",
    "structured_data",
    "evidence_trust",
    "technical_access",
]


def _readiness(src_strength: float, prompt_coverage: float) -> ReadinessResult:
    source = ComponentScore(
        name="sourceability",
        score=round(src_strength * 100, 2),
        subscores=[
            SubScore(name=k, weight=w, strength=src_strength, points=w * src_strength)
            for k, w in _WEIGHTS
        ],
    )
    components = [
        source
        if n == "sourceability"
        else ComponentScore(name=n, score=prompt_coverage if n == "prompt_coverage" else 60.0)
        for n in _COMPONENTS
    ]
    return ReadinessResult(
        methodology_version="geo-readiness-v2",
        overall_score=60.0,
        entity_clarity_score=60.0,
        offer_clarity_score=60.0,
        prompt_coverage_score=prompt_coverage,
        sourceability_score=source.score,
        structured_data_score=60.0,
        evidence_trust_score=60.0,
        technical_access_score=60.0,
        confidence_score=60.0,
        components=components,
    )


def test_weak_sourceability_triggers_004_family_and_drops_generic() -> None:
    site = {
        "https://ex.example/": RawResponse(
            200, {"content-type": "text/html"}, b"<html><body><p>hello world</p></body></html>"
        )
    }

    def fetch(url, _ip, _max):
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    scan = run_pipeline(
        "https://ex.example/",
        methodology_version="geo-readiness-v2",
        fetch_fn=fetch,
        resolver=lambda _h: [PUBLIC],
    )
    ids = {a.rule_id for a in scan.actions}
    assert {"RDY-004A", "RDY-004B", "RDY-004C", "RDY-004D"} <= ids
    assert "RDY-004" not in ids  # generic superseded
    for a in scan.actions:
        assert a.evidence and a.recommendation and a.expected_signal and a.how_to_verify


def test_topical_gap_triggers_rdy_011() -> None:
    cluster = GeneratedCluster(
        cluster_key="k",
        intent="local",
        service="Photovoltaik",
        location="Ulm",
        language="de",
        commercial_intent=0.8,
        relevance=0.9,
        priority=1.0,
        weight=1.0,
        template_version="1",
    )
    coverage = CoverageReport(
        prompt_coverage_score=55.0,
        clusters=[
            ClusterCoverageResult(
                cluster_key="k",
                coverage_score=58.0,
                confidence=0.8,
                requirements_score=70.0,
                topical_alignment_score=30.0,
                best_supporting_url="https://s.example/x",
            )
        ],
    )
    profile = BusinessProfile(
        canonical_domain="s.example", brand_name="SolarCo", needs_confirmation=False
    )
    actions = compute_actions(_readiness(0.8, 55.0), profile, coverage, [cluster], [])
    assert "RDY-011" in {a.rule_id for a in actions}


def test_actions_deterministic_and_no_visibility_claims() -> None:
    profile = BusinessProfile(canonical_domain="s.example", needs_confirmation=True)
    r = _readiness(0.2, 40.0)
    a = [
        x.model_dump()
        for x in compute_actions(
            r, profile, CoverageReport(prompt_coverage_score=40.0, clusters=[]), [], []
        )
    ]
    b = [
        x.model_dump()
        for x in compute_actions(
            r, profile, CoverageReport(prompt_coverage_score=40.0, clusters=[]), [], []
        )
    ]
    assert a == b
    for action in a:
        blob = " ".join(
            [
                action["title"],
                action["problem"],
                action["recommendation"],
                action["expected_signal"],
                action["how_to_verify"],
            ]
        ).lower()
        for word in FORBIDDEN:
            assert word not in blob
