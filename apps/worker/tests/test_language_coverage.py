"""Per-language coverage on multilingual sites (§v2-plan 7.4)."""

from __future__ import annotations

from geo_worker.crawler.types import RawResponse
from geo_worker.pipeline import build_report, run_pipeline

PUBLIC = "93.184.216.34"
EN = "Acme installs rooftop solar panels for homes across the region with clear specs. " * 12
DE = "Acme installiert Solaranlagen für Häuser in der Region mit klaren Angaben. " * 12


def _page(html: str) -> RawResponse:
    return RawResponse(200, {"content-type": "text/html"}, html.encode("utf-8"))


def _fetch(site: dict):
    def fetch(url, _ip, _max):
        for key in (url, url.rstrip("/"), url + "/"):
            if key in site:
                return site[key]
        return RawResponse(404, {}, b"")

    return fetch


def _bilingual() -> dict:
    b = "https://ex.example"
    return {
        f"{b}/": _page(
            "<html lang='en'><head><title>Acme — Solar Installation</title>"
            "<meta property='og:site_name' content='Acme'/></head><body><h1>Acme</h1>"
            "<a href='/services/solar'>Solar</a><a href='/de/'>Deutsch</a>"
            f"<p>{EN}</p></body></html>"
        ),
        f"{b}/services/solar": _page(
            f"<html lang='en'><body><h1>Solar Installation</h1><p>{EN}</p></body></html>"
        ),
        f"{b}/de/": _page(
            "<html lang='de'><head><title>Acme — Solaranlagen</title></head><body><h1>Acme</h1>"
            f"<a href='/de/leistungen/solar'>Solar</a><p>{DE}</p></body></html>"
        ),
        f"{b}/de/leistungen/solar": _page(
            f"<html lang='de'><body><h1>Solaranlagen</h1><p>{DE}</p></body></html>"
        ),
    }


def _mono() -> dict:
    b = "https://ex.example"
    return {
        f"{b}/": _page(
            "<html lang='en'><head><title>Acme — Solar Installation</title>"
            "<meta property='og:site_name' content='Acme'/></head><body><h1>Acme</h1>"
            f"<a href='/services/solar'>Solar</a><p>{EN}</p></body></html>"
        ),
        f"{b}/services/solar": _page(
            f"<html lang='en'><body><h1>Solar Installation</h1><p>{EN}</p></body></html>"
        ),
    }


def _scan(site, version="geo-readiness-v2"):
    return run_pipeline(
        "https://ex.example/",
        methodology_version=version,
        fetch_fn=_fetch(site),
        resolver=lambda _h: [PUBLIC],
    )


def test_bilingual_site_reports_coverage_per_language() -> None:
    scan = _scan(_bilingual())
    langs = {lc.language for lc in scan.coverage.language_coverage}
    assert langs == {"en", "de"}
    for lc in scan.coverage.language_coverage:
        assert lc.pages > 0
    # And it surfaces on the report contract.
    rep = build_report(scan)
    assert {lc.language for lc in rep.language_coverage} == {"en", "de"}


def test_monolingual_site_has_no_language_breakdown() -> None:
    scan = _scan(_mono())
    assert scan.coverage.language_coverage == []
    assert build_report(scan).language_coverage == []


def test_v1_has_no_language_coverage() -> None:
    scan = _scan(_bilingual(), version="geo-readiness-v1")
    assert build_report(scan).language_coverage == []
