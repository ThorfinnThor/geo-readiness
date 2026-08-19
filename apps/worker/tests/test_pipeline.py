"""End-to-end pipeline + report assembly tests."""

from __future__ import annotations

import datetime as dt
import re

from geo_worker.crawler.types import RawResponse
from geo_worker.methodology import compute_methodology_hash
from geo_worker.pipeline import build_report, run_pipeline

PUBLIC = "93.184.216.34"
FIXED_AS_OF = dt.datetime(2026, 8, 19, 12, 0, tzinfo=dt.UTC)

ORG_JSONLD = (
    '<script type="application/ld+json">'
    '{"@context":"https://schema.org","@type":"Organization","name":"Acme Solar",'
    '"url":"https://ex.example/","legalName":"Acme Solar GmbH",'
    '"address":{"@type":"PostalAddress","addressLocality":"Ulm","addressCountry":"DE"}}'
    "</script>"
)
LONG = "Wir bieten Photovoltaik und Speicher mit vielen Details und Fakten. " * 12


def _site() -> dict[str, RawResponse]:
    def page(html: str) -> RawResponse:
        return RawResponse(200, {"content-type": "text/html"}, html.encode("utf-8"))

    return {
        "https://ex.example/": page(
            "<html lang='de'><head><title>Acme Solar</title>"
            '<meta property="og:site_name" content="Acme Solar"/>'
            f"{ORG_JSONLD}</head><body>"
            "<h1>Acme Solar</h1>"
            "<a href='/ueber-uns'>Über uns</a><a href='/leistungen/photovoltaik'>Photovoltaik</a>"
            "<a href='/kontakt'>Kontakt</a><a href='/impressum'>Impressum</a>"
            f"<p>{LONG}</p></body></html>"
        ),
        "https://ex.example/ueber-uns": page(f"<h1>Über uns</h1><p>{LONG}</p>"),
        "https://ex.example/leistungen/photovoltaik": page(
            f"<h1>Photovoltaik</h1><p>Photovoltaik in Ulm. {LONG}</p>"
        ),
        "https://ex.example/kontakt": page(f"<h1>Kontakt</h1><p>{LONG}</p>"),
        "https://ex.example/impressum": page(f"<h1>Impressum</h1><p>{LONG}</p>"),
    }


def _fetch(site):
    def fetch(url: str, _ip: str, _max: int) -> RawResponse:
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    return fetch


def _run(as_of: dt.datetime | None = None):
    site = _site()
    return run_pipeline(
        "https://ex.example/",
        scan_type="quick",
        fetch_fn=_fetch(site),
        resolver=lambda _h: [PUBLIC],
        as_of=as_of,
    )


def test_pipeline_produces_scored_report() -> None:
    scan = _run()
    report = build_report(scan)

    assert scan.pages_analyzed >= 4
    assert 0.0 <= report.overall_score <= 100.0
    assert len(report.components) == 7
    assert report.meta.canonical_domain == "ex.example"
    assert report.business_profile.brand_name is not None  # resolved from JSON-LD + site
    assert report.clusters, "clusters generated"
    assert "does not measure" in report.disclaimer.lower()


def test_report_is_deterministic() -> None:
    a = build_report(_run()).model_dump()
    b = build_report(_run()).model_dump()
    assert a == b


def test_as_of_and_methodology_hash_are_pinned_and_reproducible() -> None:
    # V2 §11: same crawl + same as_of + same methodology hash → same result.
    a = _run(as_of=FIXED_AS_OF)
    b = _run(as_of=FIXED_AS_OF)
    assert a.as_of == FIXED_AS_OF == b.as_of
    assert re.fullmatch(r"[0-9a-f]{64}", a.methodology_hash)
    assert a.methodology_hash == compute_methodology_hash("geo-readiness-v1", "v1")
    assert build_report(a).model_dump() == build_report(b).model_dump()


def test_as_of_defaults_to_now_when_absent() -> None:
    scan = _run()
    assert scan.as_of.tzinfo is not None  # timezone-aware
