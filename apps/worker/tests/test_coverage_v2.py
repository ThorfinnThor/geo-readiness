"""V2 coverage (requirements + topical alignment) tests (§48–50, §130)."""

from __future__ import annotations

from geo_worker.clusters import generate_clusters
from geo_worker.coverage import compute_coverage as coverage_v1
from geo_worker.crawler.types import RawResponse
from geo_worker.extraction.types import ExtractedPage, PageSignals
from geo_worker.methodology.v2.coverage import compute_coverage as coverage_v2
from geo_worker.pipeline import build_report, run_pipeline
from geo_worker.profile.types import BusinessProfile, EvidenceItem

PUBLIC = "93.184.216.34"


def _profile() -> BusinessProfile:
    return BusinessProfile(
        canonical_domain="s.example",
        brand_name="SolarCo",
        needs_confirmation=False,
        services=["photovoltaik"],
        locations=["Ulm"],
        languages=["de"],
        evidence=[
            EvidenceItem(
                field_name="service", value="photovoltaik", source_type="json_ld", confidence=0.9
            )
        ],
    )


def _pages() -> list[ExtractedPage]:
    return [
        ExtractedPage(
            final_url="https://s.example/",
            title="Photovoltaik Ulm",
            h1="Photovoltaik",
            page_type="service",
            visible_text="Wir installieren photovoltaik in ulm mit garantie. " * 10,
            signals=PageSignals(main_text="Wir installieren photovoltaik in ulm mit garantie."),
        ),
        ExtractedPage(
            final_url="https://s.example/ueber-uns",
            page_type="about",
            visible_text="ueber uns team",
            signals=PageSignals(main_text="ueber uns team"),
        ),
    ]


def test_v2_coverage_blends_requirements_and_topical() -> None:
    profile, pages = _profile(), _pages()
    clusters = generate_clusters(profile, "geo-readiness-v2", "quick")
    report = coverage_v2(clusters, pages, profile)

    for r in report.clusters:
        assert 0.0 <= r.requirements_score <= 100.0
        assert 0.0 <= r.topical_alignment_score <= 100.0
        assert r.coverage_score == round(
            0.70 * r.requirements_score + 0.30 * r.topical_alignment_score, 2
        )


def test_v2_requirements_equal_v1_coverage() -> None:
    profile, pages = _profile(), _pages()
    clusters = generate_clusters(profile, "geo-readiness-v2", "quick")
    v1 = {c.cluster_key: c.coverage_score for c in coverage_v1(clusters, pages, profile).clusters}
    for r in coverage_v2(clusters, pages, profile).clusters:
        assert r.requirements_score == v1[r.cluster_key]


def test_v2_pipeline_runs_and_reports() -> None:
    site = {
        "https://ex.example/": RawResponse(
            200,
            {"content-type": "text/html"},
            (
                "<html lang='de'><head><title>SolarCo — Photovoltaik Ulm</title>"
                '<meta property="og:site_name" content="SolarCo"/>'
                '<script type="application/ld+json">{"@type":"Organization","name":"SolarCo",'
                '"url":"https://ex.example/"}</script></head><body><h1>SolarCo</h1>'
                "<a href='/leistungen/photovoltaik'>Photovoltaik</a>"
                "<main><p>Wir installieren Photovoltaik in Ulm mit 25 Jahren Garantie.</p></main>"
                "</body></html>"
            ).encode(),
        ),
        "https://ex.example/leistungen/photovoltaik": RawResponse(
            200,
            {"content-type": "text/html"},
            b"<h1>Photovoltaik</h1><main><p>Photovoltaik in Ulm. Details und Fakten.</p></main>",
        ),
    }

    def fetch(url: str, _ip: str, _max: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    scan = run_pipeline(
        "https://ex.example/",
        scan_type="quick",
        methodology_version="geo-readiness-v2",
        fetch_fn=fetch,
        resolver=lambda _h: [PUBLIC],
    )
    report = build_report(scan)
    assert scan.methodology_version == "geo-readiness-v2"
    assert 0.0 <= report.overall_score <= 100.0
    assert len(report.components) == 7
